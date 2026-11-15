"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FieldMap } from "@/components/field-map";
import { LoadingState } from "@/components/loading-state";
import { fieldApi, FieldApiError, positionState, type FieldSnapshot } from "@/lib/field";
import { acknowledgeReports, pendingReports, queueReport, readField, removeField, writeField, type QueuedReport } from "@/lib/field-store";
import { isRouteAnalysis } from "@/lib/route";
import type { LineString, FeatureCollection } from "geojson";

function time(value: string) { return new Date(value).toLocaleString(); }
export function FieldConsole({ token, owner, expedition, role }: {
  token: string; owner: string; expedition: string; role: "leader" | "geoscientist" | "guide_climber" | "viewer";
}) {
  const scope = `${owner}:${expedition}`;
  const [snapshot, setSnapshot] = useState<FieldSnapshot | null>(null);
  const [offline, setOffline] = useState(false);
  const [cached, setCached] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Saving changes…");
  const [fetching, setFetching] = useState(true);
  const [syncingReports, setSyncingReports] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState("status");
  const [decision, setDecision] = useState("hold");
  const [note, setNote] = useState("");
  const [planName, setPlanName] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [planRoute, setPlanRoute] = useState<LineString | null>(null);
  const [planHazards, setPlanHazards] = useState<FeatureCollection | undefined>();
  const [deviceName, setDeviceName] = useState("");
  const [imei, setImei] = useState("");
  const [member, setMember] = useState("");
  const [interval, setInterval] = useState("1800");
  const [now, setNow] = useState(0);
  const syncing = useRef(false);
  const alive = useRef(true);
  const snapshotRef = useRef<FieldSnapshot | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    let current = true;
    if ("serviceWorker" in navigator) void navigator.serviceWorker.ready.then(() => { if (current) setAppReady(true); });
    return () => { current = false; };
  }, []);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setFetching(true);
    try {
      const value = await fieldApi<FieldSnapshot>(token, expedition, "field");
      if (!alive.current || version !== requestVersion.current) return;
      snapshotRef.current = value; setSnapshot(value); setCached(false); setOffline(false); setError("");
      try { await writeField(scope, "snapshot", value); }
      catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : "Offline copy could not be saved."); }
    } catch (reason) {
      if (!alive.current || version !== requestVersion.current) return;
      if (reason instanceof FieldApiError && (reason.status === 401 || reason.status === 403)) {
        snapshotRef.current = null; setSnapshot(null); setCached(false);
        await removeField(scope, "snapshot").catch(() => undefined);
        setError("Access could not be verified. Sign in again or contact your expedition leader.");
        return;
      }
      const value = snapshotRef.current ?? await readField<FieldSnapshot>(scope, "snapshot").catch(() => null);
      if (!alive.current || version !== requestVersion.current) return;
      setSnapshot(value); snapshotRef.current = value; setCached(Boolean(value)); setOffline(!navigator.onLine);
      setError(value ? "Refresh failed. Showing the last downloaded data with original timestamps." : "No field data is available. Connect and download it before departure.");
    } finally { if (alive.current && version === requestVersion.current) setFetching(false); }
  }, [token, expedition, scope]);

  const sync = useCallback(async () => {
    if (syncing.current || !navigator.onLine || role === "viewer") return;
    syncing.current = true;
    try {
      const records = await pendingReports(scope);
      if (records.length && alive.current) setSyncingReports(true);
      for (let start = 0; start < records.length; start += 50) {
        const batch = records.slice(start, start + 50);
        const result = await fieldApi<{ accepted: string[] }>(token, expedition, "reports", { reports: batch });
        const sent = new Set(batch.map((report) => report.clientRecordId));
        await acknowledgeReports(scope, result.accepted.filter((id) => sent.has(id)));
      }
      if (alive.current) { setQueue(await pendingReports(scope)); if (records.length) setMessage("Field reports synced with original timestamps."); }
    } catch (reason) {
      if (alive.current) setError(`${reason instanceof Error ? reason.message : "Sync failed."} Reports remain on this device for retry.`);
    } finally { syncing.current = false; if (alive.current) setSyncingReports(false); }
  }, [scope, token, expedition, role]);

  useEffect(() => {
    alive.current = true;
    const update = () => { if (!alive.current) return; setOffline(!navigator.onLine); setNow(Date.now()); void refresh().then(sync); };
    void Promise.resolve().then(() => { update(); return pendingReports(scope); }).then((records) => { if (alive.current) setQueue(records); }).catch(() => { if (alive.current) setError("Offline storage is unavailable."); });
    const timer = window.setInterval(() => { if (!document.hidden) update(); }, 30_000);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { alive.current = false; requestVersion.current += 1; window.clearInterval(timer); window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, [scope, refresh, sync]);

  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    setBusyLabel("Saving field report…");
    try {
      await queueReport(scope, { clientRecordId: crypto.randomUUID(), recordedAt: new Date().toISOString(), kind, text });
      setQueue(await pendingReports(scope)); setText(""); setMessage("Report saved on this device. It remains queued until the server confirms receipt.");
      await sync();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Report could not be saved. Keep your text and retry."); }
    finally { setBusy(false); }
  }
  async function action(path: string, body: unknown, success: string) {
    setBusy(true); setError(""); setMessage("");
    setBusyLabel(path === "plans" ? "Publishing plan…" : path === "decisions" ? "Recording leader decision…" : "Registering device…");
    try { await fieldApi(token, expedition, path, body); setMessage(success); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed. Your input has been preserved."); }
    finally { setBusy(false); }
  }
  const latest = [...new Map((snapshot?.positions ?? []).slice().reverse().map((fix) => [fix.user_id, fix])).values()];

  return <section className="operations__field" aria-labelledby="field-heading">
    <div className="operations__section-head"><div><h2 id="field-heading">Field operations</h2>
      <p role="status">{!snapshot && fetching ? "Connecting to your expedition…" : offline ? "Offline" : cached ? "Refresh unavailable" : snapshot ? "Connected" : "Connection unavailable"}{snapshot ? ` · Updated ${time(snapshot.fetchedAt)}` : ""}{queue.length ? ` · ${queue.length} reports queued` : ""}</p></div>
      <button type="button" disabled={busy || offline || fetching || syncingReports} onClick={() => void refresh().then(sync)}>{fetching ? "Refreshing…" : syncingReports ? "Syncing reports…" : "Refresh and sync"}</button></div>
    <details className="operations__connection"><summary>{appReady ? "Offline app ready" : "Offline app not ready"}</summary>
      <p className="operations__footnote">{appReady ? "The application is saved on this device." : "Keep the page connected until the application finishes saving for offline use."} Download a plan and map before departure. Sign-out clears downloaded data; unsent reports stay on this private device for your next sign-in.</p>
    </details>
    {error ? <p className="operations__error" role="alert">{error}</p> : null}
    {message ? <p className="operations__success" role="status">{message}</p> : null}
    {busy || syncingReports ? <LoadingState label={syncingReports ? "Syncing queued reports…" : busyLabel} /> : null}
    {!snapshot ? fetching ? <LoadingState label="Loading field operations…" /> : <div className="operations__empty">Field data could not be loaded. Reconnect and use “Refresh and sync” to try again.</div> : <div className="field-grid">
    <FieldMap snapshot={snapshot} offline={offline || cached} />
    <section className="operations__history field-team"><h3>Latest team positions</h3>
      {latest.length ? <ul className="field-positions">{latest.map((fix) => <li key={fix.id}>
        <details><summary><span><strong>{fix.member_name} · {positionState(fix, offline || cached, now)}</strong>
        <small>{Math.max(0, Math.floor((now - Date.parse(fix.recorded_at)) / 60000))} min ago · {fix.accuracy_m === null ? "Accuracy unknown" : `±${fix.accuracy_m} m`} · {fix.source === "rockblock-sbd" ? "Iridium SBD" : fix.source}</small></span></summary>
        <p className="operations__mono">{fix.latitude.toFixed(5)}, {fix.longitude.toFixed(5)} · {fix.altitude_m === null ? "Altitude unknown" : `${fix.altitude_m} m`}</p>
        <small>GPS fix {time(fix.recorded_at)} · Received {time(fix.received_at)}{fix.device_name ? ` · ${fix.device_name}` : ""}</small>
        </details>
      </li>)}</ul> : <p>No GPS fixes received for this view. A configured device and verified transmission are required.</p>}
    </section>
    <section className="operations__history"><h3>Published plan</h3>
      {snapshot?.plan ? <><p><strong>{snapshot.plan.snapshot.name} · Version {snapshot.plan.version}</strong></p>
        <p>Published {time(snapshot.plan.published_at)} · Immutable reference</p>
        <details><summary>Route, hazards and provenance</summary><pre>{JSON.stringify(snapshot.plan, null, 2)}</pre></details></> : <p>No published plan has been assigned.</p>}
      {role === "leader" ? <details className="operations__disclosure"><summary>Publish a new plan</summary><form onSubmit={(event) => {
        event.preventDefault(); if (!planRoute) { setError("Import a GPX route before publishing."); return; }
        void action("plans", { snapshot: { name: planName, route: planRoute, notes: planNotes, ...(planHazards ? { hazards: planHazards } : {}) } }, "Plan published as a new immutable version.");
      }}>
        <label>Plan name<input required maxLength={120} value={planName} onChange={(event) => setPlanName(event.target.value)} /></label>
        <label>Route (.gpx)<input type="file" accept=".gpx" disabled={busy || offline} onChange={(event) => {
          const selected = event.target.files?.[0]; if (!selected) return;
          setBusy(true); setBusyLabel("Reading GPX route…"); setError(""); setPlanRoute(null);
          void (async () => {
            if (selected.size > 5000000) throw new Error("Choose a GPX file smaller than 5 MB.");
            const response = await fetch(`/api/routes/analyze?name=${encodeURIComponent(selected.name.replace(/\.gpx$/iu, ""))}`, {
              method: "POST", headers: { "content-type": "application/gpx+xml" }, body: await selected.text(),
            });
            const route: unknown = await response.json();
            if (!response.ok || !isRouteAnalysis(route)) throw new Error("The GPX route could not be read. Check its coordinates and try again.");
            if (route.points.length > 500) throw new Error("This route exceeds the 500-point published-plan limit. Export a smaller GPX before publishing.");
            setPlanRoute({ type: "LineString", coordinates: route.points.map((point) => point.elevationM === null ? [point.longitude, point.latitude] : [point.longitude, point.latitude, point.elevationM]) });
            setPlanName((value) => value || route.name.slice(0, 120));
          })().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "GPX import failed.")).finally(() => setBusy(false));
        }} /></label>
        {planRoute ? <p role="status">Route imported · {planRoute.coordinates.length} points · longitude / latitude order</p> : null}
        <label>Optional hazard polygons (.geojson)<input type="file" accept=".geojson,.json" onChange={(event) => {
          const selected = event.target.files?.[0]; if (!selected) return;
          setPlanHazards(undefined); setError("");
          void selected.text().then((text) => {
            if (selected.size > 12000) throw new Error("Choose hazard polygons smaller than 12 kB.");
            const value: unknown = JSON.parse(text);
            if (!value || typeof value !== "object" || !("type" in value) || value.type !== "FeatureCollection") throw new Error("Choose a GeoJSON FeatureCollection of polygons.");
            setPlanHazards(value as FeatureCollection);
          }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Hazard file could not be read."));
        }} /></label>
        <label>Source, assumptions and field notes<textarea rows={3} maxLength={4000} value={planNotes} onChange={(event) => setPlanNotes(event.target.value)} /></label>
        <p className="operations__footnote">Publishing creates a permanent version and makes it the expedition’s active reference. Review the imported route and hazard evidence first.</p>
        <button type="submit" disabled={busy || offline || !planRoute}>Publish immutable plan</button>
      </form></details> : null}
    </section>
    <section className="operations__history"><h3>Leader decision</h3>
      {snapshot?.decision ? <><p><strong>{snapshot.decision.decision.replaceAll("_", " ").toUpperCase()}</strong> · {snapshot.decision.leader_name} · {time(snapshot.decision.created_at)}</p><p>{snapshot.decision.note}</p></> : <p>No leader decision recorded.</p>}
      <p className="operations__footnote">This records a named human’s decision. Catalyst does not declare a route safe or unsafe.</p>
      {role === "leader" ? <details className="operations__disclosure"><summary>Record a decision</summary><form onSubmit={(event) => { event.preventDefault(); void action("decisions", { decision, note }, "Leader decision recorded in the immutable audit history."); }}>
        <label>Decision<select value={decision} onChange={(event) => setDecision(event.target.value)}><option value="hold">Hold</option><option value="go">Go</option><option value="no_go">No-go</option></select></label>
        <label>Rationale<textarea required maxLength={4000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <button type="submit" disabled={busy || offline}>Record leader decision</button>
      </form></details> : null}
    </section>
    {role !== "viewer" ? <section className="operations__history field-reports"><h3>Field reports</h3>
      <details className="operations__disclosure"><summary>Send a field report</summary><form onSubmit={(event) => void report(event)}><label>Report type<select value={kind} onChange={(event) => setKind(event.target.value)}>{["status", "incident", "hazard", "medical", "logistics", "other"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Observation<textarea required maxLength={4000} rows={3} value={text} onChange={(event) => setText(event.target.value)} /></label>
        <button type="submit" disabled={busy}>Save field report</button></form></details>
      {queue.length ? <details open><summary>{queue.length} reports queued on this device</summary><ul>{queue.map((item) => <li key={item.clientRecordId}><strong>{item.kind}</strong> · {time(item.recordedAt)}<p>{item.text}</p></li>)}</ul></details> : null}
      {snapshot?.reports.length ? <details><summary>Received field reports</summary><ul>{snapshot.reports.map((item) => <li key={item.id}><strong>{item.kind} · {item.author_name}</strong> · {time(item.recorded_at)}<p>{item.payload.text}</p></li>)}</ul></details> : null}
    </section> : null}
    </div>}
    {role === "leader" && snapshot ? <details className="operations__history operations__disclosure field-device"><summary>Tracking device setup</summary>
      <p>Register a device to a field member using their account ID. A configured provider connection is required before positions can arrive.</p>
      <form onSubmit={(event) => { event.preventDefault(); void action("devices", { userId: member, imei, name: deviceName, intervalSeconds: Number(interval) }, "Device registered and audited."); }}>
        <label>Device name<input required maxLength={80} value={deviceName} onChange={(event) => setDeviceName(event.target.value)} /></label>
        <label>Member account ID<input required value={member} onChange={(event) => setMember(event.target.value)} /></label>
        <label>IMEI<input required inputMode="numeric" pattern="[0-9]{15}" value={imei} onChange={(event) => setImei(event.target.value)} /></label>
        <label>Expected interval in seconds<input required type="number" min={60} max={86400} value={interval} onChange={(event) => setInterval(event.target.value)} /></label>
        <button type="submit" disabled={busy || offline}>Register device</button>
      </form>
    </details> : null}
  </section>;
}
