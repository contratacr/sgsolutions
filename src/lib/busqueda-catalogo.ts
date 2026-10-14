import type {CatalogoPublico} from './catalogo-modelo';
type Producto=CatalogoPublico['productos'][number];
const familias=[
 ['audifono','audifonos','auricular','auriculares','headset','headsets','headphone','headphones','earbud','earbuds'],
 ['monitor','monitores'],['mouse','mice','raton','ratones'],['teclado','teclados','keyboard','keyboards'],
 ['laptop','laptops','portatil','portatiles','notebook','notebooks'],['router','routers'],
 ['impresora','impresoras','printer','printers'],['parlante','parlantes','altavoz','altavoces','speaker','speakers'],
 ['cable','cables'],['adaptador','adaptadores','adapter','adapters'],['microfono','microfonos','microphone','microphones'],
 ['camara','camaras','camera','cameras'],['memoria','memorias','ram'],['cargador','cargadores','charger','chargers'],
];
const omitir=new Set(['de','del','la','el','los','las','para','con','y','the','for','with','and']);
export function normalizarBusqueda(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function familia(tokens:string[]){for(const token of tokens){const indice=familias.findIndex(grupo=>grupo.includes(token));if(indice>=0)return indice;}return -1;}
export function prepararBusqueda(consulta:string){
 const palabras=normalizarBusqueda(consulta).split(' ').filter(p=>p&&!omitir.has(p));
 return {palabras,familia:familia(palabras)};
}
export function coincidenciaBusqueda(p:Producto,busqueda:ReturnType<typeof prepararBusqueda>,categoria:string){
 if(!busqueda.palabras.length)return 1;
 // Supplier titles mix product identity and ports/features. Read identity first.
 const nombre=normalizarBusqueda(p.nombre.es),tokens=nombre.split(' ');
 const tipo=familia(tokens.slice(0,8));
 if(busqueda.familia>=0&&tipo!==busqueda.familia)return 0;
 const titulo=normalizarBusqueda(`${p.nombre.es} ${p.nombre.en} ${p.marca} ${p.codigoFabricante??''}`);
 const texto=normalizarBusqueda(`${titulo} ${p.descripcion.es} ${p.descripcion.en} ${categoria} ${p.subcategoria?.es??''} ${p.subcategoria?.en??''}`);
 const palabrasTexto=new Set(texto.split(' '));
 const compacto=texto.replaceAll(' ','');
 const coincide=(palabra:string)=>{
  const grupo=familias.find(g=>g.includes(palabra));
  return grupo?grupo.some(t=>palabrasTexto.has(t)):palabrasTexto.has(palabra)||(palabra.length>=3&&/\d/.test(palabra)&&compacto.includes(palabra));
 };
 if(!busqueda.palabras.every(coincide))return 0;
 const codigo=normalizarBusqueda(p.codigoFabricante??'').replaceAll(' ','');
 const consulta=busqueda.palabras.join('');
 return (codigo&&codigo===consulta?100:0)+(busqueda.palabras.every(palabra=>titulo.includes(palabra))?20:0)+(nombre.startsWith(busqueda.palabras[0])?10:0)+1;
}
