'use client';
import {useState} from 'react';
import {formatoIdentificacion} from '@/lib/identificacion-compra';
export function CampoIdentificacion({tipo,id,defaultValue='',required=false,invalid=false,describedBy,onChange}:{tipo:string;id?:string;defaultValue?:string;required?:boolean;invalid?:boolean;describedBy?:string;onChange?:()=>void}){
 const [valor,setValor]=useState(defaultValue.replace(/\D/g,''));const formato=formatoIdentificacion(tipo);
 return <input id={id} name="identificacion" type="text" inputMode="numeric" autoComplete="off" value={valor} required={required} maxLength={32} pattern={formato.patron} aria-invalid={invalid||undefined} aria-describedby={describedBy} onChange={e=>{setValor(e.target.value.replace(/\D/g,'').slice(0,formato.maximo));onChange?.();}}/>;
}
