import {redirect} from 'next/navigation';
import {leerCatalogoPublico} from '@/lib/catalogo-servidor';
import {traducir} from '@/lib/catalogo-modelo';
import {getLocale,getTranslations} from 'next-intl/server';
import {sesionLocal} from '@/lib/admin-local';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {resumenAnalitica} from '@/lib/analitica-servidor';
export default async function Estadisticas(){
 const local=await sesionLocal();if(!local){const db=await crearClienteServidor();if(!db)redirect('/admin');const {data:{user}}=await db.auth.getUser();if(!user)redirect('/admin');const {data}=await db.from('perfiles').select('rol,activo').eq('id',user.id).maybeSingle();if(!data?.activo||data.rol!=='administrador')redirect('/panel');}
 const t=await getTranslations('Analitica'),resumen=await resumenAnalitica();
 const idioma=await getLocale(),catalogo=await leerCatalogoPublico(),planes=await getTranslations('Inicio');
 const nombre=(tipo:string,detalle:string)=>['producto','busqueda_producto','carrito'].includes(tipo)?traducir(catalogo.productos.find(p=>p.id===detalle)?.nombre??{es:detalle,en:detalle},idioma):['plan','plan_revisado'].includes(tipo)&&['1','2','3'].includes(detalle)?planes(`plan${Number(detalle)-1}Nombre`):detalle;
 const pixel=/^\d{5,25}$/.test(process.env.NEXT_PUBLIC_META_PIXEL_ID||'');
 return <main id="contenido" className="contenedor seccion"><h1>{t('tituloPanel')}</h1><p>{t('periodo')}</p><p className="admin-guia">{t('limitacion')}</p><p>{t(pixel?'pixelListo':'pixelPendiente')}</p>{!resumen?<p role="status">{t('configurar')}</p>:<><div className="metricas-resumen"><article><strong>{resumen.sesiones}</strong><span>{t('sesiones')}</span></article><article><strong>{resumen.filas.filter(f=>f.tipo==='pagina').reduce((s,f)=>s+f.cantidad,0)}</strong><span>{t('pagina')}</span></article><article><strong>{resumen.filas.filter(f=>f.tipo==='whatsapp').reduce((s,f)=>s+f.cantidad,0)}</strong><span>{t('whatsapp')}</span></article></div>{!resumen.total?<p>{t('vacio')}</p>:<div className="metricas-grid">{['pagina','producto','busqueda_producto','carrito','plan','whatsapp','correo','telefono','mapa','red_social','galeria','pedido_revisado','plan_revisado','scroll','campana'].filter(tipo=>resumen.filas.some(f=>f.tipo===tipo)).map(tipo=><section key={tipo}><h2>{t(tipo)}</h2><ol>{resumen.filas.filter(f=>f.tipo===tipo).slice(0,20).map(f=><li key={f.detalle}><span>{nombre(tipo,f.detalle)||t('general')}</span><strong>{f.cantidad}</strong></li>)}</ol>{!resumen.filas.some(f=>f.tipo===tipo)&&<p>{t('sinDatos')}</p>}</section>)}</div>}</>}</main>;
}
