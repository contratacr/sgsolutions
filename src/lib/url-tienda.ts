import {nombreMarca} from './marcas-nombres';

export type EstadoUrlTienda={
 categoria:string;subcategoria:string;marca:string;marcasElegidas:string[];
 busqueda:string;min:string;max:string;orden:string;pagina:number;
};
const claves=['q','c','s','m','min','max','o','p','categoria','subcategoria','marca','marcas','orden','pagina'] as const;
const texto=(valor:string|null,maximo:number)=>(valor??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,maximo);
function precio(valor:string|null){
 if(!valor?.trim())return '';
 const numero=Number(valor);
 return Number.isFinite(numero)&&numero>=0&&numero<=1e9?String(numero):'';
}
/** Public selection only: never serialize recommendations, accounts or campaign identifiers here. */
export function leerUrlTienda(params:URLSearchParams):EstadoUrlTienda{
 const categoria=texto(params.get('c')??params.get('categoria'),80);
 const marcas=[...new Set([...params.getAll('m'),...params.getAll('marcas'),params.get('marca')??'']
  .map(m=>nombreMarca(texto(m,100))).filter(Boolean))].slice(0,100).sort();
 const orden=params.get('o')??params.get('orden');
 const pagina=Number(params.get('p')??params.get('pagina')??1);
 const min=precio(params.get('min')),max=precio(params.get('max'));
 return {
  categoria:/^[a-z0-9][a-z0-9-]{0,79}$/.test(categoria)?categoria:'todos',
  subcategoria:texto(params.get('s')??params.get('subcategoria'),150),
  marca:'',marcasElegidas:marcas,busqueda:texto(params.get('q'),150),
  min,max:min&&max&&Number(max)<Number(min)?min:max,
  orden:['precio','menor'].includes(orden??'')?'menor':['-precio','mayor'].includes(orden??'')?'mayor':'recomendados',
  pagina:Number.isSafeInteger(pagina)&&pagina>0?Math.min(pagina,100000):1
 };
}
export function parametrosApiTienda(estado:EstadoUrlTienda,idioma:string){
 const p=new URLSearchParams({categoria:estado.categoria,marca:estado.marca,subcategoria:estado.subcategoria,min:estado.min,max:estado.max,q:estado.busqueda,orden:estado.orden,idioma});
 for(const marca of estado.marcasElegidas)p.append('marcas',marca);
 p.set('pagina',String(estado.pagina));
 return p;
}
export function parametrosUrlTienda(estado:EstadoUrlTienda){
 const p=new URLSearchParams();
 const q=estado.busqueda.trim();
 if(q)p.set('q',q);
 if(estado.categoria&&estado.categoria!=='todos')p.set('c',estado.categoria);
 if(estado.subcategoria)p.set('s',estado.subcategoria);
 for(const marca of [...new Set([...estado.marcasElegidas,...(estado.marca?[estado.marca]:[])].map(m=>nombreMarca(m)).filter(Boolean))].sort())p.append('m',marca.toLowerCase());
 if(estado.min)p.set('min',estado.min);
 if(estado.max)p.set('max',estado.max);
 if(estado.orden==='menor')p.set('o','precio');
 if(estado.orden==='mayor')p.set('o','-precio');
 if(estado.pagina>1)p.set('p',String(estado.pagina));
 return p;
}
export function urlConSeleccionTienda(url:URL,estado:EstadoUrlTienda){
 const params=new URLSearchParams(url.search);
 for(const clave of claves)params.delete(clave);
 // Preserve existing acquisition parameters without copying them into the catalogue state.
 for(const [clave,valor] of parametrosUrlTienda(estado))params.append(clave,valor);
 const query=params.toString();
 return url.pathname+(query?'?'+query:'')+url.hash;
}
