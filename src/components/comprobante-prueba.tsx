'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {useTranslations} from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';
import {MarcoModal} from './marco-modal';
import {leerComprobantePrueba} from '@/lib/comprobante-prueba';
import type {PedidoPropuesta} from '@/lib/pedidos-propuesta';
export function ComprobantePrueba({pedido}:{pedido:PedidoPropuesta}){
 const t=useTranslations('PropuestaPedidos');
 const [url,setUrl]=useState(''),[error,setError]=useState(false),[abierto,setAbierto]=useState(false);
 const ejemplo=!pedido.enlaceToken;
 useEffect(()=>{
  if(!pedido.enlaceToken||!pedido.comprobante)return;
  let activo=true,objeto='';
  leerComprobantePrueba(pedido.enlaceToken).then(blob=>{if(!activo)return;if(!blob){setError(true);return;}objeto=URL.createObjectURL(blob);setUrl(objeto);}).catch(()=>{if(activo)setError(true);});
  return()=>{activo=false;if(objeto)URL.revokeObjectURL(objeto);};
 },[pedido.enlaceToken,pedido.comprobante]);
 if(pedido.metodo==='tarjeta'||(!pedido.comprobante&&!ejemplo)||ejemplo&&['pendiente_pago','rechazado','cancelado'].includes(pedido.estado))return null;
 const src=ejemplo?'/imagenes/comprobante-ejemplo.svg':url;
 const nombre=ejemplo?'comprobante-ejemplo.svg':pedido.comprobante!.nombre;
 return <div className="propuesta-adjunto"><p>{nombre}</p>{ejemplo&&<small>{t('comprobanteEjemplo')}</small>}{error?<p role="alert">{t('adjuntoNoDisponible')}</p>:!src?<p role="status">{t('cargandoAdjunto')}</p>:<div className="propuesta-secundarias"><Dialog.Root open={abierto} onOpenChange={setAbierto}><Dialog.Trigger>{t('verAdjunto')}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="propuesta-modal-fondo"/><MarcoModal className="propuesta-modal propuesta-modal-adjunto"><Dialog.Title>{t('verAdjunto')}</Dialog.Title><Dialog.Description>{pedido.id} · {nombre}</Dialog.Description>{pedido.comprobante?.tipo==='application/pdf'?<iframe title={t('verAdjunto')} src={src}/>:<Image src={src} alt={t('verAdjunto')} width={800} height={1000} unoptimized/>}<a className="propuesta-descargar" href={src} download={nombre}>{t('descargarAdjunto')}</a></MarcoModal></Dialog.Portal></Dialog.Root><a className="propuesta-descargar" href={src} download={nombre}>{t('descargarAdjunto')}</a></div>}</div>;
}
