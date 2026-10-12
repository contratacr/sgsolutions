'use client';
import {useActionState} from 'react';
import {useTranslations} from 'next-intl';
import {guardarDatosCompra,type EstadoDatosCompra} from './datos-acciones';
async function guardarSeguro(estado:EstadoDatosCompra,datos:FormData):Promise<EstadoDatosCompra>{try{return await guardarDatosCompra(estado,datos);}catch{return 'error';}}
export function DatosCuenta({datos,error=false}:{datos:Record<string,string>;error?:boolean}){
 const t=useTranslations('DatosCuenta'),c=useTranslations('Compra'),a=useTranslations('Asesoria');
 const [estado,accion,pendiente]=useActionState(guardarSeguro,'inicio' as EstadoDatosCompra);
 const campo=(nombre:'nombre'|'apellidos'|'telefono'|'identificacion'|'razonSocial'|'correoFactura'|'provincia'|'canton'|'distrito'|'direccion')=><label key={nombre} htmlFor={`datos-${nombre}`}>{c(nombre)}{nombre==='provincia'?<select id="datos-provincia" name="provincia" defaultValue={datos.provincia||''}><option value="">{c('seleccione')}</option>{['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón'].map(p=><option key={p}>{p}</option>)}</select>:<input id={`datos-${nombre}`} name={nombre} defaultValue={datos[nombre]||(nombre==='telefono'?'+506 ':'')} required={['nombre','apellidos'].includes(nombre)} type={nombre==='telefono'?'tel':nombre==='correoFactura'?'email':'text'} maxLength={nombre==='direccion'?350:['provincia','canton','distrito'].includes(nombre)?80:['nombre','apellidos'].includes(nombre)?100:nombre==='telefono'?20:150} autoComplete={nombre==='nombre'?'given-name':nombre==='apellidos'?'family-name':nombre==='telefono'?'tel':nombre==='direccion'?'street-address':'off'}/>}</label>;
 return <section className="cuenta-bloque cuenta-datos" aria-labelledby="cuenta-datos-titulo"><h2 id="cuenta-datos-titulo">{t('titulo')}</h2><p>{t('descripcion')}</p>
 {error&&<p className="cuenta-aviso cuenta-error" role="alert">{t('errorCarga')}</p>}
 <form action={accion} onReset={e=>e.preventDefault()} aria-busy={pendiente}><div className="cuenta-datos-campos">
 {(['nombre','apellidos','telefono'] as const).map(campo)}
 </div><details><summary>{t('facturacion')}</summary><div className="cuenta-datos-campos"><label htmlFor="datos-tipo">{a('tipoIdentificacion')}<select id="datos-tipo" name="tipoIdentificacion" defaultValue={datos.tipoIdentificacion||'fisica'}><option value="fisica">{a('fisica')}</option><option value="juridica">{a('juridica')}</option></select></label>{(['identificacion','razonSocial','correoFactura'] as const).map(campo)}</div></details><details><summary>{t('envio')}</summary><div className="cuenta-datos-campos">{(['provincia','canton','distrito','direccion'] as const).map(campo)}</div></details> {estado!=='inicio'&&<p className={`cuenta-aviso${estado==='guardado'?'':' cuenta-error'}`} role={estado==='guardado'?'status':'alert'}>{t(estado)}</p>}<button className="boton boton-azul" disabled={pendiente}>{t(pendiente?'guardando':'guardar')}</button></form></section>;
}
