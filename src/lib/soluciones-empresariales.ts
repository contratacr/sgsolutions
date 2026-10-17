import {nombreMarca} from './marcas-nombres';
import type {CatalogoPublico} from './catalogo-modelo';

export const solucionesEmpresariales = [
 {id:'redes',nombre:{es:'Redes empresariales y Wi-Fi',en:'Business networks and Wi-Fi'},descripcion:{es:'Conecte su equipo con una red estable y cobertura donde la necesita.',en:'Connect your team with a stable network and coverage where you need it.'},marcas:['Ubiquiti','Ruijie','Nexxt']},
 {id:'seguridad',nombre:{es:'Videovigilancia y seguridad',en:'Video surveillance and security'},descripcion:{es:'Supervise sus instalaciones con cámaras IP, grabación y monitoreo.',en:'Monitor your premises with IP cameras, recording and surveillance.'},marcas:['Provision-ISR','Ubiquiti']},
 {id:'respaldo',nombre:{es:'Almacenamiento y respaldo',en:'Storage and backup'},descripcion:{es:'Centralice sus archivos y proteja la información de su empresa.',en:'Centralize your files and protect your business information.'},marcas:['QNAP','Dell']},
 {id:'infraestructura',nombre:{es:'Cómputo e infraestructura',en:'Computing and infrastructure'},descripcion:{es:'Equipe su operación con computadoras, estaciones de trabajo y servidores.',en:'Equip your operation with computers, workstations and servers.'},marcas:['Dell']},
 {id:'energia',nombre:{es:'Respaldo y protección de energía',en:'Power backup and protection'},descripcion:{es:'Proteja sus equipos y mantenga su operación ante cortes eléctricos.',en:'Protect your equipment and keep your operation running during power outages.'},marcas:['APC','Forza']},
] as const;
export const marcasEmpresariales=['Ubiquiti','Ruijie','QNAP','Dell','Provision-ISR','Nexxt','APC','Forza'];
export function marcaEmpresarial(valor:string){
 const clave=valor.toLowerCase().replace(/[^a-z0-9]/g,'');
 return ({ubiquiti:'Ubiquiti',ubiquitinetworks:'Ubiquiti',ruijie:'Ruijie',ruijiereyee:'Ruijie',qnap:'QNAP',dell:'Dell',provision:'Provision-ISR',provisionisr:'Provision-ISR',nexxt:'Nexxt',nexxtsolutions:'Nexxt',apc:'APC',forza:'Forza'} as Record<string,string>)[clave];
}
// Curated by product line as well as brand: a Dell backpack or a Nexxt smart
// plug must not appear as business infrastructure merely because of its brand.
export function solucionDeProducto(p:CatalogoPublico['productos'][number]){
 if(p.coleccion==='empresas'&&p.solucionEmpresarial)return p.solucionEmpresarial;
 const marca=marcaEmpresarial(p.marca);if(!marca)return null;
 const texto=[p.nombre.es,p.nombre.en,p.subcategoria?.es,p.codigoFabricante].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(['APC','Forza'].includes(marca)&&/\b(ups|regulador|regulator|surge|pdu|protector|no.break)\b/.test(texto))return 'energia';
 if(['Provision-ISR','Ubiquiti'].includes(marca)&&/\b(camera|camara|nvr|dvr|grabador|unifi protect)\b/.test(texto))return 'seguridad';
 if(['QNAP','Dell'].includes(marca)&&/\b(nas|san|storage|almacenamiento|powervault|backup|respaldo)\b/.test(texto))return 'respaldo';
 if(['Ubiquiti','Ruijie','Nexxt'].includes(marca)&&/\b(router|switch|access point|punto de acceso|wifi|wi-fi|gateway|patch panel|rack|cable.*cat[ -]?[5678])\b/.test(texto))return 'redes';
 if(marca==='Dell'&&['computadoras','monitores','servidores'].includes(p.categoria)&&/\b(pro|latitude|optiplex|precision|poweredge|workstation|estacion de trabajo|servidor|server)\b/.test(texto))return 'infraestructura';
 return null;
}
export function catalogoEmpresarial(c:CatalogoPublico):CatalogoPublico{
 return {...c,categorias:solucionesEmpresariales.map(({id,nombre})=>({id,nombre})),productos:c.productos.flatMap(p=>{
  const categoria=solucionDeProducto(p);return categoria?[{...p,categoria,marca:marcaEmpresarial(p.marca)??p.marca,subcategoria:undefined}]:[];
 })};
}

/** A single storefront taxonomy; source records and assisted-sale rules stay intact. */
export const categoriaEmpresarial={id:'soluciones-empresariales',nombre:{es:'Soluciones Empresariales',en:'Business Solutions'}};
export function catalogoTienda(c:CatalogoPublico):CatalogoPublico{
 return {...c,categorias:[categoriaEmpresarial,...c.categorias.filter(x=>x.id!==categoriaEmpresarial.id)],productos:c.productos.map(p=>{
  const solucion=solucionDeProducto(p),rama=solucionesEmpresariales.find(x=>x.id===solucion);
  return rama?{...p,categoria:categoriaEmpresarial.id,subcategoria:rama.nombre,marca:nombreMarca(marcaEmpresarial(p.marca)??p.marca)}:{...p,marca:nombreMarca(p.marca)};
 })};
}
