'use client';
import {longitudesTelefono} from '@/lib/telefono-pais';
import {useRef,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {getCountries,getCountryCallingCode,parsePhoneNumberFromString,type CountryCode} from 'libphonenumber-js/min';
function separar(valor:string){const limpio=valor.trim();const telefono=parsePhoneNumberFromString(limpio,'CR');return {pais:telefono?.country??'CR' as CountryCode,numero:telefono?.nationalNumber??(limpio==='+506'?'':limpio.replace(/^\+506\s*/, '').replace(/\D/g,''))};}
export function CampoTelefono({name,id,defaultValue='',required=false,invalid=false,onChange}:{name:string;id?:string;defaultValue?:string;required?:boolean;invalid?:boolean;onChange?:()=>void}){
 const t=useTranslations('Telefono'),idioma=useLocale(),numeroInput=useRef<HTMLInputElement>(null);
 const [datos,setDatos]=useState(()=>separar(defaultValue));
 const regiones=new Intl.DisplayNames([idioma],{type:'region'});
 const paises=getCountries().sort((a,b)=>a==='CR'?-1:b==='CR'?1:(regiones.of(a)??a).localeCompare(regiones.of(b)??b,idioma));
 const codigo=getCountryCallingCode(datos.pais),longitudes=longitudesTelefono(datos.pais),maximo=Math.max(...longitudes);
 const patron=longitudes.map(n=>'[0-9]{'+n+'}').join('|');
 function cambiar(valor:string){const internacional=valor.trim().startsWith('+')?parsePhoneNumberFromString(valor):undefined;setDatos(internacional?.country?{pais:internacional.country,numero:internacional.nationalNumber.slice(0,Math.max(...longitudesTelefono(internacional.country)))}:{...datos,numero:valor.replace(/\D/g,'').slice(0,maximo)});onChange?.();}
 return <span className="campo-telefono"><select aria-label={t('pais')} value={datos.pais} autoComplete="tel-country-code" onChange={e=>{const pais=e.target.value as CountryCode;numeroInput.current?.dispatchEvent(new Event('input',{bubbles:true}));setDatos({...datos,pais,numero:datos.numero.slice(0,Math.max(...longitudesTelefono(pais)))});onChange?.();}}>{paises.map(p=><option key={p} value={p}>{regiones.of(p)} (+{getCountryCallingCode(p)})</option>)}</select><input ref={numeroInput} id={id} aria-label={t('numero')} type="tel" inputMode="tel" autoComplete="tel-national" value={datos.numero} onChange={e=>cambiar(e.target.value)} required={required} maxLength={32} pattern={patron} data-longitudes-telefono={longitudes.join(', ')} aria-invalid={invalid||undefined}/><input type="hidden" name={name} value={datos.numero?'+'+codigo+datos.numero:''}/></span>;
}
