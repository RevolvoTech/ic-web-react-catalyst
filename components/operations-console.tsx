"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FieldConsole } from "@/components/field-console";
import { LoadingState } from "@/components/loading-state";
import { clearFieldOwner, readField, writeField } from "@/lib/field-store";

type Role = "leader" | "geoscientist" | "guide_climber" | "viewer";
type Expedition = { id: string; name: string; role: Role; status: string };
type Alert = {
  id: string; trigger_rule: string; score: number | null; generated_at: string;
  approval_status: "pending" | "approved" | "suppressed";
  approved_by?: string | null; approved_at?: string | null; approval_note?: string | null;
  approved_by_name?: string | null;
  original_draft?: string; final_text?: string | null; delivered_to?: string[];
  delivered_at?: string | null; inputs?: Record<string, unknown>;
};
type AuditEvent = {
  id: string; action: string; actor_id: string | null; actor_name?: string | null; resource_id: string | null;
  occurred_at: string; details: Record<string, unknown>;
  event_sequence: string;
};
type ApiEnvelope<T> = T & { error?: { message?: string } };
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const authKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const authHolder = globalThis as typeof globalThis & { __catalystAuthClient?: SupabaseClient };

function getAuthClient(): SupabaseClient | null {
  if (!authUrl || !authKey) return null;
  authHolder.__catalystAuthClient ??= createClient(authUrl, authKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  return authHolder.__catalystAuthClient;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid timestamp" : new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

async function api<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/operations/${path}`, {
    ...init, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(10_000),
    headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
  });
  const result = await response.json() as ApiEnvelope<T>;
  if (!response.ok) throw new ApiError(response.status, result.error?.message ?? `Request failed (${response.status}).`);
  return result;
}

function Status({ value }: { value: Alert["approval_status"] }) {
  return <span className={`operations-status operations-status--${value}`}>{value === "pending" ? "Pending review" : value}</span>;
}

function ReviewControls({ alert, busy, onAction }: {
  alert: Alert; busy: boolean;
  onAction: (action: "approve" | "modify" | "suppress", finalText: string, note: string) => void;
}) {
  const [finalText, setFinalText] = useState(alert.original_draft ?? "");
  const [note, setNote] = useState("");
  return <div className="operations__review">
    <h4>Human decision</h4><p>Review the rule and source values before delivery. Suppression requires a reason.</p>
    <label>Final wording<textarea rows={4} maxLength={2000} value={finalText} onChange={(event) => setFinalText(event.target.value)} /></label>
    <label>Review note<textarea rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <div className="operations__actions">
      <button className="operations__primary" type="button" disabled={busy || finalText.trim() !== alert.original_draft} onClick={() => onAction("approve", finalText, note)}>Approve as written</button>
      <button type="button" disabled={busy || !finalText.trim() || finalText.trim() === alert.original_draft} onClick={() => onAction("modify", finalText, note)}>Approve modified</button>
      <button className="operations__suppress" type="button" disabled={busy || !note.trim()} onClick={() => onAction("suppress", finalText, note)}>Suppress with reason</button>
    </div>
  </div>;
}

export function OperationsConsole() {
  const supabase = getAuthClient();
  const [token, setToken] = useState<string | null>(null);
  const [owner, setOwner] = useState("");
  const [accessCached, setAccessCached] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(Boolean(authUrl && authKey));
  const [expeditionsLoading, setExpeditionsLoading] = useState(Boolean(authUrl && authKey));
  const [expeditionsError, setExpeditionsError] = useState("");
  const [accessReload, setAccessReload] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Saving changes…");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [expeditionId, setExpeditionId] = useState("");
  const [tab, setTab] = useState<"field" | "alerts" | "history" | "members">("field");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("all");
  const [eventType, setEventType] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [appliedActor, setAppliedActor] = useState("");
  const [newRule, setNewRule] = useState("");
  const [newScore, setNewScore] = useState("");
  const [newDraft, setNewDraft] = useState("");
  const [newSource, setNewSource] = useState("{}");
  const [memberId, setMemberId] = useState("");
  const [memberRole, setMemberRole] = useState<Role>("guide_climber");
  const requestVersion = useRef(0);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setOwner(data.session?.user.id ?? "");
      setExpeditionsLoading(Boolean(data.session));
      setLoading(false);
    }).catch(() => {
      setLoading(false); setError("Your session could not be restored. Reconnect and sign in again.");
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        requestVersion.current += 1;
        setError(""); setMessage(""); setAlerts([]); setEvents([]); setSelectedId("");
        setExpeditions([]); setTab("field");
        setExpeditionsError(""); setExpeditionsLoading(Boolean(session)); setDataLoading(true);
        if (event === "SIGNED_OUT") setEmail("");
      }
      setToken(session?.access_token ?? null);
      setOwner(session?.user.id ?? "");
    });
    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!token || !owner) return;
    let current = true;
    void Promise.resolve().then(() => {
      if (!current) return null;
      setExpeditionsLoading(true); setExpeditionsError("");
      return api<{ expeditions: Expedition[] }>(token, "expeditions");
    })
      .then((data) => {
        if (!current || !data) return;
        setExpeditions(data.expeditions);
        setAccessCached(false);
        void writeField(`${owner}:access`, "expeditions", data.expeditions).catch(() => undefined);
        setExpeditionId((previous) => data.expeditions.some((item) => item.id === previous)
          ? previous : (data.expeditions[0]?.id ?? ""));
      })
      .catch(async (reason: unknown) => {
        if (!current) return;
        if (!(reason instanceof ApiError) || reason.status >= 500) {
          const stored = await readField<Expedition[]>(`${owner}:access`, "expeditions").catch(() => null);
          if (!current) return;
          if (stored?.length) { setExpeditions(stored); setExpeditionId(stored[0].id); setAccessCached(true); return; }
        }
        setExpeditionsError(reason instanceof Error ? reason.message : "Unable to load expeditions.");
      })
      .finally(() => { if (current) setExpeditionsLoading(false); });
    return () => { current = false; };
  }, [token, owner, accessReload]);

  const expedition = expeditions.find((item) => item.id === expeditionId);
  const canReview = expedition?.role === "leader" || expedition?.role === "geoscientist";
  const canLead = expedition?.role === "leader";
  const selected = alerts.find((item) => item.id === selectedId) ?? null;

  const refresh = useCallback(async () => {
    if (!token || !expeditionId) return;
    if (expedition?.role === "viewer") return;
    const version = ++requestVersion.current;
    setDataLoading(true);
    setDataError("");
    setError("");
    const base = `expeditions/${expeditionId}`;
    try {
      const alertResult = await api<{ alerts: Alert[] }>(token, `${base}/alerts`);
      if (version !== requestVersion.current) return;
      setAlerts(alertResult.alerts);
      setSelectedId((previous) => alertResult.alerts.some((item) => item.id === previous)
        ? previous : (alertResult.alerts[0]?.id ?? ""));
      if (canReview) {
        const query = new URLSearchParams();
        if (eventType) query.set("eventType", eventType);
        if (appliedActor) query.set("actor", appliedActor);
        const result = await api<{ events: AuditEvent[] }>(token, `${base}/audit?${query}`);
        if (version !== requestVersion.current) return;
        setEvents(result.events);
      } else setEvents([]);
    } catch (reason) {
      if (version === requestVersion.current) setDataError("Some operational data could not be loaded. Refresh this view to try again.");
      throw reason;
    } finally { if (version === requestVersion.current) setDataLoading(false); }
  }, [token, expeditionId, expedition?.role, canReview, eventType, appliedActor]);

  useEffect(() => {
    if (!expedition) return;
    let current = true;
    void Promise.resolve().then(() => current ? refresh() : undefined).catch((reason: unknown) => {
      if (current) setError(reason instanceof Error ? reason.message : "Unable to load operations.");
    });
    return () => { current = false; requestVersion.current += 1; };
  }, [expedition, refresh]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError("");
    setBusyLabel("Signing in…");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
    } catch { setError("Sign-in could not be completed. Check your connection and try again."); }
    finally { setPassword(""); setBusy(false); }
  }

  async function act(action: "approve" | "modify" | "suppress", finalText: string, note: string) {
    if (!token || !selected) return;
    setBusy(true); setError(""); setMessage("");
    setBusyLabel("Saving alert review…");
    try {
      await api(token, `expeditions/${expeditionId}/alerts/${selected.id}/review`, {
        method: "POST", body: JSON.stringify({ action, finalText, note }),
      });
      setMessage(action === "suppress" ? "Alert suppressed and recorded." : "Alert approved; in-app recipients recorded.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Review failed."); }
    finally { setBusy(false); }
  }

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    let sourceData: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(newSource);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
      sourceData = { ...parsed, provenance: "manual-entry" };
    } catch { setError("Source values must be a JSON object."); return; }
    setBusy(true); setError(""); setMessage("");
    setBusyLabel("Creating review draft…");
    try {
      await api(token, `expeditions/${expeditionId}/alerts`, {
        method: "POST", body: JSON.stringify({ triggerRule: newRule, score: Number(newScore), originalDraft: newDraft, sourceData }),
      });
      setNewRule(""); setNewScore(""); setNewDraft(""); setNewSource("{}");
      setMessage("Manual alert draft created. It is pending review and has not been delivered.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Draft creation failed."); }
    finally { setBusy(false); }
  }

  async function assignRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true); setError(""); setMessage("");
    setBusyLabel("Saving expedition role…");
    try {
      await api(token, `expeditions/${expeditionId}/members/${memberId}/role`, {
        method: "PUT", body: JSON.stringify({ role: memberRole }),
      });
      setMessage("Expedition role saved and recorded in the audit history.");
      setMemberId("");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Role assignment failed."); }
    finally { setBusy(false); }
  }

  const visibleAlerts = alerts.filter((item) => filter === "all" || item.approval_status === filter);

  async function exportAudit() {
    if (!token) return;
    setBusy(true); setError("");
    setBusyLabel("Preparing the complete audit export…");
    try {
      const all: AuditEvent[] = [];
      let before = "";
      for (;;) {
        const result = await api<{ events: AuditEvent[] }>(token, `expeditions/${expeditionId}/audit${before ? `?before=${before}` : ""}`);
        all.push(...result.events);
        if (result.events.length < 200) break;
        const cursor = result.events.at(-1)?.event_sequence;
        if (!cursor || cursor === before) throw new Error("Audit export could not advance. No partial export was downloaded.");
        before = cursor;
      }
      const blob = new Blob([JSON.stringify({ expedition_id: expeditionId, exported_at: new Date().toISOString(), events: all }, null, 2)], { type: "application/json" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `catalyst-audit-${expeditionId}.json`; link.click(); URL.revokeObjectURL(link.href);
      setMessage(`Exported ${all.length} audit events across all event types.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Audit export failed."); }
    finally { setBusy(false); }
  }

  return <div className="operations shell">
    <div className="operations__heading">
      <div><p className="operations__eyebrow">Catalyst / Command</p><h1>Expedition command</h1>
        <p>Track your team, inspect the published plan and record decisions. Alert delivery requires approval by a leader or geoscientist.</p></div>
      {token && supabase ? <button type="button" disabled={busy} className="operations__quiet" onClick={() => {
        setBusy(true); setBusyLabel("Signing out…");
        void clearFieldOwner(owner).then(() => supabase.auth.signOut()).then(({ error: signOutError }) => {
          if (signOutError) setError(signOutError.message);
        }).catch(() => setError("Sign-out could not be completed. Clear this site’s storage before sharing the device.")).finally(() => setBusy(false));
      }}>{busy && busyLabel === "Signing out…" ? "Signing out…" : "Sign out"}</button> : null}
    </div>
    {error ? <p className="operations__error" role="alert">{error}</p> : null}
    {message ? <p className="operations__success" role="status">{message}</p> : null}
    {busy && token ? <LoadingState label={busyLabel} /> : null}
    {accessCached ? <p className="operations__empty" role="status">Offline access uses your last verified expedition membership. Reconnect to confirm current permissions.</p> : null}
    {!supabase ? <div className="operations__empty">Command access is not configured. Contact your Catalyst administrator.</div>
      : loading ? <LoadingState label="Checking session…" />
      : !token ? <form className="operations__signin" onSubmit={(event) => void signIn(event)}>
        <h2>Sign in to operations</h2>
        <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="operations__primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      : expeditionsLoading && expeditions.length === 0 ? <LoadingState label="Loading your expeditions…" />
      : expeditionsError ? <div className="operations__empty"><p role="alert">{expeditionsError}</p><button type="button" onClick={() => { setExpeditionsLoading(true); setExpeditionsError(""); setAccessReload((value) => value + 1); }}>Try again</button></div>
      : expeditions.length === 0 ? <div className="operations__empty">This account has no expedition role. A leader must assign one before operations are available.</div>
      : <div className="operations__workspace">
        <div className="operations__toolbar">
          <label>Expedition<select disabled={busy || expeditionsLoading} value={expeditionId} onChange={(event) => { requestVersion.current += 1; setDataLoading(true); setExpeditionId(event.target.value); setSelectedId(""); setAlerts([]); setEvents([]); setTab("field"); }}>
            {expeditions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <span className="operations__role">Role: {expedition?.role.replace("_", " / ")}</span>
          {tab === "alerts" || tab === "history" ? <button type="button" className="operations__quiet" onClick={() => void refresh().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Refresh failed."))} disabled={busy || dataLoading}>{tab === "history" ? dataLoading ? "Refreshing history…" : "Refresh history" : dataLoading ? "Refreshing alerts…" : "Refresh alerts"}</button> : null}
        </div>
        <nav className="operations__tabs" aria-label="Operations sections">
          <button type="button" aria-current={tab === "field" ? "page" : undefined} onClick={() => setTab("field")}>Field operations</button>
          {expedition?.role !== "viewer" ? <button type="button" aria-current={tab === "alerts" ? "page" : undefined} onClick={() => setTab("alerts")}>Alerts</button> : null}
          {canReview ? <button type="button" aria-current={tab === "history" ? "page" : undefined} onClick={() => setTab("history")}>Audit history</button> : null}
          {canLead ? <button type="button" aria-current={tab === "members" ? "page" : undefined} onClick={() => setTab("members")}>Roles</button> : null}
        </nav>
        {tab === "field" && owner && expedition ? <FieldConsole key={`${owner}:${expeditionId}`} token={token} owner={owner} expedition={expeditionId} role={expedition.role} /> : null}
        {tab === "alerts" && expedition?.role === "viewer" ? <div className="operations__empty">Viewer access is read-only. Alert review and audit history are restricted to expedition reviewers.</div> : null}
        {tab === "alerts" && expedition?.role !== "viewer" ? <div className="operations__grid">
          <section className="operations__queue" aria-labelledby="alerts-heading">
            <div className="operations__section-head"><h2 id="alerts-heading">Alert queue</h2><label>Show
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All</option>{canReview ? <option value="pending">Pending</option> : null}
                <option value="approved">Approved</option>{canReview ? <option value="suppressed">Suppressed</option> : null}
              </select></label></div>
            {dataLoading && alerts.length === 0 ? <LoadingState label="Loading alerts…" /> : dataError && alerts.length === 0 ? <p className="operations__empty">{dataError}</p> : visibleAlerts.length ? <ul>{visibleAlerts.map((alert) => <li key={alert.id}>
              <button type="button" className={selectedId === alert.id ? "is-selected" : ""}
                onClick={() => setSelectedId(alert.id)} aria-pressed={selectedId === alert.id}>
                <span><strong>{alert.trigger_rule}</strong><Status value={alert.approval_status} /></span>
                <small>{formatTime(alert.generated_at)}{alert.score !== null ? ` · Score ${alert.score}/100` : ""}</small>
              </button></li>)}</ul> : <p className="operations__empty">No alerts in this view.</p>}
          </section>
          <section className="operations__detail" aria-labelledby="alert-detail-heading">
            <h2 id="alert-detail-heading">Alert detail</h2>
            {!selected ? dataLoading ? <LoadingState label="Loading alert details…" /> : <p className="operations__empty">{dataError || "Select an alert to inspect its rule and source values."}</p> : <>
              <Status value={selected.approval_status} />
              <h3>{selected.trigger_rule}</h3>
              <dl><div><dt>Generated</dt><dd>{formatTime(selected.generated_at)}</dd></div>
                <div><dt>Score</dt><dd>{selected.score === null ? "Not recorded" : `${selected.score}/100`}</dd></div>
                {selected.approved_by ? <div><dt>Reviewed by</dt><dd>{selected.approved_by_name ?? "Expedition reviewer"}</dd></div> : null}
                {selected.approved_at ? <div><dt>Reviewed</dt><dd>{formatTime(selected.approved_at)}</dd></div> : null}
                {selected.delivered_at ? <div><dt>In-app delivery</dt><dd>{formatTime(selected.delivered_at)}</dd></div> : null}</dl>
              {selected.original_draft ? <div className="operations__copy"><h4>Original draft</h4><p>{selected.original_draft}</p></div> : null}
              {selected.final_text ? <div className="operations__copy"><h4>Approved wording</h4><p>{selected.final_text}</p></div> : null}
              {selected.approval_note ? <div className="operations__copy"><h4>Review note</h4><p>{selected.approval_note}</p></div> : null}
              {selected.inputs ? <details className="operations__payload"><summary>Source values and provenance</summary><pre>{JSON.stringify(selected.inputs, null, 2)}</pre></details> : null}
              {canReview && selected.approval_status === "pending" ? <ReviewControls key={selected.id} alert={selected} busy={busy} onAction={(action, text, reviewNote) => void act(action, text, reviewNote)} /> : null}
            </>}
          </section>
          {canReview ? <section className="operations__create" aria-labelledby="draft-heading">
            <details className="operations__disclosure"><summary><h2 id="draft-heading">Create a manual review draft</h2></summary>
            <p>For manually supplied evidence only. This does not verify sensor data or deliver an alert.</p>
            <form onSubmit={(event) => void createDraft(event)}>
              <label>Trigger rule<input required maxLength={120} value={newRule} onChange={(event) => setNewRule(event.target.value)} placeholder="Wind threshold exceeded" /></label>
              <label>Hazard score, 0–100<input type="number" required min={0} max={100} value={newScore} onChange={(event) => setNewScore(event.target.value)} /></label>
              <label>Draft message<textarea required rows={3} maxLength={2000} value={newDraft} onChange={(event) => setNewDraft(event.target.value)} /></label>
              <label>Source values (JSON object)<textarea required rows={3} value={newSource} onChange={(event) => setNewSource(event.target.value)} /></label>
              <button type="submit" disabled={busy}>Create pending draft</button>
            </form></details>
          </section> : null}
        </div> : null}
        {tab === "history" && canReview ? <section className="operations__history" aria-labelledby="history-heading">
          <div className="operations__section-head"><h2 id="history-heading">Audit history</h2>
            <button type="button" disabled={busy} onClick={() => void exportAudit()}>Export full audit JSON</button></div>
          <form className="operations__filters" onSubmit={(event) => { event.preventDefault(); setAppliedActor(actorFilter.trim()); }}><label>Event type<select value={eventType} onChange={(event) => setEventType(event.target.value)}>
            <option value="">All events</option><option value="alert_generated">Alert generated</option>
            <option value="alert_reviewed">Alert reviewed</option><option value="alert_delivered">Alert delivered</option>
            <option value="plan_published">Plan published</option><option value="position_received">Position received</option>
            <option value="go_nogo_decision">Leader decision</option><option value="hazard_zone_changed">Hazard zone changed</option>
            <option value="field_report_received">Field report received</option><option value="tracking_device_registered">Tracking device registered</option>
            <option value="role_granted">Role granted</option></select></label>
            <label>Actor<select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)}><option value="">All actors</option>
              {[...new Map(events.filter((event) => event.actor_id).map((event) => [event.actor_id, event.actor_name ?? "Expedition member"])).entries()].map(([id, name]) => <option key={id} value={id ?? ""}>{name}</option>)}
            </select></label><button type="submit">Apply filter</button></form>
          {dataLoading && events.length === 0 ? <LoadingState label="Loading audit history…" /> : dataError && events.length === 0 ? <p className="operations__empty">{dataError}</p> : events.length ? <ol>{events.map((event) => <li key={event.id}><details>
            <summary><span><strong>{event.action.replaceAll("_", " ")}</strong><small>{event.actor_name ?? "System"}</small></span><time>{formatTime(event.occurred_at)}</time></summary>
            <pre>{JSON.stringify(event.details, null, 2)}</pre>
          </details></li>)}</ol> : <p className="operations__empty">No audit events match these filters.</p>}
          <p className="operations__footnote">Showing the 200 most recent matching events. Full export includes every recorded event, regardless of these filters.</p>
        </section> : null}
        {tab === "members" && canLead ? <section className="operations__members" aria-labelledby="members-heading">
          <h2 id="members-heading">Assign expedition role</h2><p>Enter the ID of an existing Catalyst account. Every change is recorded in the audit history.</p>
          <form onSubmit={(event) => void assignRole(event)}><label>User ID<input required value={memberId} onChange={(event) => setMemberId(event.target.value)} placeholder="Account UUID" /></label>
            <label>Role<select value={memberRole} onChange={(event) => setMemberRole(event.target.value as Role)}>
              <option value="leader">Leader</option><option value="geoscientist">Geoscientist</option>
              <option value="guide_climber">Guide / climber</option><option value="viewer">Viewer</option>
            </select></label><button className="operations__primary" type="submit" disabled={busy}>Save role</button></form>
        </section> : null}
      </div>}
  </div>;
}
