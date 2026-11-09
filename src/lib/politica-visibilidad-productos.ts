type ProductoComercial={categoria:string;subcategoria?:{es:string;en:string};nombre:{es:string;en:string};precio:number|null};
const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();
/** Store policy, independent of supplier. Never changes inventory or publication flags. */
export function minimoVentaProducto(p:Omit<ProductoComercial,'precio'>):number|null{
 const nombres=[normalizar(p.nombre.es),normalizar(p.nombre.en)];
 const clases=[normalizar(p.categoria),normalizar(p.subcategoria?.es??''),normalizar(p.subcategoria?.en??'')];
 // Accessories and bundles are not standalone mice/headphones/speakers.
 const accesorio=/\b(mouse\s*pads?|alfombrillas?|tapetes?|combos?|keyboard|teclados?)\b/;
 const empiezaAccesorio=/^(soporte|stand|mount|base|cable|adaptador|adapter|repuesto|replacement|funda|cover|estuche|case|almohadilla|ear\s*pad|receptor|receiver|dongle)\b/;
 if([...clases,...nombres].some(s=>accesorio.test(s))||nombres.some(s=>empiezaAccesorio.test(s)))return null;
 if(clases.some(s=>/^(mouse|mouses|mice|raton|ratones)$/.test(s)))return 5000;
 if(clases.some(s=>/^(audifonos?|auricular(?:es)?|headsets?|headphones?|earphones?|earbuds?|parlantes?|(?:altavoz|altavoces)|speakers?)$/.test(s)))return 10000;
 // A product title starting with the product type is safe even when manual/API
 // categorization is broad. Do not match a monitor's "headphone output" feature.
 if(nombres.some(s=>/^(mouse|mouses|mice|raton|ratones)\b/.test(s)))return 5000;
 if(nombres.some(s=>/^(audifonos?|auricular(?:es)?|headsets?|headphones?|earphones?|earbuds?|parlantes?|(?:altavoz|altavoces)|speakers?)\b/.test(s)))return 10000;
 return null;
}
export function cumpleMinimoVenta(p:ProductoComercial){
 const minimo=minimoVentaProducto(p);
 return minimo===null||p.precio===null||p.precio>=minimo;
}
/** Apply AFTER recalculating dated promotions so expired offers can reappear. */
export function aplicarMinimosVenta<T extends {productos:ProductoComercial[]}>(catalogo:T):T{
 return {...catalogo,productos:catalogo.productos.filter(cumpleMinimoVenta)};
}
