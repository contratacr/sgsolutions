'use client';
import {useTranslations} from 'next-intl';

export default function CargandoCompra(){
  const t=useTranslations('Carrito');
  return <main id="contenido" className="contenedor compra-pagina" aria-busy="true">
    <p role="status">{t('abriendoCompra')}</p>
    <div aria-hidden="true">
      <div className="esqueleto esqueleto-titulo"/>
      <div className="esqueleto esqueleto-buscador"/>
      <div className="esqueleto esqueleto-buscador"/>
      <div className="esqueleto esqueleto-buscador"/>
    </div>
  </main>;
}
