'use client';
import {CampoTelefono} from '@/components/campo-telefono';
import {CampoIdentificacion} from '@/components/campo-identificacion';
import {useActionState,useState} from 'react';
import {useTranslations} from 'next-intl';
import {IndicadorCampo} from '@/components/indicador-campo';
import {guardarDatosCompra,type EstadoDatosCompra} from './datos-acciones';
async function guardarSeguro(estado:EstadoDatosCompra,datos:FormData):Promise<EstadoDatosCompra>{try{return await guardarDatosCompra(estado,datos);}catch{return 'error';}}
export function DatosCuenta({datos,error=false}:{datos:Record<string,string>;error?:boolean}){
 const t=useTranslations('DatosCuenta'),c=useTranslations('Compra'),a=useTranslations('Asesoria');
 const [tipo,setTipo]=useState(datos.tipoIdentificacion||'fisica');
 const [estado,accion,pendiente]=useActionState(guardarSeguro,'inicio' as EstadoDatosCompra);
 const campo=(nombre:'nombre'|'apellidos'|'telefono'|'identificacion'|'razonSocial'|'correoFactura'|'provincia'|'canton'|'distrito'|'direccion')=><label key={nombre} htmlFor={`datos-${nombre}`}><span>{c(nombre)}<IndicadorCampo obligatorio={['nombre','apellidos'].includes(nombre)}/></span>{nombre==='provincia'?<select id="datos-provincia" name="provincia" defaultValue={datos.provincia||''}><option value="">{c('seleccione')}</option>{['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón'].map(p=><option key={p}>{p}</option>)}</select> :nombre==='identificacion'?<CampoIdentificacion tipo={tipo} id="datos-identificacion" defaultValue={datos.identificacion}/>:nombre==='telefono'?<CampoTelefono id="datos-telefono" name="telefono" defaultValue={datos.telefono}/>:<input id={`datos-${nombre}`} name={nombre} defaultValue={datos[nombre]||''} required={['nombre','apellidos'].includes(nombre)} type={nombre==='correoFactura'?'email':'text'} maxLength={nombre==='direccion'?350:['provincia','canton','distrito'].includes(nombre)?80:['nombre','apellidos'].includes(nombre)?100:150} autoComplete={nombre==='nombre'?'given-name':nombre==='apellidos'?'family-name':nombre==='direccion'?'street-address':'off'}/>}</label>;
 return <section className="cuenta-bloque cuenta-datos" aria-labelledby="cuenta-datos-titulo"><details className="cuenta-datos-desplegable"><summary><h2 id="cuenta-datos-titulo">{t('titulo')}</h2></summary><p>{t('descripcion')}</p>
 {error&&<p className="cuenta-aviso cuenta-error" role="alert">{t('errorCarga')}</p>}
 <form action={accion} onReset={e=>e.preventDefault()} aria-busy={pendiente}><div className="cuenta-datos-campos">
 {(['nombre','apellidos','telefono'] as const).map(campo)}
 </div><details><summary>{t('facturacion')}</summary><div className="cuenta-datos-campos"><label htmlFor="datos-tipo"><span>{a('tipoIdentificacion')}<IndicadorCampo/></span><select id="datos-tipo" name="tipoIdentificacion" value={tipo} onChange={e=>setTipo(e.target.value)}><option value="fisica">{a('fisica')}</option><option value="juridica">{a('juridica')}</option><option value="dimex">{a('dimex')}</option><option value="nite">{a('nite')}</option></select></label>{(['identificacion','razonSocial','correoFactura'] as const).map(campo)}</div></details><details><summary>{t('envio')}</summary><div className="cuenta-datos-campos">{(['provincia','canton','distrito','direccion'] as const).map(campo)}</div></details> {estado!=='inicio'&&<p className={`cuenta-aviso${estado==='guardado'?'':' cuenta-error'}`} role={estado==='guardado'?'status':'alert'}>{t(estado)}</p>}<button className="boton boton-azul" disabled={pendiente}>{t(pendiente?'guardando':'guardar')}</button></form></details></section>;
}
