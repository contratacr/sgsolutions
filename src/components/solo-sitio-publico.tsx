'use client';
import {usePathname} from 'next/navigation';
export function SoloSitioPublico({children}:{children:React.ReactNode}){
 const ruta=usePathname();
 if(ruta==='/admin'||ruta==='/acceso'||ruta==='/panel'||ruta.startsWith('/panel/'))return null;
 return children;
}
/** Hides public chrome (the storefront footer) inside the administrative workspace only. */
export function FueraDelPanel({children}:{children:React.ReactNode}){
 const ruta=usePathname();
 if(ruta==='/panel'||ruta.startsWith('/panel/'))return null;
 return children;
}
