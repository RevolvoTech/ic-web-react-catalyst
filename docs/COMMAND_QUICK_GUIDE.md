# Command quick guide

Command is the expedition workspace at `/operations`.

1. Sign in and choose an expedition. The backend verifies membership and role;
   the page shows a loader until that request finishes. A failed request offers
   retry; the no-role message appears only after a successful empty response.
2. Start with Field operations: map, latest team positions, published plan and
   latest leader decision. Timestamps, source and accuracy distinguish received
   GPS evidence from stale, offline or simulated positions.
3. A leader can expand **Publish a new plan** to import GPX and optional hazard
   polygons. Publishing creates an immutable version. **Record a decision**
   records the named leader's rationale. Device registration is under
   **Tracking device setup**.
4. Guides and reviewers can expand **Send a field report**. Offline reports stay
   queued on that device until the backend confirms receipt. Download the app,
   plan and licensed basemap before departure; check offline readiness first.
5. In **Alerts**, leaders and geoscientists inspect the draft, rule, source
   values and time, then approve, modify or suppress with a reason. Guides see
   approved deliveries only. Viewers have a read-only field workspace.
6. Reviewers use **Audit history** for recorded events, actor/type filters and
   a full JSON export. Leaders assign existing users under **Roles**.

Initial requests show contextual loaders. Refreshes keep previously loaded data
visible and identify the operation in progress. Errors remain distinct from
confirmed empty results. File controls, selects, open pickers in supporting
browsers, focus indicators and map controls use the existing Alpine Signal tokens.

## What v6 changed from v5

V6 primarily updates implementation status and acceptance priorities. It
recognizes the Command approval gate and asks for end-to-end verification with
real leader, geoscientist, guide/climber and viewer accounts. GPS, five position
states, offline storage, the regional map and audit history were already in v5.
V6 makes Garmin onboarding more urgent, explicitly adds company Apple/Google
developer registrations, and expands ArcGIS account/key checks. It places the
reviewer audit timeline in Command and clarifies actor attribution/full export.

Sensor, drone, scoring and AI expansion remain later-phase work. They do not add
panels to this operational dashboard. Real device transmissions, company account
onboarding and production role acceptance still require the corresponding
credentials, devices and expedition users.

## Layout rationale

The main view prioritizes the map and operational summaries. Setup, publishing,
report entry and detailed evidence expand on demand. Desktop uses a map with a
summary column; narrower screens use the same task order in one column. Controls
retain keyboard operation and visible focus. Usability with real expedition
teams remains the final check; this layout is not a claim of field validation.
