/** Bounded session/device cleanup must remain available when ordinary setup commands are throttled. */
const actions=new Set(['cancel-provision','disconnect','logout','revoke-managed-device']);
export const isMatrixCleanupAction=action=>actions.has(action);
