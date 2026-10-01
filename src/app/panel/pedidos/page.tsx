import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { sesionLocal } from '@/lib/admin-local';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { basePedidosAdministracion } from '@/lib/tilopay';
import { colones } from '@/lib/catalogo-modelo';

type Pedido = {
  id: string;
  creado_en: string;
  estado: 'iniciado' | 'pendiente' | 'pagado' | 'rechazado' | 'error';
  entorno: 'pruebas' | 'produccion';
  total: number;
  cliente: { nombre?: string; apellidos?: string; correo?: string };
  articulos: { nombre?: string; cantidad?: number }[];
};

export default async function Pedidos() {
  const local = await sesionLocal();
  if (!local) {
    const cliente = await crearClienteServidor();
    if (!cliente) redirect('/admin');
    const { data: { user } } = await cliente.auth.getUser();
    if (!user) redirect('/admin');
    const { data: perfil } = await cliente.from('perfiles').select('rol,activo').eq('id', user.id).maybeSingle();
    if (!perfil?.activo || perfil.rol !== 'administrador') redirect('/panel');
  }
  const t = await getTranslations('PedidosAdmin');
  const idioma = await getLocale();
  const db = basePedidosAdministracion();
  const { data, error } = db
    ? await db.from('pedidos_tilopay').select('id,creado_en,estado,entorno,total,cliente,articulos').order('creado_en', { ascending: false }).limit(50)
    : { data: null, error: null };
  const pedidos = (data ?? []) as Pedido[];
  return <main id="contenido" className="contenedor seccion">
    <p className="etiqueta">{t('etiqueta')}</p>
    <h1>{t('titulo')}</h1>
    <p className="admin-guia">{t('descripcion')}</p>
    {!db || error ? <p role="status">{t('configurar')}</p> : !pedidos.length ? <p>{t('vacio')}</p> :
      <div className="pedidos-admin-lista">
        {pedidos.map(pedido => <article className="pedidos-admin-tarjeta" key={pedido.id}>
          <div className="pedidos-admin-encabezado">
            <div><strong>{pedido.cliente?.nombre} {pedido.cliente?.apellidos}</strong><small>{pedido.cliente?.correo}</small></div>
            <span className="pedidos-admin-estado">{t(pedido.estado)}</span>
          </div>
          <p>{new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-CR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Costa_Rica' }).format(new Date(pedido.creado_en))} · {t(pedido.entorno)}</p>
          <ul>{pedido.articulos?.map((item, index) => <li key={index}>{item.cantidad} × {item.nombre}</li>)}</ul>
          <div className="pedidos-admin-pie"><code>{pedido.id}</code><strong>{colones(pedido.total)}</strong></div>
        </article>)}
      </div>}
  </main>;
}
