'use client';
import Image from 'next/image';
import {buscarFotoProducto} from '@/app/panel/catalogo/importar/fotos';
import {useEffect,useRef,useState,useTransition} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {importarArchivo} from '@/app/panel/catalogo/importar/acciones';
import {colones,traducir,type CatalogoAdmin} from '@/lib/catalogo-modelo';
type Preview=NonNullable<Awaited<ReturnType<typeof importarArchivo>>['preview']>;
export function ImportadorIntcomex({categorias,fecha,modoInicial='catalogo',seleccion}:{categorias:CatalogoAdmin['categorias'];fecha?:string;modoInicial?:'catalogo'|'inventario';seleccion:{total:number;encontrados:number;pendientes:string[]}}){
 const t=useTranslations('AdminImportacion'),idioma=useLocale(),router=useRouter();
 const [archivo,setArchivo]=useState<File|null>(null),[moneda,setMoneda]=useState(''),[categoria,setCategoria]=useState(categorias[0].id);
 const [soloSeleccion,setSoloSeleccion]=useState(true);
 const inventario=modoInicial==='inventario';
 const busqueda=useRef(0);
 useEffect(()=>()=>{busqueda.current++;},[]);
 const [fotos,setFotos]=useState<Record<string,{src:string;fuente:string}>>({}),[progreso,setProgreso]=useState({hechas:0,total:0});
 const [preview,setPreview]=useState<Preview>(),[estado,setEstado]=useState(''),[fila,setFila]=useState(0),[ocupado,iniciar]=useTransition(),[pagina,setPagina]=useState(0);
 function limpiar(){busqueda.current++;setFotos({});setProgreso({hechas:0,total:0});setPreview(undefined);setEstado('');setPagina(0);}
 async function buscarFotos(v:Preview){
  const turno=++busqueda.current;setFotos({});const pendientes=v.cambios.filter(c=>c.sinFoto);setProgreso({hechas:0,total:pendientes.length});
  for(const c of pendientes){
   if(busqueda.current!==turno)return;
   const foto=await buscarFotoProducto({sku:c.sku,mpn:c.mpn}).catch(()=>null);
   if(busqueda.current!==turno)return;
   if(foto)setFotos(prev=>({...prev,[c.sku]:foto}));
   setProgreso(prev=>({...prev,hechas:prev.hechas+1}));
  }
 }
 function ejecutar(aplicar=false){iniciar(async()=>{
  if(aplicar)busqueda.current++;setEstado('');try{const form=new FormData();if(archivo)form.set('archivo',archivo);form.set('modo',modoInicial);form.set('seleccion',soloSeleccion?'seleccion':'todos');form.set('moneda',moneda);form.set('categoria',categoria);form.set('fotos',JSON.stringify(Object.fromEntries(Object.entries(fotos).map(([sku,f])=>[sku,f.src]))));
  const r=await importarArchivo(form,aplicar?preview?.revision:undefined);
  if(r.error){setEstado(r.error);setFila(r.fila??0);if(r.error==='conflicto')setPreview(undefined);}
  else if(r.preview){setPreview(r.preview);setPagina(0);if(!inventario)void buscarFotos(r.preview);}
  else{setPreview(undefined);setEstado('guardado');router.refresh();}
  }catch{setEstado('error');}
 });}
 return <section className="admin-editor admin-importacion">
  <p>{t(inventario?'descripcionInventario':'descripcion')}</p><aside className="admin-guia"><strong>{t('seleccionResumen',{total:seleccion.total,encontrados:seleccion.encontrados,pendientes:seleccion.pendientes.length})}</strong>{seleccion.pendientes.length>0&&<details><summary>{t('verPendientes')}</summary><p style={{overflowWrap:'anywhere'}}>{seleccion.pendientes.join(' · ')}</p></details>}</aside><p>{fecha?t('ultima',{fecha:new Intl.DateTimeFormat(idioma==='es'?'es-CR':'en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(new Date(fecha))}):t('sinFecha')}</p>
  <p className="admin-formula">{t('frecuencia')}</p>
  <fieldset disabled={ocupado} className="admin-importar-campos"><legend>{t('seleccionar')}</legend>
   <label>{t('archivoLabel')}<input type="file" accept=".xlsx" onChange={e=>{setArchivo(e.target.files?.[0]??null);limpiar();}}/></label>
   {!inventario&&<><label>{t('monedaLabel')}<select value={moneda} onChange={e=>{setMoneda(e.target.value);limpiar();}}><option value="">{t('elegirMoneda')}</option><option value="USD">{t('usd')}</option><option value="CRC">{t('crc')}</option></select></label>
   <label>{t('categoriaLabel')}<select value={categoria} onChange={e=>{setCategoria(e.target.value);limpiar();}}>{categorias.map(c=><option key={c.id} value={c.id}>{traducir(c.nombre,idioma)}</option>)}</select></label></>}
   <label className="admin-check"><input type="checkbox" checked={soloSeleccion} onChange={e=>{setSoloSeleccion(e.target.checked);limpiar();}}/>{t('soloSeleccion',{total:seleccion.total})}</label>
   <button type="button" className="boton boton-azul" disabled={!archivo||(!inventario&&!moneda)} onClick={()=>ejecutar()}>{t(ocupado?'procesando':'previsualizar')}</button>
  </fieldset>
  <p role="status">{estado&&t(estado,{fila})}</p>
  {preview&&<section aria-label={t('vistaPrevia')}>
   <h2>{t('vistaPrevia')}</h2>{!inventario&&<><p role="status">{t(progreso.hechas<progreso.total?'buscandoFotos':'fotosListas',{hechas:progreso.hechas,total:progreso.total,encontradas:Object.keys(fotos).length})}</p><p>{t('fotosNota')}</p></>}<p>{t(inventario?'resumenInventario':'resumen',{...preview.informe})}</p><p>{t(inventario?'reglasInventario':'reglas')}</p>{inventario&&<p>{t('omitidos',{cantidad:preview.omitidos})}</p>}
   <div className="admin-importar-tabla"><table><caption>{t('detalle')}</caption><thead><tr>{(inventario?['producto','stockLabel','venta']:['producto','fotoLabel','costo','stockLabel','venta']).map(k=><th key={k} scope="col">{t(k)}</th>)}</tr></thead><tbody>{preview.cambios.slice(pagina*20,(pagina+1)*20).map(c=><tr key={c.sku}><td><strong>{c.sku}</strong><br/>{c.nombre}{c.nuevo&&<p>{t('borrador')}</p>}</td>{!inventario&&<><td>{fotos[c.sku]?<><Image src={fotos[c.sku].src} alt={c.nombre} width={100} height={100} unoptimized style={{objectFit:'contain'}}/><a href={fotos[c.sku].fuente} target="_blank" rel="noopener noreferrer" aria-label={t('fuenteAccesible')}>{t('fuente')}</a><button type="button" disabled={ocupado} onClick={()=>setFotos(prev=>{const copia={...prev};delete copia[c.sku];return copia;})}>{t('descartarFoto')}</button></>:t(c.sinFoto?'fotoPendiente':'fotoConservada')}</td><td>{c.costoAntes!==null&&<span>{c.costoAntes} {c.monedaAntes} → </span>}{c.costo} {moneda}</td></>}<td>{c.stock===null?t('consultar'):c.exacto?c.stock:t('alMenos',{cantidad:c.stock})}</td><td>{c.precio===null?t('revision'):colones(c.precio)}{c.manual&&<p>{t('manual')}</p>}{c.revision&&<p>{t('alertaPrecio')}</p>}</td></tr>)}</tbody></table></div>
   <div className="admin-importar-acciones"><button type="button" className="boton boton-contorno" disabled={pagina===0||ocupado} onClick={()=>setPagina(pagina-1)}>{t('anterior')}</button><span>{pagina+1} / {Math.ceil(preview.cambios.length/20)}</span><button type="button" className="boton boton-contorno" disabled={(pagina+1)*20>=preview.cambios.length||ocupado} onClick={()=>setPagina(pagina+1)}>{t('siguiente')}</button></div>
   <div className="admin-importar-acciones"><button type="button" className="boton boton-azul" disabled={ocupado} onClick={()=>ejecutar(true)}>{t(ocupado?'procesando':'confirmar')}</button><button type="button" className="boton boton-contorno" disabled={ocupado} onClick={limpiar}>{t('cancelar')}</button></div>
  </section>}
 </section>;
}
