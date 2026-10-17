import {test,expect} from '@playwright/test';
import {leerBytesLimitados,leerTextoLimitado} from '../src/lib/limites-http';
test('limita bytes reales aunque falte Content-Length o se declare un tamaño falso',async()=>{
 for(const headers of [{},{'Content-Length':'1'}]){
  let cancelado=false,leidos=0;
  const body=new ReadableStream<Uint8Array>({pull(c){leidos++;c.enqueue(new Uint8Array(100));},cancel(){cancelado=true;}});
  const r=new Request('http://localhost',{method:'POST',headers,body,duplex:'half'} as RequestInit);
  await expect(leerBytesLimitados(r,150)).rejects.toThrow('CUERPO_EXCESIVO');expect(cancelado).toBe(true);expect(leidos).toBeLessThanOrEqual(3);
 }
 await expect(leerTextoLimitado(new Request('http://localhost',{method:'POST',body:'ááá'}),5)).rejects.toThrow('CUERPO_EXCESIVO');
 expect(await leerTextoLimitado(new Request('http://localhost',{method:'POST',body:'ááá'}),6)).toBe('ááá');
 await expect(leerTextoLimitado(new Request('http://localhost',{method:'POST',headers:{'Content-Length':'9999999'},body:'x'}),100)).rejects.toThrow('CUERPO_EXCESIVO');
});

test('las ráfagas tienen límite, vencimiento y aislamiento por cliente',async()=>{
 const {permitirRafaga}=await import('../src/lib/limite-rafagas');
 expect(permitirRafaga('prueba-a',2,100,1000)).toBe(true);expect(permitirRafaga('prueba-a',2,100,1001)).toBe(true);expect(permitirRafaga('prueba-a',2,100,1002)).toBe(false);
 expect(permitirRafaga('prueba-b',2,100,1002)).toBe(true);expect(permitirRafaga('prueba-a',2,100,1100)).toBe(true);
});
