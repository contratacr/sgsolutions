'use client';
import {useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import {Copy,Check} from 'lucide-react';
export function EnlaceCompra({url}:{url:string}){
 const t=useTranslations('AsesoriaAdmin'),campo=useRef<HTMLInputElement>(null);const [copiado,setCopiado]=useState(false),[error,setError]=useState(false);
 async function copiar(){try{await navigator.clipboard.writeText(url);setCopiado(true);setError(false);}catch{campo.current?.focus();campo.current?.select();setError(true);}}
 return <div className="asesoria-enlace"><label>{t('enlace')}<input ref={campo} readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label><button type="button" className="boton boton-contorno" onClick={copiar}>{copiado?<Check size={18} aria-hidden="true"/>:<Copy size={18} aria-hidden="true"/>}{t(copiado?'copiado':'copiar')}</button>{error&&<p role="status">{t('copiarManual')}</p>}</div>;
}
