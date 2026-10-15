import {UserId} from '@matrix-org/matrix-sdk-crypto-wasm';
/** Compatibility bridge for matrix-js-sdk 44.0.0 / WASM 18.9.0, under the existing exclusive store lock.
 * The public device-info download does not retain untracked users for SAS. Keep this internal API
 * dependency isolated and revalidate both pinned versions before upgrades. Never changes trust.
 */
export async function trackAuthorizedMatrixPeer(client,userId){
 const backend=client.getCrypto();
 if(typeof backend?.getOlmMachineOrThrow!=='function'||typeof backend.outgoingRequestsManager?.doProcessOutgoingRequests!=='function')throw new Error('Contact verification is unavailable with this crypto runtime.');
 await backend.getOlmMachineOrThrow().updateTrackedUsers([new UserId(userId)]);
 await backend.outgoingRequestsManager.doProcessOutgoingRequests();
}
