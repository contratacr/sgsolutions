'use client';
import {useFavoritos} from '@/lib/favoritos';
import {useCatalogo} from './datos-catalogo';
import {TarjetaProducto} from './tarjeta-producto';
import {useLocale,useTranslations} from 'next-intl';
import {traducir,type CatalogoPublico} from '@/lib/catalogo-modelo';
import Link from 'next/link';
import {useEffect,useState} from 'react';
export function FavoritosCuenta(){
 const favoritos=useFavoritos(),catalogo=useCatalogo(),idioma=useLocale(),t=useTranslations('AccionesProducto'),tienda=useTranslations('Tienda');
 const ids=favoritos.ids.join(','),recordar=catalogo.recordar;
 const [respuesta,setRespuesta]=useState<{clave:string;productos:CatalogoPublico['productos']}>({clave:'',productos:[]});
 const [error,setError]=useState(''),[intento,setIntento]=useState(0);
 useEffect(()=>{
  if(!ids)return;
  const abort=new AbortController(),lista=ids.split(',');
  Promise.all(Array.from({length:Math.ceil(lista.length/30)},(_,i)=>fetch('/api/catalogo?ids='+encodeURIComponent(lista.slice(i*30,(i+1)*30).join(',')),{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json();})))
   .then(datos=>{if(abort.signal.aborted)return;const productos=datos.flatMap(d=>d.productos);recordar(productos);setRespuesta({clave:ids,productos});setError('');})
   .catch(()=>{if(!abort.signal.aborted)setError(ids);});
  return()=>abort.abort();
 },[ids,recordar,intento]);
 const disponibles=respuesta.clave===ids?respuesta.productos:catalogo.productos;
 const productos=favoritos.ids.flatMap(id=>{const p=disponibles.find(p=>p.id===id);return p?[p]:[];});
 const cargando=!favoritos.listo||Boolean(ids&&respuesta.clave!==ids&&productos.length===0&&error!==ids);
 return <section className="tienda-compacta favoritos-seccion"><h2>{t('favoritos')}</h2>
  {favoritos.error&&<p role="status">{t('sinSincronizar')}</p>}
  {error===ids&&ids&&<p role="alert">{tienda('errorCarga')} <button type="button" onClick={()=>setIntento(i=>i+1)}>{tienda('reintentar')}</button></p>}
  {cargando?<p role="status">{t('cargando')}</p>:productos.length===0?(!error||error!==ids)&&<p>{t('sinFavoritos')}</p>:<div className="shop-grid favoritos-grid">{productos.map(p=><TarjetaProducto key={p.id} producto={p} favorito cambiarFavorito={()=>favoritos.cambiar(p.id)} listo={favoritos.listo} categoria={traducir(catalogo.categorias.find(c=>c.id===p.categoria)?.nombre??{es:'',en:''},idioma)}/>)}</div>}
  <Link href="/tienda">{t('verTienda')}</Link>
 </section>;
}
