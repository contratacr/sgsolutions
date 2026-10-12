import {calcularPrecio} from './catalogo-modelo';
export const MINIMO_EUROCOMP=15;
const normalizar=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
export const categoriasEurocomp=[
 ['computadoras','Computadoras','Computers'],['componentes','Componentes de PC','PC components'],['perifericos','Periféricos','Peripherals'],['almacenamiento','Almacenamiento','Storage'],['monitores','Monitores y proyección','Monitors and projection'],['redes','Redes y conectividad','Networking'],['seguridad','Seguridad y cámaras','Security and cameras'],['impresion','Impresión','Printing'],['energia','Protección eléctrica','Power protection'],['moviles','Dispositivos móviles','Mobile devices'],['audio','Audio','Audio'],['punto-venta','Punto de venta','Point of sale'],['hogar-inteligente','Hogar inteligente','Smart home'],['gaming','Gaming y streaming','Gaming and streaming'],['accesorios','Accesorios tecnológicos','Technology accessories']
].map(([id,es,en])=>({id,nombre:{es,en}}));
const padres:Record<string,string>={'LAPTOPS':'computadoras','COMPONENTES DE PC':'componentes','PERIFERICOS':'perifericos','ALMACENAMIENTO':'almacenamiento','DISPOSITIVOS DE VISUALIZACION':'monitores','REDES Y CONECTIVDAD':'redes','SEGURIDAD':'seguridad','IMPRESION':'impresion','RESPALDO ELECTRICO':'energia','DISPOSITIVOS MOVILES':'moviles','AUDIO Y SONIDO':'audio','PUNTO DE VENTA':'punto-venta','SMART HOME':'hogar-inteligente','GAMING':'gaming','STREAMING':'gaming'};
const accesorios=new Set(['ADAPTADORES','CABLES','CARGADORES','HUBS','POWER BANKS','SOPORTES','ESTUCHES','BASES','LECTORES DE TARJETAS','SPLITTERS','ENCAPSULADORES','CANDADOS','MOCHILAS Y MALETAS']);
export function categoriaEurocomp(a:{familiaPadre:string;familia:string;nombre?:string}){
 const padre=normalizar(a.familiaPadre),familia=normalizar(a.familia);
 if(['ELECTRODOMESTICOS','SOFTWARE'].includes(padre)||['GARANTIAS','VENTAS FOB/SERVICIOS','MANTENIMIENTO','PRODUCCION','REPUESTOS','EXHIBIDORES'].includes(familia))return null;
 if(padre==='ACCESORIOS'&&familia==='ADAPTADORES'&&/\b(?:RED|ETHERNET|GIGABIT|RJ45|WI-FI|WIFI|INALAMBRICO)\b/.test(normalizar(a.nombre??'')))return 'redes';
 if(padre==='ALMACENAMIENTO'&&familia.startsWith('MEMORIAS RAM'))return 'componentes';
 if(padre==='COMPONENTES DE PC'&&familia==='TARJETAS DE RED')return 'redes';
 if(padre==='PERIFERICOS'&&['AUDIFONOS','HEADSETS'].includes(familia))return 'audio';
 if(padres[padre])return padres[padre];
 if(['COMPUTADORAS','SERVIDORES'].includes(familia))return 'computadoras';
 if(padre==='ACCESORIOS'&&accesorios.has(familia))return 'accesorios';
 return null;
}
export function precioVentaEurocomp(costo:number,moneda:string,cambio:number,utilidad:number,iva=13,adicional=0){
 if(!Number.isFinite(costo)||costo<=0||!['USD','CRC'].includes(moneda)||!Number.isFinite(cambio)||cambio<=0||!Number.isFinite(utilidad)||utilidad<0||!Number.isFinite(iva)||iva<0||iva>100||!Number.isFinite(adicional)||adicional<0)throw new Error('PRECIO_EUROCOMP_INVALIDO');
 // Eurocomp account verified on 2026-10-09: website and SOAP show the same net price, with IVA additional.
 const ajustes={cambio,utilidad,iva,adicional};
 return calcularPrecio(moneda==='USD'?costo:null,ajustes,null,moneda==='CRC'?costo:null)!;
}
export function stockVendibleEurocomp(stock:number|null,cantidad=1){return stock!==null&&Number.isFinite(stock)&&stock>=MINIMO_EUROCOMP&&Number.isInteger(cantidad)&&cantidad>=1&&stock>=cantidad;}
