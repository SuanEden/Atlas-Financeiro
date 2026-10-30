import {describe,expect,it,vi} from 'vitest';
import {newLocalId} from './local-id';

describe('identificadores locais com aleatoriedade criptográfica',()=>{
  it('usa UUID nativo quando disponível',()=>{
    const value='A1000000-0000-4000-8000-000000000001';
    expect(newLocalId({randomUUID:()=>value,getRandomValues:vi.fn()} as unknown as Crypto)).toBe(value.toLowerCase());
  });
  it('sem randomUUID mantém formato v4, bits de variante e 16 bytes de entropia',()=>{
    const getRandomValues=vi.fn(<T extends ArrayBufferView>(array:T)=>{new Uint8Array(array.buffer,array.byteOffset,array.byteLength).fill(255);return array;});
    expect(newLocalId({getRandomValues:getRandomValues as Crypto['getRandomValues']})).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(getRandomValues).toHaveBeenCalledOnce();
    expect(getRandomValues.mock.calls[0]![0].byteLength).toBe(16);
  });
});
