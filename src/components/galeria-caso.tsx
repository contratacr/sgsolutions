'use client';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import {useState,useRef} from 'react';
import {useTranslations} from 'next-intl';
import {ArrowLeft,ArrowRight,Expand,X} from 'lucide-react';

type Foto={src:string;alt:string;caption:string};
export function GaleriaCaso({cliente,fotos,prioridad=false}:{cliente:string;fotos:Foto[];prioridad?:boolean}){
 const t=useTranslations('Casos');
 const [abierta,setAbierta]=useState(false),[indice,setIndice]=useState(0);
 const origen=useRef<HTMLButtonElement|null>(null);
 const mover=(paso:number)=>setIndice(actual=>(actual+paso+fotos.length)%fotos.length);
 return <Dialog.Root open={abierta} onOpenChange={setAbierta}>
  <div className="historia-fotos caso-galeria" data-total={fotos.length}>{fotos.map((foto,i)=><button key={foto.src} type="button" className="historia-foto" onClick={e=>{origen.current=e.currentTarget;setIndice(i);setAbierta(true);}} aria-label={t('ampliar',{foto:foto.caption,cliente})}>
   <Image src={foto.src} alt={foto.alt} fill sizes="(max-width:600px) 90vw, (max-width:900px) 45vw, 33vw" priority={prioridad&&i===0}/>
   <span className="historia-foto-pie"><span>{foto.caption}</span><Expand size={17}/></span>
  </button>)}</div>
  <Dialog.Portal><Dialog.Overlay className="historia-overlay"/><Dialog.Content className="historia-visor" onCloseAutoFocus={e=>{e.preventDefault();origen.current?.focus();}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();mover(1);}if(e.key==='ArrowLeft'){e.preventDefault();mover(-1);}}}>
   <div className="historia-visor-cabecera"><div><Dialog.Title>{cliente}</Dialog.Title><Dialog.Description>{t('contador',{actual:indice+1,total:fotos.length})}</Dialog.Description></div><Dialog.Close className="historia-control" aria-label={t('cerrarFoto')}><X size={24}/></Dialog.Close></div>
   <div className="historia-visor-imagen"><Image src={fotos[indice].src} alt={fotos[indice].alt} fill sizes="90vw"/></div>
   <div className="historia-visor-pie"><button className="historia-control" onClick={()=>mover(-1)} aria-label={t('fotoAnterior')}><ArrowLeft size={22}/></button><p aria-live="polite">{fotos[indice].caption}</p><button className="historia-control" onClick={()=>mover(1)} aria-label={t('fotoSiguiente')}><ArrowRight size={22}/></button></div>
  </Dialog.Content></Dialog.Portal>
 </Dialog.Root>;
}
