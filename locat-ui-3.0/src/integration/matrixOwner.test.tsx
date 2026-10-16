import {useEffect} from 'react';
import {act,cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {MatrixOwnerProvider} from './matrixOwner';
import {useMatrixOwner,type MatrixHandle} from './matrixOwnerContext';
let owner:ReturnType<typeof useMatrixOwner>;
function Probe(){const value=useMatrixOwner();useEffect(()=>{owner=value;},[value]);return <span>{value?.handle?.accountId??'closed'}</span>;}
afterEach(cleanup);
it('retains a handle while children navigate and closes it on account replacement',async()=>{
 const close=vi.fn(async()=>{}),handle={accountId:'alice',closed:false,close} as unknown as MatrixHandle;
 const view=render(<MatrixOwnerProvider accountId="alice"><Probe/></MatrixOwnerProvider>);await act(()=>owner!.adopt(handle));expect(screen.getByText('alice')).toBeVisible();view.rerender(<MatrixOwnerProvider accountId="alice"><div/><Probe/></MatrixOwnerProvider>);expect(close).not.toHaveBeenCalled();expect(screen.getByText('alice')).toBeVisible();view.rerender(<MatrixOwnerProvider accountId="bob"><Probe/></MatrixOwnerProvider>);expect(close).toHaveBeenCalledOnce();expect(screen.getByText('closed')).toBeVisible();
});
it('rejects a foreign handle and explicitly releases the current owner',async()=>{
 const close=vi.fn(async()=>{});render(<MatrixOwnerProvider accountId="alice"><Probe/></MatrixOwnerProvider>);await expect(owner!.adopt({accountId:'bob',closed:false,close} as unknown as MatrixHandle)).rejects.toThrow('account changed');expect(close).toHaveBeenCalledOnce();await act(()=>owner!.adopt({accountId:'alice',closed:false,close} as unknown as MatrixHandle));await act(()=>owner!.stop());expect(screen.getByText('closed')).toBeVisible();expect(close).toHaveBeenCalledTimes(2);
});
it('holds ownership until shutdown completes and refuses a replacement during store release',async()=>{
 let finish:()=>void=()=>{};const close=vi.fn(()=>new Promise<void>(done=>{finish=done;}));render(<MatrixOwnerProvider accountId="alice"><Probe/></MatrixOwnerProvider>);
 await act(()=>owner!.adopt({accountId:'alice',closed:false,close} as unknown as MatrixHandle));let stopping:Promise<void>;act(()=>{stopping=owner!.stop();});expect(owner!.stopping).toBe(true);await expect(owner!.adopt({accountId:'alice',closed:false,close:vi.fn()} as unknown as MatrixHandle)).rejects.toThrow('finish closing');await act(async()=>{finish();await stopping!;});expect(owner!.stopping).toBe(false);expect(owner!.handle).toBeNull();expect(close).toHaveBeenCalledOnce();
});
