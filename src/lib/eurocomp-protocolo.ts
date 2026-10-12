import {SaxesParser} from 'saxes';

export type ArticuloEurocomp = {codigo:string;parte:string;nombre:string;marca:string;familia:string;familiaPadre:string;imagen:string;precio:number|null;moneda:string;stock:number|null};
export type CatalogoEurocomp = {fecha:string;bodega:number;articulos:ArticuloEurocomp[]};
export class ErrorEurocomp extends Error {
 readonly codigo:string;
 constructor(codigo:string){super(codigo);this.codigo=codigo;this.name='ErrorEurocomp';}
}
const escapar=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
const decodificar=(inicio:Uint8Array)=>{
 const cabecera=new TextDecoder('ascii').decode(inicio.subarray(0,256));
 const encoding=cabecera.match(/encoding=["']([^"']+)["']/i)?.[1].toLowerCase()??'utf-8';
 if(!['utf-8','utf8','iso-8859-1','windows-1252'].includes(encoding))throw new ErrorEurocomp('respuesta');
 return new TextDecoder(encoding,{fatal:true});
};
const imagenProveedor=(v:string)=>{
 try{const url=new URL(v,'https://eurocompcr.com/');return v&&url.protocol==='https:'&&url.hostname==='eurocompcr.com'&&url.pathname.startsWith('/upload/')?url.href:'';}catch{return '';}
};
const numero=(s:string|undefined)=>s?.trim()&&Number.isFinite(Number(s))?Number(s):null;

// Read-only operation. No order or reservation methods are exposed here.
export async function consultarEurocomp(config:{id:string;clave:string;bodega:number;codigo?:string;tiempoMaximo?:number},transporte:typeof fetch=fetch):Promise<CatalogoEurocomp>{
 if(!/^\d+$/.test(config.id)||!config.clave||!Number.isSafeInteger(config.bodega)||config.bodega<0||(config.tiempoMaximo!==undefined&&(!Number.isInteger(config.tiempoMaximo)||config.tiempoMaximo<1||config.tiempoMaximo>90_000)))throw new ErrorEurocomp('configuracion');
 const operacion=config.codigo?'wsc_request_bodega_all_item':'wsc_request_bodega_all_items';
 const cuerpo=`<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:service="urn:server"><soap:Body><service:${operacion} soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><ws_cid xsi:type="xsd:int">${config.id}</ws_cid><ws_passwd xsi:type="xsd:string">${escapar(config.clave)}</ws_passwd><bid xsi:type="xsd:int">${config.bodega}</bid>${config.codigo?`<icodigo xsi:type="xsd:string">${escapar(config.codigo)}</icodigo>`:''}</service:${operacion}></soap:Body></soap:Envelope>`;
 const control=new AbortController();const limite=setTimeout(()=>control.abort(),config.tiempoMaximo??90_000);
 let lector:ReadableStreamDefaultReader<Uint8Array>|undefined;
 try {
  const respuesta=await transporte('https://eurocompcr.com/webservice.php',{method:'POST',redirect:'error',cache:'no-store',signal:control.signal,headers:{'Content-Type':'text/xml; charset=utf-8',SOAPAction:`"urn:server#${operacion}"`},body:cuerpo});
  if(!respuesta.ok||!respuesta.body)throw new ErrorEurocomp('conexion');
  const parser=new SaxesParser({xmlns:true});
  let nivel=0,nivelFila=0,fila:Record<string,string>|null=null,campo='',resultado='',fallo=false,total=0;
  const articulos:ArticuloEurocomp[]=[];const codigos=new Set<string>();
  parser.on('doctype',()=>{throw new ErrorEurocomp('respuesta');});
  parser.on('opentag',n=>{
   nivel++;if(n.local==='Fault')fallo=true;
   const tipo=Object.values(n.attributes).find(a=>a.local==='type')?.value;
   if(tipo?.split(':').pop()==='items_Row') {if(fila)throw new ErrorEurocomp('respuesta');fila={};nivelFila=nivel;}
   campo=n.local;
  });
  parser.on('text',t=>{
   if(campo==='result'&&!fila)resultado+=t;
   if(fila&&nivel===nivelFila+1){fila[campo]=(fila[campo]??'')+t;if(fila[campo].length>200000)throw new ErrorEurocomp('respuesta');}
  });
  parser.on('cdata',t=>{if(fila&&nivel===nivelFila+1)fila[campo]=(fila[campo]??'')+t;});
  parser.on('closetag',()=>{
   if(fila&&nivel===nivelFila){
    const codigo=fila.codigo?.trim();
    if(!codigo||codigos.has(codigo)||articulos.length>=50000)throw new ErrorEurocomp('respuesta');
    codigos.add(codigo);
    articulos.push({codigo,parte:(fila.parte||'').trim().slice(0,200),nombre:(fila.descripcion||fila.desc_corta||codigo).trim().slice(0,2000),marca:(fila.marca||'').trim().slice(0,200),familia:(fila.familia||'').trim().slice(0,200),familiaPadre:(fila.FamiliaPadre||'').trim().slice(0,200),imagen:imagenProveedor(fila.image_url||''),precio:numero(fila.precio),moneda:(fila.currency_code||'').trim().toUpperCase().slice(0,10),stock:numero(fila.stock)});fila=null;
   }
   nivel--;campo='';
  });
  lector=respuesta.body.getReader();let decodificador:TextDecoder|undefined;let inicio=new Uint8Array();
  while(true){const {done,value}=await lector.read();if(done)break;total+=value.byteLength;if(total>80*1024*1024)throw new ErrorEurocomp('respuesta');if(!decodificador){
 const unido=new Uint8Array(inicio.length+value.length);unido.set(inicio);unido.set(value,inicio.length);inicio=unido;
 if(inicio.length<256)continue;
 decodificador=decodificar(inicio);parser.write(decodificador.decode(inicio,{stream:true}));inicio=new Uint8Array();
 }else parser.write(decodificador.decode(value,{stream:true}));}
  if(!decodificador)decodificador=decodificar(inicio);parser.write(decodificador.decode(inicio,{stream:true}));parser.write(decodificador.decode()).close();
  if(fallo||!/^\d+$/.test(resultado.trim()))throw new ErrorEurocomp('respuesta');
  if(resultado.trim()!=='0')throw new ErrorEurocomp(`codigo${resultado.trim()}`);
  return {fecha:new Date().toISOString(),bodega:config.bodega,articulos};
 }catch(e){if(e instanceof ErrorEurocomp)throw e;throw new ErrorEurocomp(control.signal.aborted?'tiempo':'respuesta');}
 finally{clearTimeout(limite);await lector?.cancel().catch(()=>{});}
}
