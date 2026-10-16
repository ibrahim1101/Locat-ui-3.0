import type {MatrixClient} from 'matrix-js-sdk';
export function trackAuthorizedMatrixPeer(client:MatrixClient,userId:string,refresh?:boolean):Promise<void>;
