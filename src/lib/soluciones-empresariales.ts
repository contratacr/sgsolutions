import {nombreMarca} from './marcas-nombres';
import type {CatalogoPublico,ClasificacionProducto} from './catalogo-modelo';

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
 if(marca==='Dell'&&[p.categoria,...(p.clasificaciones??[]).map(x=>x.categoria)].some(c=>['computadoras','monitores','servidores'].includes(c))&&/\b(pro|latitude|optiplex|precision|poweredge|workstation|estacion de trabajo|servidor|server)\b/.test(texto))return 'infraestructura';
 return null;
}
export function catalogoEmpresarial(c:CatalogoPublico):CatalogoPublico{
 return {...c,categorias:solucionesEmpresariales.map(({id,nombre})=>({id,nombre})),productos:c.productos.flatMap(p=>{
  const categoria=solucionDeProducto(p);return categoria?[{...p,categoria,marca:marcaEmpresarial(p.marca)??p.marca,subcategoria:undefined}]:[];
 })};
}

/** A single storefront taxonomy; source records and assisted-sale rules stay intact. */
export const categoriaEmpresarial={id:'soluciones-empresariales',nombre:{es:'Soluciones Empresariales',en:'Business Solutions'}};
function clasificacionGeneral(p:CatalogoPublico['productos'][number]):ClasificacionProducto{
 const anterior=p.clasificaciones?.find(x=>x.categoria!==categoriaEmpresarial.id)??{categoria:p.categoria,subcategoria:p.subcategoria};
 if(p.coleccion!=='empresas')return anterior;
 const n=p.nombre.es.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const crear=(categoria:string,es:string,en:string)=>({categoria,subcategoria:{es,en}});
 // Match the actual equipment before falling back to its imported family.
 if(/^kit de montaje|^soporte/.test(n))return crear('accesorios','Soportes','Mounts');
 if(/ventilador|^abanico/.test(n))return crear('componentes','Abanicos','Cooling fans');
 if(/^mouse\b/.test(n))return crear('perifericos','Mouses','Mice');
 if(/estacion de acoplamiento|^dock|^hub/.test(n))return crear('accesorios','Hubs','Hubs');
 if(/^computadora portatil/.test(n))return crear('computadoras','Portátiles','Laptops');
 if(/^computadora todo en uno/.test(n))return crear('computadoras','Todo en uno','All-in-one computers');
 if(/^computadora/.test(n))return crear('computadoras','Computadoras de escritorio','Desktop computers');
 if(/servidor nas|\bnas\b/.test(n))return crear('almacenamiento','Servidores NAS','NAS servers');
 if(/^servidor/.test(n))return crear('computadoras','Servidores','Servers');
 if(/camara/.test(n))return crear('seguridad','Camaras','Cameras');
 if(/grabador|\bnvr\b|\bdvr\b/.test(n))return crear('seguridad','Grabadoras','Video recorders');
 if(/router|gateway/.test(n))return crear('redes','Routers','Routers');
 if(/switch/.test(n))return crear('redes','Switches','Switches');
 if(/punto de acceso|access point/.test(n))return crear('redes','Puntos de Acceso','Access points');
 if(/cable de red/.test(n))return crear('redes','Cableado de red','Network cabling');
 if(/bateria/.test(n))return crear('energia','Baterias','Batteries');
 if(/regulador/.test(n))return crear('energia','Reguladores de Voltaje','Voltage regulators');
 if(/respaldo de energia|\bups\b/.test(n))return crear('energia','UPS','UPS');
 return anterior;
}
export function clasificacionesDeProducto(p:CatalogoPublico['productos'][number]):ClasificacionProducto[]{
 return p.clasificaciones??[{categoria:p.categoria,subcategoria:p.subcategoria}];
}
export function catalogoTienda(c:CatalogoPublico):CatalogoPublico{
 return {...c,categorias:[categoriaEmpresarial,...c.categorias.filter(x=>x.id!==categoriaEmpresarial.id)],productos:c.productos.map(p=>{
  const marcaOriginal=p.marca;
  const solucion=solucionDeProducto(p),rama=solucionesEmpresariales.find(x=>x.id===solucion);
  const general=clasificacionGeneral(p),principal=rama?{categoria:categoriaEmpresarial.id,subcategoria:rama.nombre}:general;
  const clasificaciones=rama?[principal,...(general.categoria!==principal.categoria?[general]:[])]:[general];
  return {...p,...principal,clasificaciones,marca:nombreMarca(marcaEmpresarial(marcaOriginal)??marcaOriginal)};
 })};
}

// A small selection of complete solutions for the general recommended catalog.
export const seleccionInicioEmpresarial=[
 {solucion:'redes',id:'empresa-intcomex-nw608ubq18'},
 {solucion:'seguridad',id:'empresa-intcomex-es207hik73'},
 {solucion:'respaldo',id:'empresa-intcomex-nw001qna75'},
 {solucion:'energia',id:'empresa-intcomex-ui714apc76'},
] as const;
