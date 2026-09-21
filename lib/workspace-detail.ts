export const WORKSPACE_DETAIL_EVENT = "catalyst:open-workspace-detail";

export type WorkspaceDetail = "route" | "weather" | "satellite" | "gps";

export function openWorkspaceDetail(detail: WorkspaceDetail) {
  window.dispatchEvent(new CustomEvent<WorkspaceDetail>(WORKSPACE_DETAIL_EVENT, { detail }));
}
