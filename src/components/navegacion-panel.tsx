'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useRef,type ReactNode} from 'react';
import {Headset,LayoutDashboard,Package,FileText,MessagesSquare,ChartNoAxesCombined,Truck,Users,ArrowLeft} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';

const grupos=[
 {clave:'',enlaces:[{href:'/panel',Icono:LayoutDashboard}]},
 {clave:'operaciones',enlaces:[{href:'/panel/pedidos',Icono:MessagesSquare},{href:'/panel/soporte',Icono:Headset},{href:'/panel/usuarios',Icono:Users}]},
 {clave:'tiendaContenido',enlaces:[{href:'/panel/catalogo',Icono:Package},{href:'/panel/proveedores',Icono:Truck},{href:'/panel/contenido',Icono:FileText}]},
 {clave:'resultados',enlaces:[{href:'/panel/estadisticas',Icono:ChartNoAxesCombined}]},
] as const;

/** Administrative shell navigation. The same grouping is used by the panel home so both read identically. */
export function NavegacionPanel({cuenta}:{cuenta?:ReactNode}) {
  const ruta = usePathname();
  const t = useTranslations('Panel');
  const m = useTranslations('Analitica');
  const soporte=useTranslations('SoportePanel');
  const preview=useTranslations('PropuestaPedidos');
  const modulos=useTranslations('PropuestaPanel');
  const nav=useRef<HTMLElement>(null);
  useEffect(()=>{const barra=nav.current,activo=barra?.querySelector<HTMLElement>('[aria-current=page]');if(barra&&activo&&barra.scrollWidth>barra.clientWidth)barra.scrollLeft=Math.max(0,activo.offsetLeft-barra.offsetLeft-barra.clientWidth/2+activo.clientWidth/2);},[ruta]);
  const texto=(href:string)=>({'/panel':modulos('inicio'),'/panel/catalogo':t('productos'),'/panel/proveedores':t('proveedores'),'/panel/contenido':modulos('contenido'),'/panel/pedidos':t('pedidos'),'/panel/soporte':soporte('titulo'),'/panel/usuarios':t('usuarios'),'/panel/estadisticas':m('tituloPanel')} as Record<string,string>)[href];
  const actual=(href:string)=>ruta===href||href!=='/panel'&&ruta.startsWith(href+'/');
  return <header className="pedidos-reales-nav"><Link href="/panel" aria-label={t('inicioPanel')}><Image src="/imagenes/logo-principal.png" alt={preview('logo')} loading="eager" width={150} height={63}/></Link><nav ref={nav} aria-label={modulos('navegacion')}>{grupos.map(grupo=><div className="panel-nav-grupo" key={grupo.clave||'inicio'} role={grupo.clave?'group':undefined} aria-labelledby={grupo.clave?`panel-nav-${grupo.clave}`:undefined}>{grupo.clave&&<span className="panel-nav-titulo" id={`panel-nav-${grupo.clave}`}>{t(grupo.clave)}</span>}{grupo.enlaces.map(({href,Icono})=><Link key={href} href={href} aria-current={actual(href)?'page':undefined}><Icono size={18} aria-hidden="true"/><span>{texto(href)}</span></Link>)}</div>)}</nav><div className="panel-nav-pie"><Link href="/" className="panel-nav-volver"><ArrowLeft size={15} aria-hidden="true"/>{preview('volverSitio')}</Link>{cuenta}</div></header>;
}
