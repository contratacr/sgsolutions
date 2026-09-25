'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {revisarSesion} from '@/app/panel/catalogo/sincronizar/acciones';
import {colones,traducir,type Texto} from '@/lib/catalogo-modelo';
type Respuesta={version?:string;base64?:string;error?:string};
function extension(tipo:string,sku?:string):Promise<Respuesta>{
 return new Promise(resolve=>{const id=crypto.randomUUID();const listener=(e:MessageEvent)=>{if(e.source===window&&e.origin===location.origin&&e.data?.canal==='sg-intcomex-respuesta'&&e.data.id===id){clearTimeout(timer);window.removeEventListener('message',listener);resolve(e.data.resultado??{error:'extensionError'});}};
 const timer=setTimeout(()=>{window.removeEventListener('message',listener);resolve({error:tipo==='estado'?'noInstalada':'exportacion'});},tipo==='estado'?1800:100000);
 window.addEventListener('message',listener);window.postMessage({canal:'sg-intcomex-solicitud',id,tipo,sku},location.origin);});
}
export function SincronizadorIntcomex({productos,revision}:{productos:{id:string;sku:string;nombre:Texto}[];revision:number}){
 const t=useTranslations('AdminSincronizacion'),ti=useTranslations('AdminImportacion'),idioma=useLocale(),router=useRouter();
 const [usd,setUsd]=useState(false),[piloto,setPiloto]=useState(false);
 const [estado,setEstado]=useState(''),[ocupado,setOcupado]=useState(false),[progreso,setProgreso]=useState(0),[total,setTotal]=useState(0),[faltantes,setFaltantes]=useState<string[]>([]);
 const [cambios,setCambios]=useState<NonNullable<Awaited<ReturnType<typeof revisarSesion>>['cambios']>>([]);
 const archivos=useRef<FormData|null>(null),cancelado=useRef(false),montado=useRef(true);
 useEffect(()=>{montado.current=true;return()=>{montado.current=false;cancelado.current=true;};},[]);
 async function iniciar(todos:boolean){
  setOcupado(true);setEstado('conectando');setCambios([]);setFaltantes([]);archivos.current=null;cancelado.current=false;setProgreso(0);
  const seleccion=todos?productos:productos.slice(0,3);setTotal(seleccion.length);
  try{
   const salud=await extension('estado');if(salud.error){setEstado(salud.error);return;}
   const form=new FormData();for(const p of seleccion)form.append('consultado',p.sku);if(todos)form.set('consultaCompleta','si');const ausentes:string[]=[];let bytes=0;
   for(const p of seleccion){
    if(cancelado.current||!montado.current)break;
    setEstado('consultando');const r=await extension('exportar',p.sku);
    if(cancelado.current||!montado.current)break;
    if(r.error==='noEncontrado'){ausentes.push(p.sku);setFaltantes([...ausentes]);}
    else if(r.error){setEstado(r.error);return;}
    else if(typeof r.base64==='string'&&r.base64.length<=5600000){
     const datos=Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0));bytes+=datos.length;if(bytes>16*1024*1024){setEstado('limite');return;}
     form.append('archivo',new File([datos],p.sku+'.xlsx'));form.append('sku',p.sku);
    }else{setEstado('exportacion');return;}
    setProgreso(n=>n+1);
   }
   if(cancelado.current||!montado.current){setEstado('cancelado');return;}
   if(!form.getAll('archivo').length){setEstado('sinResultados');return;}
   setEstado('revisando');const r=await revisarSesion(form,revision);
   if(r.error){setEstado(r.error);return;}
   const noCoinciden=[...new Set([...ausentes,...(r.faltantes??[])])];setFaltantes(noCoinciden);
   if(!todos)setPiloto(true);
   archivos.current=form;setCambios(r.cambios??[]);setEstado('listo');
  }catch{setEstado('extensionError');}finally{if(montado.current)setOcupado(false);}
 }
 async function guardar(){if(!archivos.current)return;setOcupado(true);try{const r=await revisarSesion(archivos.current,revision,true);setEstado(r.error??'guardado');if(r.guardado){archivos.current=null;setCambios([]);router.refresh();}if(r.error==='conflicto')setCambios([]);}catch{setEstado('error');}finally{setOcupado(false);}}
 const claves=['limite','duplicado','conectando','consultando','noInstalada','extensionError','exportacion','sesion','ocupado','codigo','cancelado','sinResultados','revisando','listo','guardado'];
 return <section className="admin-editor admin-sincronizacion">
  <aside className="admin-guia"><strong>{t('prototipo')}</strong><p>{t('descripcion')}</p><p>{t('cantidad',{cantidad:productos.length})}</p></aside>
  <details><summary>{t('instalacion')}</summary><ol><li>{t('paso1')}</li><li>{t('paso2')}</li><li>{t('paso3')}</li></ol><p>{t('limites')}</p></details>
  <label className="admin-check"><input type="checkbox" checked={usd} disabled={ocupado} onChange={e=>setUsd(e.target.checked)}/>{t('usd')}</label><div className="admin-importar-acciones"><button className="boton boton-azul" disabled={ocupado||!usd||!productos.length} onClick={()=>iniciar(false)}>{t('probar')}</button><button className="boton boton-contorno" disabled={ocupado||!usd||!piloto||!productos.length||productos.length>500} onClick={()=>iniciar(true)}>{t('todos')}</button>{ocupado&&<button className="boton boton-contorno" onClick={()=>{cancelado.current=true;setEstado('cancelado');void extension('cancelar');}}>{t('cancelar')}</button>}</div>
  <p role="status" aria-live="polite">{estado&&(claves.includes(estado)?t(estado):ti(estado,{fila:0}))}</p>
  {total>0&&<p>{t('progreso',{hechos:progreso,total})}</p>}
  {faltantes.length>0&&<p>{t('faltantes',{codigos:faltantes.join(', ')})}</p>}
  {cambios.length>0&&<><h2>{t('revision')}</h2><p>{t('conserva')}</p><div className="admin-importar-tabla"><table><thead><tr><th>{t('producto')}</th><th>{t('cantidadLabel')}</th><th>{t('precio')}</th></tr></thead><tbody>{cambios.map(c=><tr key={c.sku}><td>{traducir(productos.find(p=>p.sku===c.sku)!.nombre,idioma)}<br/><small>{c.sku}</small></td><td>{c.stock===null?ti('consultar'):c.exacto?c.stock:ti('alMenos',{cantidad:c.stock})}</td><td>{c.precio===null?ti('revision'):colones(c.precio)}{c.manual&&<p>{ti('manual')}</p>}{c.revision&&<p>{ti('alertaPrecio')}</p>}</td></tr>)}</tbody></table></div><button className="boton boton-azul" disabled={ocupado} onClick={guardar}>{t('guardar')}</button></>}
 </section>;
}
