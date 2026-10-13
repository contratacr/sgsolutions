'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter,usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import { useTranslations } from 'next-intl';

const destinos = [
  { clave: 'tienda', href: '/tienda', foto: '/imagenes/gamer.webp' },
  { clave: 'soporte', href: '/soporte', foto: '/imagenes/oficina.webp' },
  { clave: 'empresas', href: '/empresas', foto: '/imagenes/casos/eco-mini-market-instalacion.webp' },
] as const;

export function Entrada() {
  const router=useRouter();
  const ruta=usePathname();
  const [navegando,setNavegando]=useState<string|null>(null);
  const pendiente=useRef(false);
  const temporizador=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    const restablecer=()=>{pendiente.current=false;setNavegando(null);};
    const frame=requestAnimationFrame(restablecer);
    window.addEventListener('pageshow',restablecer);
    return ()=>{cancelAnimationFrame(frame);if(temporizador.current)clearTimeout(temporizador.current);window.removeEventListener('pageshow',restablecer);};
  },[ruta]);
  const t = useTranslations('Entrada');
  const n = useTranslations('Navegacion');

  return <section className="inicio-triptico inicio-portada inicio-caminos" aria-labelledby="entrada-titulo">
    <h1 id="entrada-titulo" className="sr-only">{t('tripticoTitulo')}</h1>
    <nav className="inicio-triptico-paneles inicio-caminos-grid" aria-label={t('menu')} data-navegando={navegando?'true':undefined}>
      {destinos.map(({clave,href,foto},indice)=><Link key={clave} href={href} prefetch={true} data-navegando={navegando===clave?'true':undefined} onNavigate={evento=>{
        if(!window.matchMedia('(max-width:700px), (hover:none)').matches||window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
        evento.preventDefault();
        if(pendiente.current)return;
        pendiente.current=true;setNavegando(clave);
        temporizador.current=setTimeout(()=>router.push(href,{scroll:true}),900);
      }} className={`inicio-camino inicio-camino-${clave} inicio-triptico-panel`}>
        <Image src={foto} alt="" fill sizes="(max-width: 700px) 100vw, 40vw" loading="eager" fetchPriority={indice===2?'high':'auto'}/>
        <span className="inicio-triptico-sombra" aria-hidden="true"/>
        <span className="inicio-triptico-contenido"><strong>{n(clave)}</strong><ArrowUpRight className="inicio-toque-flecha" size={26} aria-hidden="true"/></span>
      </Link>)}
    </nav>
  </section>;
}
