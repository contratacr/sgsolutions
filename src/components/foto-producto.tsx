'use client';
import Image from 'next/image';
import {useState} from 'react';
import {useTranslations} from 'next-intl';

const pendiente='/imagenes/producto-sin-imagen.svg';

export function FotoProducto({src,alt}:{src:string;alt:string}){
 const t=useTranslations('Tienda');
 const [fallida,setFallida]=useState<string|null>(null);
 const sinFoto=!src||src===pendiente||fallida===src;
 return <>
  <Image width={400} height={300} src={sinFoto?pendiente:src} alt={alt} loading="lazy" onError={()=>{if(!sinFoto)setFallida(src);}}/>
  {sinFoto&&<small className="shop-imagen-pendiente">{t('imagenPendiente')}</small>}
 </>;
}
