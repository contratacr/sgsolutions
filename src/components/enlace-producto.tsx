'use client';
import Link from 'next/link';
import type {ComponentProps} from 'react';
import {recordarRetornoTienda} from '@/lib/retorno-tienda';
export function EnlaceProducto({href,onNavigate,...props}:ComponentProps<typeof Link>){
 return <Link {...props} href={href} onNavigate={e=>{recordarRetornoTienda(typeof href==='string'?href:href.pathname??'');onNavigate?.(e);}}/>;
}
