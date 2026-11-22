import { validatePlan, type FinancialPlan } from './model';

/**
 * Portable, passphrase-protected planning export. Encryption protects the
 * downloaded copy, NOT the browser's IndexedDB. No key or passphrase is stored.
 */
const ITERATIONS=210_000;
const MAX_BYTES=1_000_000;
const FORMAT='atlas-financeiro-planning-encrypted';
const encoder=new TextEncoder();

type Envelope={
  format:typeof FORMAT;version:1;kdf:'PBKDF2-SHA256';
  iterations:number;salt:string;iv:string;ciphertext:string;
};

function bytesToBase64(bytes:Uint8Array):string {
  let value='';
  for(let i=0;i<bytes.length;i+=8192)
    value+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(value);
}

function base64ToBytes(value:string,max:number):Uint8Array {
  if(!/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(value)
     ||value.length>Math.ceil(max/3)*4+4)
    throw new TypeError('Arquivo criptografado inválido.');
  const binary=atob(value);
  if(binary.length>max)throw new TypeError('Arquivo criptografado excede o limite.');
  return Uint8Array.from(binary,char=>char.charCodeAt(0));
}
function password(value:string):void {
  if(value.length<12||value.length>256)throw new TypeError('Use uma senha de 12 a 256 caracteres para proteger o arquivo.');
}
async function derive(passphrase:string,salt:Uint8Array,mode:KeyUsage[]):Promise<CryptoKey>{
  const base=await crypto.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2',salt:new Uint8Array(salt),iterations:ITERATIONS,hash:'SHA-256'},
    base,{name:'AES-GCM',length:256},false,mode
  );
}
export function isEncryptedPlanningBackup(raw:string):boolean {
  if(raw.length>MAX_BYTES*2)return false;
  try{
    const parsed:unknown=JSON.parse(raw);
    return !!parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&
      (parsed as Record<string,unknown>).format===FORMAT;
  }catch{return false;}
}

export async function encryptPlanningBackup(plan:FinancialPlan,passphrase:string):Promise<string>{
  validatePlan(plan);password(passphrase);
  const plaintext=encoder.encode(JSON.stringify(plan));
  if(plaintext.byteLength>MAX_BYTES)throw new RangeError('Planejamento muito grande para exportação criptografada.');
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derive(passphrase,salt,['encrypt']);
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plaintext);
  const envelope:Envelope={format:FORMAT,version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,
    salt:bytesToBase64(salt),iv:bytesToBase64(iv),
    ciphertext:bytesToBase64(new Uint8Array(encrypted))};
  return JSON.stringify(envelope);
}
export async function decryptPlanningBackup(raw:string,passphrase:string):Promise<FinancialPlan>{
  if(raw.length>MAX_BYTES*2)throw new TypeError('Arquivo excede o limite permitido.');
  password(passphrase);
  let value:unknown;
  try{value=JSON.parse(raw);}catch{throw new TypeError('Arquivo JSON inválido.');}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError('Formato criptografado inválido.');
  const data=value as Record<string,unknown>;
  if(Object.keys(data).sort().join(',')!=='ciphertext,format,iterations,iv,kdf,salt,version'||
    data.format!==FORMAT||data.version!==1||data.kdf!=='PBKDF2-SHA256'||data.iterations!==ITERATIONS||
    typeof data.salt!=='string'||typeof data.iv!=='string'||typeof data.ciphertext!=='string')
    throw new TypeError('Formato ou parâmetros criptográficos não suportados.');
  const salt=base64ToBytes(data.salt,16),iv=base64ToBytes(data.iv,12);
  if(salt.length!==16||iv.length!==12)throw new TypeError('Parâmetros criptográficos inválidos.');
  const ciphertext=base64ToBytes(data.ciphertext,MAX_BYTES+16);
  if(ciphertext.length<16)throw new TypeError('Conteúdo criptografado inválido.');
  try{
    const key=await derive(passphrase,salt,['decrypt']);
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(iv)},key,new Uint8Array(ciphertext));
    const decoded=new TextDecoder('utf-8',{fatal:true}).decode(plaintext);
    const plan:unknown=JSON.parse(decoded);
    validatePlan(plan);
    return plan;
  }catch{throw new TypeError('Senha incorreta ou arquivo criptografado corrompido.');}
}
