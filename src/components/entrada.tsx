import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const destinos = [
  { clave: 'tienda', href: '/tienda', foto: '/imagenes/gamer.webp' },
  { clave: 'soporte', href: '/soporte', foto: '/imagenes/oficina.webp' },
  { clave: 'empresas', href: '/empresas', foto: '/imagenes/casos/eco-mini-market-instalacion.webp' },
] as const;

export function Entrada() {
  const t = useTranslations('Entrada');
  const n = useTranslations('Navegacion');

  return <section className="inicio-triptico inicio-portada inicio-caminos" aria-labelledby="entrada-titulo">
    <h1 id="entrada-titulo" className="sr-only">{t('tripticoTitulo')}</h1>
    <nav className="inicio-triptico-paneles inicio-caminos-grid" aria-label={t('menu')}>
      {destinos.map(({clave,href,foto},indice)=><Link key={clave} href={href} className={`inicio-camino inicio-camino-${clave} inicio-triptico-panel`}>
        <Image src={foto} alt="" fill sizes="(max-width: 700px) 100vw, 40vw" loading="eager" fetchPriority={indice===2?'high':'auto'}/>
        <span className="inicio-triptico-sombra" aria-hidden="true"/>
        <span className="inicio-triptico-contenido"><strong>{n(clave)}</strong></span>
      </Link>)}
    </nav>
  </section>;
}
