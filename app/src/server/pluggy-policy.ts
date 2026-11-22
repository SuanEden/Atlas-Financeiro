/**
 * Server-only Pluggy policy helpers. Bank item identifiers are operational
 * configuration, never shipped in client bundles or embedded in source.
 */
const uuid=/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export function approvedPluggyItems(config:string|undefined):Set<string>{
  if(!config?.trim()) return new Set();
  const values=config.split(',').map(value=>value.trim());
  if(values.length>20 || values.some(value=>!uuid.test(value)) || new Set(values).size!==values.length){
    throw new TypeError('ATLAS_PLUGGY_ALLOWED_ITEM_IDS deve conter UUIDs distintos separados por vírgulas.');
  }
  return new Set(values);
}

export function pluggyReady(env:NodeJS.ProcessEnv):boolean{
  return Boolean(env.PLUGGY_CLIENT_ID&&env.PLUGGY_CLIENT_SECRET&&env.ATLAS_PLUGGY_OWNER_ID&&
    env.VITE_SUPABASE_URL&&env.VITE_SUPABASE_PUBLISHABLE_KEY&&
    approvedPluggyItems(env.ATLAS_PLUGGY_ALLOWED_ITEM_IDS).size>0);
}
