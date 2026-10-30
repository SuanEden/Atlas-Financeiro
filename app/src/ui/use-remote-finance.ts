import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createDefaultCommandContext, type LocalCommand } from '../application';
import type { LocalFinancialState } from '../domain';
import type { RemoteController } from '../remote/controller';

const empty:LocalFinancialState={accounts:[],categories:[],events:[],settlements:[],postings:[],outbox:[]};

export function useRemoteFinance(controller:RemoteController) {
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  const userId=snapshot.session.userId;
  const context=useMemo(()=>createDefaultCommandContext(userId),[userId]);
  const [state,setState]=useState<LocalFinancialState>(empty);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string>();
  const executing=useRef(false);
  const readState=useCallback(async():Promise<LocalFinancialState>=>{
    const current=controller.getSnapshot();const store=current.store;
    if(!current.session.canView||current.session.userId!==userId||!store||store.userId!==userId)throw new Error('Entre com a conta correta para acessar.');
    const data=await store.read();
    const latest=controller.getSnapshot();
    if(!latest.session.canView||latest.session.userId!==userId)throw new Error('A sessão mudou.');
    return {...data.projection,outbox:data.pending.flatMap((row)=>row.envelope.kind==='bootstrap'||row.status==='resolved'?[]:[{
      id:row.id,userId,kind:row.envelope.operation.kind,createdAt:row.envelope.operation.createdAt,payloadJson:JSON.stringify(row.envelope.operation.payload),
    }])};
  },[controller,userId]);
  useEffect(()=>{
    let active=true;
    readState().then((next)=>{if(active)setState(next);}).catch(()=>{if(active)setError('Não foi possível abrir os dados locais. As pendências foram preservadas.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[readState,snapshot.dataRevision,snapshot.session.epoch,snapshot.store]);
  const execute=useCallback(async(command:LocalCommand)=>{
    if(executing.current)throw new Error('Aguarde a operação em andamento.');
    executing.current=true;setBusy(true);setError(undefined);
    try {await controller.enqueue(command);setState(await readState());}
    catch {setError('Não foi possível salvar. Confira o acesso e o armazenamento antes de tentar novamente.');throw new Error('Não foi possível salvar.');}
    finally {executing.current=false;setBusy(false);}
  },[controller,readState]);
  const recover=async(json:string)=>{await controller.recoverBackup(json);setState(await readState());};
  return {state,loading,busy,error,clearError:()=>setError(undefined),execute,recover,readState,context,userId};
}
