#!/usr/bin/env node
/**
 * Offline regression checks for the Atlas release surface. No secrets,
 * provider requests, database connections, or financial mutations.
 */
import { readFileSync } from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const errors=[];
const assert=(ok,message)=>{if(!ok)errors.push(message);};
const api=read('api/pluggy.ts');
const diag=read('scripts/verify-pluggy-items.mjs');
const plan=read('src/planning/PersonalPlanning.tsx');
const mig=read('../supabase/migrations/20261122180000_pluggy_refresh_gate.sql');
const policy=read('src/server/pluggy-policy.ts');

assert(!/new Set\(\s*\['[\da-f]{8}-/i.test(api),'Gateway contém IDs de conexão bancária fixos no código.');
assert(!/\['(?:Nubank|InfinitePay)',\s*'[\da-f]{8}-/i.test(diag),'Diagnóstico contém vínculos bancários fixos.');
assert(api.includes("claimRefresh(req,itemId)")&&api.includes("ATLAS_PLUGGY_REFRESH_LOCK"),
  'Gateway deve exigir trava de refresh distribuída.');
assert(!api.includes('refreshCooldowns'),'Cooldown de memória não serve como trava distribuída.');
assert(!/resource.*health[\s\S]{0,250}await key\(\)/.test(api),
  'Endpoint público health não pode autenticar no banco.');
assert(policy.includes('ATLAS_PLUGGY_ALLOWED_ITEM_IDS'),'Allowlist privada ausente.');
assert(mig.includes('on conflict (owner_id,item_id) do update')&&mig.includes('atlas_security.app_access'),
  'Migração deve validar acesso e reivindicar trava de forma atômica.');
assert(plan.includes('encryptPlanningBackup')&&plan.includes('decryptPlanningBackup'),
  'Planejamento precisa oferecer backup protegido e recuperação.');
assert(plan.includes('searchExpenseEvents'),'Necessidade deve pesquisar o histórico completo.');
if(errors.length){for(const e of errors)console.error('AUDITORIA:',e);process.exitCode=1;}
else console.log('Atlas release guards: aprovado (sem acesso a dados externos).');
