import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { crearClienteCuenta } from '@/lib/supabase/cuenta';
import { numeroPedido } from '@/lib/pedidos-manuales';
import { colones } from '@/lib/catalogo-modelo';
import { cerrarSesionCliente } from './acciones';
import { FormularioCuenta } from './formulario';
import {proveedoresCuenta} from '@/lib/supabase/proveedores-cuenta';
import './cuenta.css';

type PedidoCuenta = {
  id: string;
  origen: 'manual' | 'tarjeta';
  creado_en: string;
  estado: string;
  total: number | null;
  articulos: { nombre?: string; cantidad?: number }[] | null;
};

export async function generateMetadata() {
  const t = await getTranslations('CuentaCliente');
  return { title: t('titulo'), description: t('descripcion'), robots: { index: false, follow: false } };
}

export default async function CuentaCliente({ searchParams }: { searchParams: Promise<{ error?: string; clave?: string }> }) {
  const t = await getTranslations('CuentaCliente');
  const marca = await getTranslations('Marca');
  const idioma = await getLocale();
  const { error, clave } = await searchParams;
  const cliente = await crearClienteCuenta();
  const { data: { user } } = cliente ? await cliente.auth.getUser() : { data: { user: null } };
  const confirmado = Boolean(user?.email && user.email_confirmed_at);
  const proveedores=confirmado?{google:false,facebook:false}:await proveedoresCuenta();
  let pedidos: PedidoCuenta[] = [];
  let errorPedidos = false;
  if (cliente && confirmado) {
    const respuesta = await cliente.rpc('mis_pedidos');
    errorPedidos = Boolean(respuesta.error);
    pedidos = (respuesta.data ?? []) as PedidoCuenta[];
  }
  return <main id="contenido" className={`contenedor seccion cuenta-pagina${confirmado?'':' cuenta-entrada'}`}>
    {confirmado?<div className="cuenta-intro"><p className="etiqueta">{marca('nombre')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p></div>:<h1 className="sr-only">{t('titulo')}</h1>}
    {!confirmado ? <section className="cuenta-bloque" aria-labelledby="cuenta-acceso">
      <h2 id="cuenta-acceso" className="sr-only">{t('opcionesAcceso')}</h2>
      {error && <p className="cuenta-aviso cuenta-error" role="alert">{t('enlaceInvalido')}</p>}
      <FormularioCuenta proveedores={proveedores}/>
    </section> : <>
      {clave === 'actualizada' && <p className="cuenta-aviso" role="status">{t('claveActualizada')}</p>}
      <section className="cuenta-bloque cuenta-perfil" aria-label={t('perfil')}>
        <div>{typeof user?.user_metadata.nombre_completo === 'string' && <strong>{user.user_metadata.nombre_completo}</strong>}<span>{t('correo')}</span><strong>{user?.email}</strong></div>
        <form action={cerrarSesionCliente}><button className="boton boton-contorno">{t('salir')}</button></form>
      </section>
      <section className="cuenta-pedidos" aria-labelledby="cuenta-pedidos-titulo">
        <div className="cuenta-pedidos-titulo"><h2 id="cuenta-pedidos-titulo">{t('pedidos')}</h2><span>{pedidos.length}</span></div>
        {errorPedidos ? <p role="alert">{t('pedidosError')}</p> : pedidos.length === 0 ? <div className="cuenta-bloque"><p>{t('sinPedidos')}</p><Link className="boton boton-azul" href="/tienda">{t('verTienda')}</Link></div> : <ol className="cuenta-lista">{pedidos.map(pedido => <li className="cuenta-pedido" key={`${pedido.origen}-${pedido.id}`}>
          <div className="cuenta-pedido-cabecera"><div><strong>{numeroPedido(pedido.id)}</strong><span>{new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', { dateStyle: 'medium', timeZone: 'America/Costa_Rica' }).format(new Date(pedido.creado_en))}</span></div><span className="cuenta-estado">{t(`estado_${pedido.estado}` as 'estado_pagado')}</span></div>
          <ul>{pedido.articulos?.map((articulo, indice) => <li key={indice}>{articulo.cantidad ?? 1} × {articulo.nombre ?? t('producto')}</li>)}</ul>
          <div className="cuenta-pedido-pie"><span>{pedido.origen === 'tarjeta' ? t('tarjeta') : t('pagoManual')}</span><strong>{pedido.total == null ? t('totalPendiente') : colones(Number(pedido.total))}</strong></div>
        </li>)}</ol>}
      </section>
    </>}
  </main>;
}
