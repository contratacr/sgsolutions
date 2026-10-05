'use client';
import {useId,useState,type FormEvent} from 'react';
import {useFormStatus} from 'react-dom';
import {useLocale,useTranslations} from 'next-intl';
import {Plus,Trash2,Link as LinkIcon,Search} from 'lucide-react';
import {colones,traducir,type CatalogoPublico} from '@/lib/catalogo-modelo';
import {prepararPedidoAsesorado} from '@/app/panel/pedidos/asesoria-acciones';
type Producto=CatalogoPublico['productos'][number]&{publicado?:boolean};
function Generar({disabled}:{disabled:boolean}){
 const {pending}=useFormStatus(),t=useTranslations('AsesoriaAdmin');
 return <button className="boton boton-azul" disabled={disabled||pending}><LinkIcon size={18} aria-hidden="true"/>{t(pending?'generando':'preparar')}</button>;
}
export function PrepararAsesoria({id,articulos,productos}:{id:string;articulos:{producto:Producto;cantidad:number}[];productos:Producto[]}){
 const t=useTranslations('AsesoriaAdmin'),l=useLocale(),identificador=useId();
 const [filas,setFilas]=useState(articulos.map(x=>({id:x.producto.id,cantidad:x.cantidad,precio:x.producto.precio??0})));
 const [busqueda,setBusqueda]=useState(''),[error,setError]=useState(''),[confirmado,setConfirmado]=useState(false);
 const disponibles=productos.filter(p=>!filas.some(f=>f.id===p.id)&&`${traducir(p.nombre,l)} ${p.marca} ${p.codigoFabricante}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));
 const total=filas.reduce((s,x)=>s+x.precio*x.cantidad,0);
 function validar(e:FormEvent<HTMLFormElement>){
  setError('');const confirmado=new FormData(e.currentTarget).get('confirmado')==='on';
  if(!filas.length||filas.some(x=>!Number.isInteger(x.cantidad)||x.cantidad<1||x.cantidad>99||!Number.isSafeInteger(x.precio)||x.precio<1||x.precio>100000000)||total>100000000||!confirmado){e.preventDefault();setError(confirmado?'datosInvalidos':'faltaConfirmar');}
 }
 return <form action={prepararPedidoAsesorado} onSubmit={validar} noValidate className="asesoria-admin-form">
  <input type="hidden" name="id" value={id}/>
  <div className="asesoria-editor-paso"><h3>{t('productosPedido')}</h3><p>{t('editarAyuda')}</p></div>
  {!filas.length&&<p className="admin-lista-vacia">{t('sinProductos')}</p>}
  {filas.map((x,i)=>{const p=productos.find(p=>p.id===x.id)??articulos.find(a=>a.producto.id===x.id)?.producto;return <div className="asesoria-admin-linea" key={x.id}>
   <input type="hidden" name="producto" value={x.id}/>
   <div className="asesoria-producto-identidad"><strong>{p?traducir(p.nombre,l):x.id}</strong><small>{p?.codigoFabricante}</small></div>
   <div className="asesoria-producto-campos"><label>{t('cantidad')}<input type="number" name="cantidad" min="1" max="99" required value={x.cantidad||''} onChange={e=>{setConfirmado(false);setFilas(f=>f.map((v,j)=>j===i?{...v,cantidad:Number(e.target.value)}:v));}}/></label><label>{t('precio')}<input type="number" name="precio" min="1" max="100000000" step="1" required value={x.precio||''} onChange={e=>{setConfirmado(false);setFilas(f=>f.map((v,j)=>j===i?{...v,precio:Number(e.target.value)}:v));}}/></label></div>
   <div className="asesoria-linea-total"><span>{colones(x.precio*x.cantidad)}</span><button type="button" className="boton boton-contorno" onClick={()=>{setConfirmado(false);setFilas(f=>f.filter((_,j)=>i!==j));}}><Trash2 size={16} aria-hidden="true"/>{t('quitar')}<span className="sr-only"> {p?traducir(p.nombre,l):x.id}</span></button></div>
  </div>})}
  <div className="asesoria-admin-agregar"><label htmlFor={identificador}>{t('producto')}</label><div className="panel-buscador"><Search size={18} aria-hidden="true"/><input id={identificador} type="search" value={busqueda} placeholder={t('buscarProducto')} onChange={e=>setBusqueda(e.target.value)}/></div><p className="panel-ayuda">{t('catalogoPrivado')}</p>
  {busqueda.trim()&&<><p role="status" className="panel-ayuda">{t('coincidencias',{cantidad:disponibles.length})}{disponibles.length>8&&` · ${t('refinarBusqueda')}`}</p><ul className="asesoria-busqueda-resultados">{disponibles.slice(0,8).map(p=><li key={p.id}><div><strong>{traducir(p.nombre,l)}</strong><small>{p.codigoFabricante} · {p.publicado===false?t('privado'):t('publico')}</small></div><button type="button" className="boton boton-contorno" disabled={filas.length>=30} onClick={()=>{setConfirmado(false);setFilas(f=>[...f,{id:p.id,cantidad:1,precio:p.precio??0}]);setBusqueda('');setError('');}}><Plus size={16} aria-hidden="true"/>{t('agregar')}<span className="sr-only"> {traducir(p.nombre,l)}</span></button></li>)}</ul></>}
  </div>
  {!!filas.length&&<><div className="asesoria-total"><span>{t('totalProductos')}</span><strong>{colones(total)}</strong></div><p className="panel-ayuda">{t('totalAyuda')}</p><label className="asesoria-admin-confirmar"><input type="checkbox" name="confirmado" required checked={confirmado} onChange={e=>setConfirmado(e.target.checked)}/>{t('confirmar')}</label></>}
  {error&&<p role="alert" className="panel-error">{t(error)}</p>}
  <Generar disabled={!filas.length}/><p className="panel-ayuda">{t('vence')}</p>
 </form>;
}
