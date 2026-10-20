export const APP_LOCK_CHANGE_EVENT = "locat-app-lock-change";
export function notifyAppLockChange(state?: "locked" | "unlocked") {
  window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGE_EVENT, { detail: { state } }));
}
