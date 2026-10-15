import {expect,it} from 'vitest';import type {MatrixClient} from 'matrix-js-sdk';import {trackAuthorizedMatrixPeer} from './matrixTrackedPeer.mjs';
it('fails closed when the pinned SDK device-tracking bridge is unavailable',async()=>{await expect(trackAuthorizedMatrixPeer({getCrypto:()=>({})} as unknown as MatrixClient,'@peer:matrix.test')).rejects.toThrow('unavailable');});
