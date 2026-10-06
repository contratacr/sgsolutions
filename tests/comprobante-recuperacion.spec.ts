import {test,expect} from '@playwright/test';
import {adjuntarComprobantePedido} from '../src/lib/adjuntar-comprobante';
for(const escenario of ['correcto','rechazado','sin-red','sin-archivo'])test(`comprobante conserva el pedido: ${escenario}`,async()=>{
 const original=globalThis.fetch,peticiones:{url:string;body:FormData}[]=[];
 globalThis.fetch=async(url,opciones)=>{peticiones.push({url:String(url),body:opciones?.body as FormData});if(escenario==='sin-red')throw new Error('offline');return new Response('{}',{status:escenario==='rechazado'?503:200});};
 try{const archivo=new File(['%PDF-'+'0'.repeat(200)],'comprobante.pdf',{type:'application/pdf'});const url=new URL('https://example.test/finalizar-compra/pedido?pedido=pedido-prueba&acceso=acceso-prueba');const salida=await adjuntarComprobantePedido(url,escenario==='sin-archivo'?null:archivo);expect(salida.pathname).toBe('/finalizar-compra/pedido');expect(salida.searchParams.get('pedido')).toBe('pedido-prueba');expect(salida.searchParams.get('acceso')).toBe('acceso-prueba');expect(salida.searchParams.get('comprobante')).toBe(['rechazado','sin-red'].includes(escenario)?'pendiente':null);expect(peticiones).toHaveLength(escenario==='sin-archivo'?0:1);if(peticiones.length){expect(peticiones[0].url).toBe('/api/pedidos/manual/comprobante');expect(peticiones[0].body.get('pedido')).toBe('pedido-prueba');expect((peticiones[0].body.get('archivo') as File).name).toBe('comprobante.pdf');}}
 finally{globalThis.fetch=original;}
});
