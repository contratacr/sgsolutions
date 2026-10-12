import {test,expect} from '@playwright/test';
import {consultarEurocomp} from '../src/lib/eurocomp-protocolo';
const inicio='<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:t="urn:server"><soap:Body><t:wsc_request_bodega_all_itemsResponse>';
const fin='</t:wsc_request_bodega_all_itemsResponse></soap:Body></soap:Envelope>';
const fila='<item xsi:type="t:items_Row"><codigo>DEMO-1</codigo><parte>PART-1</parte><descripcion>Red &amp; cámaras</descripcion><marca>Demo</marca><familia>Redes</familia><precio>100.5</precio><currency_code>USD</currency_code><stock>2</stock></item>';
const config={id:'0',clave:'clave-de-prueba',bodega:0};
const transporte=(xml:string)=>async()=>new Response(xml);

test('Eurocomp usa solo lectura, escapa secretos y conserva el precio neto y la moneda del proveedor',async()=>{
 let solicitud:RequestInit|undefined;
 const datos=await consultarEurocomp({...config,clave:'a<&"b'},async(url,opciones)=>{expect(url).toBe('https://eurocompcr.com/webservice.php');solicitud=opciones;return new Response(inicio+'<result>0</result><data>'+fila+'</data>'+fin);});
 expect(solicitud?.body).toContain('a&lt;&amp;&quot;b');expect(solicitud?.redirect).toBe('error');expect(solicitud?.cache).toBe('no-store');
 expect(solicitud?.body).not.toMatch(/send_orden|send_preventa/);
 expect(datos.articulos).toEqual([{codigo:'DEMO-1',parte:'PART-1',nombre:'Red & cámaras',marca:'Demo',familia:'Redes',familiaPadre:'',imagen:'',precio:100.5,moneda:'USD',stock:2}]);
 expect(JSON.stringify(datos)).not.toContain('clave');
});
test('Eurocomp lee ISO-8859-1 por bloques sin perder acentos',async()=>{
 const bytes=Buffer.from((inicio+'<result>0</result><data>'+fila+'</data>'+fin).replace('UTF-8','ISO-8859-1'),'latin1');
 const datos=await consultarEurocomp(config,async()=>new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=17)c.enqueue(bytes.subarray(i,i+17));c.close();}})));
 expect(datos.articulos[0].nombre).toBe('Red & cámaras');
});
for(const codigo of [4,20,26,27,28])test(`Eurocomp respeta código ${codigo} sin reintentar`,async()=>{
 let llamadas=0;
 await expect(consultarEurocomp(config,async()=>{llamadas++;return new Response(inicio+`<result>${codigo}</result><data/>`+fin);})).rejects.toMatchObject({codigo:`codigo${codigo}`});
 expect(llamadas).toBe(1);
});
test('Eurocomp rechaza XML truncado, DTD y códigos duplicados',async()=>{
 await expect(consultarEurocomp(config,transporte(inicio+'<result>0</result>'))).rejects.toMatchObject({codigo:'respuesta'});
 await expect(consultarEurocomp(config,transporte('<!DOCTYPE doc SYSTEM "https://example.com/private">'+inicio+'<result>0</result>'+fin))).rejects.toMatchObject({codigo:'respuesta'});
 await expect(consultarEurocomp(config,transporte(inicio+'<result>0</result><data>'+fila+fila+'</data>'+fin))).rejects.toMatchObject({codigo:'respuesta'});
});

test('una consulta lenta expira sin reintentar y sin divulgar credenciales',async()=>{
 let llamadas=0;
 await expect(consultarEurocomp({...config,tiempoMaximo:5},async(_url,opciones)=>{
  llamadas++;return new Promise<Response>((_resolve,reject)=>opciones?.signal?.addEventListener('abort',()=>reject(new Error('interrumpida')),{once:true}));
 })).rejects.toMatchObject({codigo:'tiempo'});expect(llamadas).toBe(1);
});
