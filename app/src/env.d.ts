/** Frontend runtime configuration. Avoid importing Vite dev-only ambient types into serverless functions. */
interface ImportMetaEnv {
  readonly MODE?:string;
  readonly DEV?:boolean;
  readonly PROD?:boolean;
  readonly BASE_URL?:string;
  readonly VITE_ATLAS_REMOTE_MODE?:string;
  readonly VITE_SUPABASE_URL?:string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?:string;
  readonly VITE_ATLAS_AUTH_ORIGIN?:string;
  readonly [key:string]:string|boolean|undefined;
}
interface ImportMeta {
  readonly env:ImportMetaEnv;
}
