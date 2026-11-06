'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import {ArrowLeft} from 'lucide-react';
import {leerRetornoTienda} from '@/lib/retorno-tienda';
const suscribir=()=>()=>{};
export function VolverTienda(){
 const ruta=usePathname(),t=useTranslations('Ficha');
 const destino=useSyncExternalStore(suscribir,()=>leerRetornoTienda(ruta),()=>'/tienda');
 return <Link className="ficha-volver" href={destino}><ArrowLeft size={17}/>{t('volver')}</Link>;
}
