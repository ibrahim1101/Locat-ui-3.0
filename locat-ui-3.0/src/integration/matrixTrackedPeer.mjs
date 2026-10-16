import {UserId} from '@matrix-org/matrix-sdk-crypto-wasm';
/** Compatibility bridge for matrix-js-sdk 44.0.0 / WASM 18.9.0, under the existing exclusive store lock.
 * The public device-info download does not retain untracked users for SAS. Keep this internal API
 * dependency isolated and revalidate both pinned versions before upgrades. Optional refresh uses the
 * same queryKeysForUsers/makeOutgoingRequest path as upstream rust-crypto. Never changes trust.
 */
export async function trackAuthorizedMatrixPeer(client,userId,refresh=false){
 const backend=client.getCrypto();
 if(typeof backend?.getOlmMachineOrThrow!=='function'||typeof backend.outgoingRequestsManager?.doProcessOutgoingRequests!=='function')throw new Error('Contact verification is unavailable with this crypto runtime.');
 await backend.getOlmMachineOrThrow().updateTrackedUsers([new UserId(userId)]);
 await backend.outgoingRequestsManager.doProcessOutgoingRequests();
 if(refresh){if(typeof backend.outgoingRequestProcessor?.makeOutgoingRequest!=='function')throw new Error('Fresh contact keys are unavailable with this crypto runtime.');const request=backend.getOlmMachineOrThrow().queryKeysForUsers([new UserId(userId)]);await backend.outgoingRequestProcessor.makeOutgoingRequest(request);}
}
