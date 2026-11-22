import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  emptyPlan, type FinancialPlan, type Goal,
} from '../src/planning/model';
import {
  mergePlanningThreeWay, samePlanContent, PlanningCloudConflict,
  type PlanningCloudPort, type PlanningCloudSnapshot,
} from '../src/planning/cloud-model';
import {
  readPlanning, mutatePlanning, readPlanningCloudEnabled,
  setPlanningCloudEnabled, syncPlanningCloud,
} from '../src/planning/store';

const owner='owner-planning-cloud-tests';
const goal=(id:string,name=id):Goal=>({
  id,name,targetCents:null,deadline:null,priority:'unset',status:'active',allocations:[]
});
const withGoals=(...rows:Goal[]):FinancialPlan=>({
  ...emptyPlan(owner),goals:rows
});
function server(initial:PlanningCloudSnapshot={revision:0,document:null}) {
  let current=structuredClone(initial);
  let writes=0;
  const port:PlanningCloudPort={
    read:async()=>structuredClone(current),
    write:async(expectedRevision,document)=>{
      writes++;
      if(expectedRevision!==current.revision)
        return {...structuredClone(current),applied:false};
      current={revision:current.revision+1,document:structuredClone(document)};
      return {...structuredClone(current),applied:true};
    }
  };
  return {port,getSnapshot:()=>structuredClone(current),getWrites:()=>writes,
    simulateChange:(document:FinancialPlan)=>{
      current={revision:current.revision+1,document:structuredClone(document)};
    }};
}
describe('sincronização independente do Planejamento',()=>{
  it('integra metas novas de dois dispositivos que editaram registros diferentes',()=>{
    const base=withGoals(goal('a'));
    const local={...base,goals:[goal('a'),goal('b')]};
    const remote={...base,goals:[goal('a'),goal('c')]};
    const merged=mergePlanningThreeWay(owner,base,local,remote);
    expect(merged.goals.map(x=>x.id).sort()).toEqual(['a','b','c']);
  });
  it('não sobrescreve edições conflitantes ou remoção unilateral',()=>{
    const base=withGoals(goal('same'));
    const local=withGoals(goal('same','texto A'));
    const remote=withGoals(goal('same','texto B'));
    expect(()=>mergePlanningThreeWay(owner,base,local,remote)).toThrow(PlanningCloudConflict);
    expect(()=>mergePlanningThreeWay(owner,base,withGoals(),base)).toThrow(/Remoção ambígua/);
  });
  it('ignora revisão de navegador ao comparar conteúdo',()=>{
    const a=withGoals(goal('a'));
    expect(samePlanContent({...a,revision:9},a)).toBe(true);
  });
  it('não envia planejamento antes de ativar a opção',async()=>{
    const id=owner+'-inactive';
    const cloud=server();
    expect(await readPlanningCloudEnabled(id)).toBe(false);
    await expect(syncPlanningCloud(id,cloud.port)).rejects.toThrow(/Ative/);
    expect(cloud.getWrites()).toBe(0);
  });
  it('sincroniza sem apagar o IndexedDB e evita reenvios duplicados',async()=>{
    const id=owner+'-local';
    const cloud=server();
    await setPlanningCloudEnabled(id,true);
    await mutatePlanning(id,prev=>({...prev,revision:prev.revision+1,goals:[goal('first')]}));
    const first=await syncPlanningCloud(id,cloud.port);
    expect(first.cloudRevision).toBe(1);
    expect(cloud.getSnapshot().document?.goals[0]?.id).toBe('first');
    const again=await syncPlanningCloud(id,cloud.port);
    expect(again.cloudRevision).toBe(1);
    expect(cloud.getWrites()).toBe(1);
    expect((await readPlanning(id)).goals.map(x=>x.id)).toEqual(['first']);
  });
  it('reconcilia uma edição local com outra edição remota sem perder IDs',async()=>{
    const id=owner+'-merge';
    const cloud=server();
    await setPlanningCloudEnabled(id,true);
    await mutatePlanning(id,prev=>({...prev,revision:prev.revision+1,goals:[goal('base')]}));
    await syncPlanningCloud(id,cloud.port);
    const current=cloud.getSnapshot().document!;
    await mutatePlanning(id,prev=>({...prev,revision:prev.revision+1,goals:[...prev.goals,goal('local')]}));
    cloud.simulateChange({...current,goals:[...current.goals,goal('other-device')]});
    const merged=await syncPlanningCloud(id,cloud.port);
    expect(merged.cloudRevision).toBe(3);
    expect((await readPlanning(id)).goals.map(x=>x.id).sort()).toEqual(['base','local','other-device']);
  });
  it('não grava sobre versão mais nova se ambos alteraram a mesma meta',async()=>{
    const id=owner+'-conflict';
    const cloud=server();
    await setPlanningCloudEnabled(id,true);
    await mutatePlanning(id,prev=>({...prev,revision:prev.revision+1,goals:[goal('base')]}));
    await syncPlanningCloud(id,cloud.port);
    const base=cloud.getSnapshot().document!;
    await mutatePlanning(id,prev=>({...prev,revision:prev.revision+1,goals:[goal('base','alteração local')]}));
    cloud.simulateChange({...base,goals:[goal('base','alteração remota')]});
    const writes=cloud.getWrites();
    await expect(syncPlanningCloud(id,cloud.port)).rejects.toThrow(PlanningCloudConflict);
    expect(cloud.getWrites()).toBe(writes);
    expect((await readPlanning(id)).goals[0]?.name).toBe('alteração local');
    expect(cloud.getSnapshot().document?.goals[0]?.name).toBe('alteração remota');
  });
});
