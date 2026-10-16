import {test,expect} from '@playwright/test';
import {seleccionarTarjetaSdk} from '../src/lib/tilopay-sdk-cliente';
const methods=[{id:'card',type:'card',name:'Card'}];
for(const entorno of ['pruebas','produccion'] as const)test(`SDK exige coincidencia estricta del modo ${entorno}`,()=>{
 const esperado=entorno==='pruebas'?1:0;
 expect(seleccionarTarjetaSdk({test:esperado,methods},'',entorno)).toBe('card');
 for(const test of [undefined,null,NaN,'0','1',esperado===1?0:1]){
  expect(()=>seleccionarTarjetaSdk({test:test as number,methods},'',entorno)).toThrow('SDK_ENVIRONMENT_MISMATCH');
 }
 expect(()=>seleccionarTarjetaSdk({test:esperado,methods:[]},'',entorno)).toThrow('SDK_METHOD_UNAVAILABLE');
 expect(()=>seleccionarTarjetaSdk({test:esperado,methods},'other',entorno)).toThrow('SDK_METHOD_UNAVAILABLE');
 expect(()=>seleccionarTarjetaSdk({test:esperado,methods:[...methods,{id:'second',type:'card',name:'Other'}]},'',entorno)).toThrow('SDK_METHOD_UNAVAILABLE');
 expect(seleccionarTarjetaSdk({test:esperado,methods:[...methods,{id:'second',type:'card',name:'Other'}]},'second',entorno)).toBe('second');
});
