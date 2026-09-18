'use client';
import {usePathname} from 'next/navigation';
export function SoloSitioPublico({children}:{children:React.ReactNode}){
 const ruta=usePathname();
 if(ruta==='/admin'||ruta==='/acceso'||ruta==='/panel'||ruta.startsWith('/panel/'))return null;
 return children;
}
