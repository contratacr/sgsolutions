'use client';
import {useState,useSyncExternalStore} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useLocale,useTranslations} from 'next-intl';
import {Package} from 'lucide-react';
import {cambiarIdioma} from '@/app/acciones-idioma';
import {enlaceWhatsApp} from '@/lib/empresa';
import {productosDisponibilidad,lineasValidasPrueba,enlaceVencidoPrueba,codigoEnlacePrueba} from '@/lib/disponibilidad-prueba';
import type {MetodoPropuesta} from '@/lib/pedidos-propuesta';
import {useEnlacesPrueba,useRelojPrueba} from './enlaces-prueba-store';
export function MarcoDisponibilidad({children,titulo}:{children:React.ReactNode;titulo:string}){
 const t=useTranslations('DisponibilidadPrueba'),n=useTranslations('Navegacion'),idioma=useLocale();
 return <div className="disponibilidad-vista"><div className="disponibilidad-franja">{t('local')}</div><header><Image src="/imagenes/logo-principal.png" alt={t('logo')} width={132} height={56}/><form action={cambiarIdioma} aria-label={n('seleccionarIdioma')}>{['es','en'].map(id=><button key={id} name="idioma" value={id} aria-pressed={idioma===id}>{id.toUpperCase()}</button>)}</form></header><main id="contenido"><nav><Link href="/vista-previa/pedidos">{t('volverPedidos')}</Link><Link href="/vista-previa/disponibilidad">{t('verTienda')}</Link></nav><h1>{titulo}</h1>{children}</main></div>;
}
export function DisponibilidadVista(){
 const origen=useSyncExternalStore(()=>()=>{},()=>location.origin,()=> '');
 const t=useTranslations('DisponibilidadPrueba'),p=useTranslations('PropuestaPedidos'),n=useTranslations('Navegacion'),idioma=useLocale();const [aviso,setAviso]=useState('');
 const moneda=(v:number)=>(idioma==='en'?'CRC ':'₡')+String(v).replace(/\B(?=(\d{3})+(?!\d))/g,idioma==='en'?',':' ');
 return <MarcoDisponibilidad titulo={t('tiendaTitulo')}><p>{t('tiendaAyuda')}</p><div className="disponibilidad-tarjetas">{productosDisponibilidad.map(x=>{const directo=x.stock!==null&&x.stock>=15;const mensaje=t('mensajeConsulta',{producto:p('producto_'+x.id),codigo:x.codigo,cantidad:1})+'\n'+origen+'/vista-previa/disponibilidad#'+x.id;return <article id={x.id} key={x.id}><div className="disponibilidad-foto"><Package size={48} aria-hidden="true"/></div><small>{x.codigo}</small><h2>{p('producto_'+x.id)}</h2><strong>{moneda(x.precio)}</strong><p className={directo?'disponibilidad-ok':'disponibilidad-consultar'}>{directo?t('disponibles',{cantidad:x.stock!}):t('porConfirmar')}</p><small>{t('datoEjemplo',{cantidad:x.stock===null?t('sinDato'):String(x.stock)})}</small>{directo?<button className="propuesta-principal" onClick={()=>setAviso(t('agregadoEjemplo'))}>{t('agregarCarrito')}</button>:<a className="propuesta-principal" href={enlaceWhatsApp(mensaje)} target="_blank" rel="noopener noreferrer" aria-label={t('consultar')+' · '+p('producto_'+x.id)+' · '+n('nuevaPestana')}>{t('consultar')}</a>}</article>;})}</div>{aviso&&<p role="status" className="propuesta-aviso">{aviso}</p>}<p className="propuesta-nota">{t('tiendaNota')}</p></MarcoDisponibilidad>;
}
import {guardarComprobantePrueba} from '@/lib/comprobante-prueba';
import {FinalizarCompra} from './finalizar-compra';
import type {Contenido} from '@/lib/contenido-modelo';
import type {CatalogoPublico} from '@/lib/catalogo-modelo';
export function CompraEnlacePrueba({token,pagos}:{token:string;pagos:Contenido['pagos']}){
 const t=useTranslations('DisponibilidadPrueba'),p=useTranslations('PropuestaPedidos');
 const {enlaces,guardar,listo}=useEnlacesPrueba(),ahora=useRelojPrueba();
 const enlace=enlaces.find(e=>e.token===token||codigoEnlacePrueba(e.token)===token);
 const [metodo,setMetodo]=useState<MetodoPropuesta>('tarjeta'),[finalizado,setFinalizado]=useState(false);
 async function simular(datos:Record<string,string>,metodo:MetodoPropuesta,archivo?:File){
  if(!enlace||enlace.estado!=='pendiente_pago'||enlaceVencidoPrueba(enlace)||!lineasValidasPrueba(enlace.lineas))throw new Error('ENLACE_INVALIDO');
  if(metodo!=='tarjeta'){if(!archivo)throw new Error('COMPROBANTE_REQUERIDO');await guardarComprobantePrueba(enlace.token,archivo);}
  const entrega=datos.modalidad==='express'?'express':datos.modalidad==='envio'?'envio':'retiro';
  guardar(enlaces.map(x=>x.token===enlace.token?{...x,datos,comprobante:archivo?{nombre:archivo.name,tipo:archivo.type}:undefined,cliente:[datos.nombre,datos.apellidos].filter(Boolean).join(' '),metodo,entrega,estado:metodo==='tarjeta'?'por_preparar':'comprobante'}:x));
  setMetodo(metodo);setFinalizado(true);
 }
 const articulos=enlace?.lineas.map(l=>{
  const modelo=productosDisponibilidad.find(x=>x.id===l.producto)!;
  const nombre={es:p('producto_'+l.producto),en:p('producto_'+l.producto)};
  const producto:CatalogoPublico['productos'][number]={id:modelo.id,slug:modelo.id,categoria:'ejemplo',subcategoria:undefined,fichaTecnica:undefined,nombre,descripcion:nombre,imagen:'/imagenes/logo-principal.png',imagenes:[],especificaciones:[],marca:'',codigoFabricante:modelo.codigo,stockDisponible:modelo.stock,destacado:false,disponibilidad:'proveedor',actualizado:null,precio:l.precio,precioOriginal:null};
  return {producto,cantidad:l.cantidad};
 })??[];
 const vencido=enlace&&Date.parse(enlace.vence)<=ahora;
 return <MarcoDisponibilidad titulo={t('compraTitulo')}>{!listo?null:!enlace?<p role="status">{t('enlaceNoValido')}</p>:finalizado?<section className="disponibilidad-compra" role="status"><h2>{t(metodo==='tarjeta'?'pagoSimulado':'comprobanteSimulado')}</h2><p>{t('resultadoSimulado')}</p><Link href="/vista-previa/pedidos" className="propuesta-principal">{t('volverPedidos')}</Link></section>:enlace.estado!=='pendiente_pago'||vencido?<section className="disponibilidad-compra"><h2>{t(vencido?'vencido':enlace.estado==='cancelado'?'enlaceCancelado':'enlaceUsado')}</h2><p>{t('enlaceNoValido')}</p></section>:<><p className="propuesta-nota">{t('pagoAviso')}</p><div className="compra-pagina"><FinalizarCompra pagos={pagos} aprobacion={{id:enlace.id,token:enlace.token,articulos}} tarjetaDisponible pedidosManualesDisponibles simularPedido={simular}/></div></>}</MarcoDisponibilidad>;
}
