import {useEffect,useRef,useState,type ReactNode} from 'react';
import {MatrixOwnerContext as Context,type MatrixHandle} from './matrixOwnerContext';
export function MatrixOwnerProvider({accountId,children}:{accountId:string;children:ReactNode}){return <AccountMatrixOwner key={accountId} accountId={accountId}>{children}</AccountMatrixOwner>;}
function AccountMatrixOwner({accountId,children}:{accountId:string;children:ReactNode}){
 const current=useRef<MatrixHandle|null>(null),alive=useRef(true);const [handle,setHandle]=useState<MatrixHandle|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;const value=current.current;current.current=null;void value?.close();};},[]);
 async function stop(){const value=current.current;current.current=null;if(alive.current)setHandle(null);await value?.close();}
 async function adopt(value:MatrixHandle){if(!alive.current||value.accountId!==accountId||value.closed){await value.close();throw new Error('Messaging account changed.');}if(current.current&&current.current!==value)throw new Error('Stop the active messaging session before replacing it.');current.current=value;setHandle(value);}
 return <Context.Provider value={{handle,adopt,stop}}>{children}</Context.Provider>;
}
