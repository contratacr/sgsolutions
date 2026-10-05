'use client';
import {useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import {Copy,Check,Link2} from 'lucide-react';
export function EnlaceCompra({url}:{url:string}){
 const t=useTranslations('AsesoriaAdmin'),campo=useRef<HTMLInputElement>(null);const [copiado,setCopiado]=useState(false),[error,setError]=useState(false);
 async function copiar(){try{await navigator.clipboard.writeText(url);setCopiado(true);setError(false);}catch{campo.current?.focus();campo.current?.select();setError(true);}}
 return <div className="asesoria-enlace"><label><span className="asesoria-enlace-titulo"><Link2 size={20} aria-hidden="true"/>{t('enlace')}</span><input ref={campo} readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label><button type="button" className="boton boton-azul" onClick={copiar}>{copiado?<Check size={18} aria-hidden="true"/>:<Copy size={18} aria-hidden="true"/>}{t(copiado?'copiado':'copiar')}</button><span className="sr-only" role="status">{copiado?t('copiado'):''}</span>{error&&<p role="status">{t('copiarManual')}</p>}</div>;
}
