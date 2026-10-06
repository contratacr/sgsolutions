import {getTranslations} from 'next-intl/server';
import {IconoWhatsApp} from './icono-whatsapp';
import {normalizarTelefonoWhatsApp} from '@/lib/telefono-whatsapp';

type Cliente={tipoIdentificacion?:string;nombre?:string;apellidos?:string;telefono?:string;correo?:string;necesidad?:string;direccion?:string;contacto?:string;factura?:string;provincia?:string;canton?:string;distrito?:string;apartamento?:string;postal?:string;receptor?:string;telefonoReceptor?:string;identificacion?:string;razonSocial?:string;actividad?:string;correoFactura?:string;direccionFiscal?:string;notas?:string};
export async function ContactoPedidoAdmin({cliente,referencia}:{cliente?:Cliente|null;referencia:string}){
 const t=await getTranslations('PedidosAdmin'),a=await getTranslations('AsesoriaAdmin'),c=await getTranslations('Compra');
 const campos=['provincia','canton','distrito','apartamento','postal','receptor','telefonoReceptor','identificacion','razonSocial','actividad','correoFactura','direccionFiscal','notas'] as const;
 const telefono=cliente?.telefono?normalizarTelefonoWhatsApp(cliente.telefono):null;
 return <section className="panel-contacto-cliente" aria-label={t('contactoTitulo')}>
  <h3>{t('contactoTitulo')}</h3>
  {cliente?.nombre&&<p><strong>{[cliente.nombre,cliente.apellidos].filter(Boolean).join(' ')}</strong></p>}
  {cliente?.telefono?<p className="panel-contacto-telefono">{telefono?<a href={`tel:+${telefono}`}>+{telefono}</a>:cliente.telefono}</p>:<p className="panel-ayuda">{t('sinTelefono')}</p>}
  {cliente?.telefono&&!telefono&&<p className="panel-ayuda">{t('telefonoInvalido')}</p>}
  {cliente?.correo&&<p><a href={`mailto:${cliente.correo}`}>{cliente.correo}</a></p>}
  {cliente?.necesidad&&<p className="panel-contacto-nota">{cliente.necesidad}</p>}
  {cliente?.direccion&&<p className="panel-contacto-nota">{cliente.direccion}</p>}
  {(cliente?.factura||campos.some(k=>cliente?.[k]))&&<dl className="panel-contacto-datos">
   {cliente?.tipoIdentificacion&&['fisica','juridica'].includes(cliente.tipoIdentificacion)&&<div><dt>{c('tipoIdentificacion')}</dt><dd>{c(cliente.tipoIdentificacion)}</dd></div>}
   {cliente?.factura&&['tiquete','electronica'].includes(cliente.factura)&&<div><dt>{c('factura')}</dt><dd>{c(cliente.factura)}</dd></div>}
   {campos.map(k=>cliente?.[k]?<div key={k}><dt>{c(k)}</dt><dd>{cliente[k]}</dd></div>:null)}
  </dl>}
  {telefono&&<a className="boton boton-azul" href={`https://wa.me/${telefono}?text=${encodeURIComponent(t('mensajeWhatsApp',{nombre:cliente?.nombre??'',referencia}))}`} target="_blank" rel="noopener noreferrer"><IconoWhatsApp width={20} height={20}/>{a('contactar')}<span className="sr-only">{t('nuevaPestana')}</span></a>}
 </section>;
}
