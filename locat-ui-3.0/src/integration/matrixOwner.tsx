import {useEffect,useRef,useState,type ReactNode} from 'react';
import {MatrixOwnerContext as Context,type MatrixHandle} from './matrixOwnerContext';
export function MatrixOwnerProvider({accountId,children}:{accountId:string;children:ReactNode}){return <AccountMatrixOwner key={accountId} accountId={accountId}>{children}</AccountMatrixOwner>;}
function AccountMatrixOwner({accountId,children}:{accountId:string;children:ReactNode}){
 const current=useRef<MatrixHandle|null>(null),alive=useRef(true),closing=useRef<Promise<void>|null>(null);const [handle,setHandle]=useState<MatrixHandle|null>(null),[stopping,setStopping]=useState(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;const value=current.current;current.current=null;void value?.close().catch(()=>{});};},[]);
 function stop(){if(closing.current)return closing.current;const value=current.current;if(alive.current)setStopping(true);const task=(async()=>{try{await value?.close();}finally{current.current=null;closing.current=null;if(alive.current){setHandle(null);setStopping(false);}}})();closing.current=task;return task;}
 async function adopt(value:MatrixHandle){if(!alive.current||value.accountId!==accountId||value.closed){await value.close();throw new Error('Messaging account changed.');}if(closing.current)throw new Error('Wait for messaging to finish closing.');if(current.current&&current.current!==value)throw new Error('Stop the active messaging session before replacing it.');current.current=value;setHandle(value);}
 return <Context.Provider value={{handle,stopping,adopt,stop}}>{children}</Context.Provider>;
}
