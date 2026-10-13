type ProductoConRuta = {id:string; slug?:string; nombre:{es:string}; codigoFabricante?:string; marca?:string};
export function normalizarRutaProducto(texto:string) {
 return texto.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function recortar(texto:string,limite:number) {
 if(texto.length<=limite)return texto;
 return texto.slice(0,limite).replace(/-[^-]*$/,'').replace(/-+$/,'') || texto.slice(0,limite);
}
function baseRuta(p:ProductoConRuta) {
 const nombre=normalizarRutaProducto(p.nombre.es);
 const modelo=normalizarRutaProducto(p.codigoFabricante??'');
 const titulo=nombre.split('-').slice(0,7).join('-');
 if(modelo&&nombre.includes(modelo)&&nombre.length<=90)return nombre;
 if(modelo)return [recortar(titulo||normalizarRutaProducto(p.marca??'producto'),48),modelo.slice(0,38).replace(/-+$/,'')].filter(Boolean).join('-');
 return recortar(nombre||'producto',80);
}
/** Reserve existing URLs before assigning new ones. Persisted slugs survive name/model and stock changes. */
export function asignarRutasProductos<T extends ProductoConRuta>(productos:T[]):T[] {
 const usados=new Set(productos.flatMap(p=>[p.id,...(p.slug?[p.slug]:[])]));
 const nuevos=new Map<string,string>();
 for(const p of [...productos].sort((a,b)=>a.id.localeCompare(b.id))){
  if(p.slug)continue;
  const base=baseRuta(p);let slug=base,n=2;
  while(usados.has(slug)&&slug!==p.id)slug=base+'-'+n++;
  usados.add(slug);nuevos.set(p.id,slug);
 }
 return productos.map(p=>p.slug?p:{...p,slug:nuevos.get(p.id)!});
}
export function rutaProducto(p:{id:string;slug?:string}) {
 return '/tienda/'+encodeURIComponent(p.slug||p.id);
}
export function buscarProductoPorRuta<T extends {id:string;slug?:string}>(productos:T[],ruta:string) {
 return productos.find(p=>p.id===ruta)||productos.find(p=>p.slug===ruta);
}
