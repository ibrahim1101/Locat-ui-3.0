import {createContext,useContext} from 'react';
import type {openMatrixCryptoSession} from './matrixCryptoSession';
export type MatrixHandle=Awaited<ReturnType<typeof openMatrixCryptoSession>>;
type Owner={handle:MatrixHandle|null;adopt(handle:MatrixHandle):Promise<void>;stop():Promise<void>};
export const MatrixOwnerContext=createContext<Owner|null>(null);
export const useMatrixOwner=()=>useContext(MatrixOwnerContext);
