'use client';
import {useRef,useState} from 'react';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import {useLocale,useTranslations} from 'next-intl';
import {subirImagen} from '@/app/panel/imagenes';
export type FotoAdmin={src:string;alt?:{es:string;en:string};caption?:{es:string;en:string}};
export function GestorImagenes({fotos,cambiar,descripciones=false,maximo=12,onBusy}:{fotos:FotoAdmin[];cambiar:(f:FotoAdmin[])=>void;descripciones?:boolean;maximo?:number;onBusy?:(busy:boolean)=>void}){
 const t=useTranslations('AdminImagenes'),idioma=useLocale();
 const [ocupado,setOcupado]=useState(false),[error,setError]=useState(''),[url,setUrl]=useState(''),[visor,setVisor]=useState<string|null>(null),[anterior,setAnterior]=useState<FotoAdmin[]|null>(null);
 const archivo=useRef<HTMLInputElement>(null),reemplazo=useRef<number|null>(null);
 function actualizar(nuevas:FotoAdmin[]){setAnterior(fotos);cambiar(nuevas);setError('');}
 function mover(i:number,j:number){const copia=[...fotos];const [foto]=copia.splice(i,1);copia.splice(j,0,foto);actualizar(copia);}
 async function cargar(lista:FileList|null){
  if(!lista?.length)return;
  const archivos=Array.from(lista),indice=reemplazo.current;reemplazo.current=null;
  if((indice===null&&archivos.length+fotos.length>maximo)||(indice!==null&&archivos.length>1)){setError('limite');return;}
  setOcupado(true);onBusy?.(true);setError('');
  try{
   const nuevas:FotoAdmin[]=[];
   for(const file of archivos){
    const datos=new FormData();datos.set('archivo',file);
    const r=await subirImagen(datos);if(!r.src){setError(r.error??'errorCarga');return;}
    nuevas.push({src:r.src,alt:{es:'',en:''},caption:{es:'',en:''}});
   }
   actualizar(indice===null?[...fotos,...nuevas]:fotos.map((f,i)=>i===indice?{...f,src:nuevas[0].src}:f));
  }catch{setError('errorCarga');}finally{setOcupado(false);onBusy?.(false);if(archivo.current)archivo.current.value='';}
 }
 function elegir(i:number|null){reemplazo.current=i;if(archivo.current){archivo.current.multiple=i===null;archivo.current.click();}}
 return <section className="gestor-imagenes" aria-label={t('titulo')}>
  <div className="gestor-cabecera"><div><h3>{t('titulo')}</h3><p>{t('ayuda',{maximo})}</p></div><span>{fotos.length} / {maximo}</span></div>
  <input ref={archivo} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e=>void cargar(e.target.files)} />
  <fieldset disabled={ocupado} className="gestor-campos">
   {fotos.length>0&&<div className="gestor-grid">{fotos.map((f,i)=><article className="gestor-foto" key={`${i}-${f.src}`}>
    <button type="button" className="gestor-preview" onClick={()=>setVisor(f.src)} aria-label={t('verNumero',{numero:i+1})}><Image src={f.src} alt={f.alt?.[idioma==='en'?'en':'es']||t('foto',{numero:i+1})} width={300} height={220} unoptimized/><span>{i===0?t('portada'):t('foto',{numero:i+1})}</span></button>
    <div className="gestor-operaciones"><button type="button" onClick={()=>setVisor(f.src)}>{t('ver')}</button><button type="button" onClick={()=>elegir(i)}>{t('cambiar')}</button><button type="button" onClick={()=>actualizar(fotos.filter((_,j)=>i!==j))}>{t('quitar')}</button></div>
    <div className="gestor-operaciones"><button type="button" disabled={i===0} onClick={()=>mover(i,0)}>{t('usarPortada')}</button><button type="button" disabled={i===0} aria-label={t('antes',{numero:i+1})} onClick={()=>mover(i,i-1)}>←</button><button type="button" disabled={i===fotos.length-1} aria-label={t('despues',{numero:i+1})} onClick={()=>mover(i,i+1)}>→</button></div>
    {descripciones&&<details className="gestor-descripcion"><summary>{t('describir')}</summary>{(['caption','alt'] as const).map(k=>(['es','en'] as const).map(l=><label key={k+l}>{t(k)} ({l.toUpperCase()})<input maxLength={4000} value={f[k]?.[l]??''} onChange={e=>actualizar(fotos.map((foto,j)=>j===i?{...foto,[k]:{es:'',en:'',...foto[k],[l]:e.target.value}}:foto))}/></label>))}</details>}
   </article>)}</div>}
   {!fotos.length&&<p className="gestor-vacio">{t('vacio')}</p>}
   <div className="gestor-operaciones"><button type="button" className="boton boton-contorno" disabled={fotos.length>=maximo} onClick={()=>elegir(null)}>{t('agregar')}</button>{anterior&&<button type="button" onClick={()=>{cambiar(anterior);setAnterior(null);}}>{t('deshacer')}</button>}</div>
   <details className="gestor-url"><summary>{t('usarUrl')}</summary><label>{t('url')}<input type="url" value={url} onChange={e=>setUrl(e.target.value)}/></label><button type="button" disabled={fotos.length>=maximo} onClick={()=>{if(!/^(\/imagenes\/[a-zA-Z0-9._/-]+|https:\/\/[^\s]+)$/.test(url.trim())){setError('urlInvalida');return;}actualizar([...fotos,{src:url.trim(),alt:{es:'',en:''},caption:{es:'',en:''}}]);setUrl('');}}>{t('agregarUrl')}</button></details>
  </fieldset>
  <p role="status">{ocupado?t('cargando'):t('guardarNota')}</p>{error&&<p role="alert">{t(error,{maximo})}</p>}
  <Dialog.Root open={visor!==null} onOpenChange={abierto=>{if(!abierto)setVisor(null);}}><Dialog.Portal><Dialog.Overlay className="historia-overlay"/><Dialog.Content className="gestor-visor"><Dialog.Title>{t('ver')}</Dialog.Title><Dialog.Description>{t('vistaCompleta')}</Dialog.Description>{visor&&<Image src={visor} alt={t('vistaCompleta')} width={1600} height={1200} unoptimized/>}<Dialog.Close className="boton boton-contorno">{t('cerrar')}</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
 </section>;
}
