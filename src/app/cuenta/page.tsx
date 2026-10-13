import {retornoCompra} from '@/lib/retorno-compra';
import {redirect} from 'next/navigation';
import {DatosCuenta} from './datos';
import {PanelCuenta} from './panel-cuenta';
import {SeguridadCuenta} from './seguridad';
import {leerPerfilCompra} from '@/lib/perfil-compra-servidor';
import {solicitudCuenta} from '@/lib/cuenta-errores';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { crearClienteCuenta } from '@/lib/supabase/cuenta';
import { numeroPedido } from '@/lib/pedidos-manuales';
import { colones } from '@/lib/catalogo-modelo';
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

export default async function CuentaCliente({ searchParams }: { searchParams: Promise<{ error?: string; clave?: string; seccion?:string; desactivada?:string;retorno?:string;modo?:string }> }) {
  const t = await getTranslations('CuentaCliente');
  const idioma = await getLocale();
  const { error, clave, seccion, desactivada,retorno,modo } = await searchParams;
  const cliente = await crearClienteCuenta();
  const sesion=cliente?await solicitudCuenta(()=>cliente.auth.getUser()):null;
  const user=sesion&&'data' in sesion?sesion.data.user:null;
  const habilitada=user&&cliente?await solicitudCuenta(()=>cliente.rpc('cuenta_habilitada')):null;
  const bloqueada=habilitada&&'data' in habilitada&&habilitada.data===false;
  const confirmado = Boolean(user?.email && user.email_confirmed_at&&!bloqueada);
  const destinoCompra=retornoCompra(retorno);
  if(confirmado&&destinoCompra)redirect(destinoCompra);
  const permisoAdmin=confirmado&&cliente?await solicitudCuenta(()=>cliente.rpc('es_administrador_activo')):null;
  const administrador=permisoAdmin&&'data' in permisoAdmin&&permisoAdmin.data===true;
  const seguridad=await getTranslations('SeguridadCuenta');
  const proveedores=confirmado?{google:false,facebook:false}:await proveedoresCuenta();
  let pedidos: PedidoCuenta[] = [];
  let errorPedidos = false;
  if (cliente && confirmado) {
    const respuesta = await cliente.rpc('mis_pedidos');
    errorPedidos = Boolean(respuesta.error);
    pedidos = (respuesta.data ?? []) as PedidoCuenta[];
  }
  const perfilCompra=confirmado?await leerPerfilCompra():null;
  return <main id="contenido" className={`contenedor seccion cuenta-pagina${confirmado?'':' cuenta-entrada'}`}>
    {confirmado?<div className="cuenta-intro"><p className="cuenta-saludo">{t('saludo',{nombre:perfilCompra?.datos.nombre||(user?.user_metadata?.nombre_completo||user?.user_metadata?.full_name)?.split(' ')[0]||t('saludoCliente')})}</p><h1>{t('titulo')}</h1></div>:<h1 className="sr-only">{t('titulo')}</h1>}
    {!confirmado ? <section className="cuenta-bloque" aria-labelledby="cuenta-acceso">
      <h2 id="cuenta-acceso" className="sr-only">{t('opcionesAcceso')}</h2>
      {desactivada==='si'&&<p className="cuenta-aviso" role="status">{seguridad('desactivada')}</p>}
      {bloqueada&&<p className="cuenta-aviso cuenta-error" role="alert">{t('cuentaBloqueada')}</p>}
      {error && <p className="cuenta-aviso cuenta-error" role="alert">{t(error==='bloqueada'?'cuentaBloqueada':error==='configuracion'?'noDisponible':error==='conexion'?'conexion':error==='cancelado'?'googleCancelado':error==='oauth'?'googleVencido':'enlaceInvalido')}</p>}
      <FormularioCuenta proveedores={proveedores} retorno={destinoCompra??undefined} inicial={modo==='registro'?'registro':'login'}/>
    </section> : <>
      {clave === 'actualizada' && <p className="cuenta-aviso" role="status">{t('claveActualizada')}</p>}
      <PanelCuenta administrador={Boolean(administrador)} seccion={seccion} seguridad={<SeguridadCuenta correo={user!.email!} administrador={Boolean(administrador)}/>} datos={perfilCompra&&<DatosCuenta datos={perfilCompra.datos} error={perfilCompra.error}/>} compras={
      <section className="cuenta-pedidos" aria-labelledby="cuenta-pedidos-titulo">
        <div className="cuenta-pedidos-titulo"><h2 id="cuenta-pedidos-titulo">{t('pedidos')}</h2><span>{pedidos.length}</span></div>
        {errorPedidos ? <p role="alert">{t('pedidosError')}</p> : pedidos.length === 0 ? <div className="cuenta-bloque"><p>{t('sinPedidos')}</p><Link className="boton boton-azul" href="/tienda">{t('verTienda')}</Link></div> : <ol className="cuenta-lista">{pedidos.map(pedido => <li className="cuenta-pedido" key={`${pedido.origen}-${pedido.id}`}>
          <div className="cuenta-pedido-cabecera"><div><strong>{numeroPedido(pedido.id)}</strong><span>{new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', { dateStyle: 'medium', timeZone: 'America/Costa_Rica' }).format(new Date(pedido.creado_en))}</span></div><span className="cuenta-estado">{t(`estado_${pedido.estado}` as 'estado_pagado')}</span></div>
          <ul>{pedido.articulos?.map((articulo, indice) => <li key={indice}>{articulo.cantidad ?? 1} × {articulo.nombre ?? t('producto')}</li>)}</ul>
          <div className="cuenta-pedido-pie"><span>{pedido.origen === 'tarjeta' ? t('tarjeta') : t('pagoManual')}</span><strong>{pedido.total == null ? t('totalPendiente') : colones(Number(pedido.total))}</strong></div>
        </li>)}</ol>}
      </section>}/>
    </>}
  </main>;
}
