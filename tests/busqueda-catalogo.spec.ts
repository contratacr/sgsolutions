import {test,expect} from '@playwright/test';
import {consultarCatalogo} from '../src/lib/catalogo-consulta';
import {publicarCatalogo,esquemaCatalogo} from '../src/lib/catalogo-modelo';
import inicial from '../src/lib/catalogo-inicial.json';
const real=publicarCatalogo(esquemaCatalogo.parse(inicial)),base={...real.productos[0],categoria:'audio',subcategoria:undefined,descripcion:{es:'Producto del catálogo',en:'Catalogue product'}};
const catalogo={...real,productos:[
 {...base,id:'monitor',nombre:{es:'MONITOR ASUS VG249Q5R HDMI/AUDÍFONOS',en:'ASUS monitor VG249Q5R'},marca:'ASUS',codigoFabricante:'90LM0BT0-B01EI1',precio:64000,destacado:true},
 {...base,id:'buds',nombre:{es:'AUDIFONOS JBL TUNE BUDS 2',en:'JBL headphones'},marca:'JBL',codigoFabricante:'JBLTBUDS2TQEAM',precio:36000},
 {...base,id:'headset',nombre:{es:'HEADSET GAMING LOGITECH G435',en:'Logitech headset G435'},marca:'LOGITECH',codigoFabricante:'G435',precio:25000},
 {...base,id:'adapter',nombre:{es:'ADAPTADOR PARA AUDIFONOS JBL',en:'Adapter for headphones'},marca:'JBL',codigoFabricante:'ADP-1',precio:1500},
]};
const buscar=(q:string,extra:Record<string,string>={})=>consultarCatalogo(catalogo,new URLSearchParams({q,...extra}));
test('tipo de producto excluye conexiones y accesorios y reconoce sinónimos',()=>{
 for(const q of ['audifonos','audífonos','auriculares','headphones','headset'])expect(buscar(q).productos.map(p=>p.id).sort()).toEqual(['buds','headset']);
 expect(buscar('audifonos JBL').productos.map(p=>p.id)).toEqual(['buds']);
 expect(buscar('JBL audífonos').productos.map(p=>p.id)).toEqual(['buds']);
 expect(buscar('monitor ASUS').productos.map(p=>p.id)).toEqual(['monitor']);
 expect(buscar('monitor con audífonos').productos.map(p=>p.id)).toEqual(['monitor']);
 expect(buscar('ADAPTADOR AUDIFONOS').productos.map(p=>p.id)).toEqual(['adapter']);
});
test('marca, modelo, puntuación y filtros siguen funcionando',()=>{
 expect(buscar('90lm0bt0 b01ei1').productos.map(p=>p.id)).toEqual(['monitor']);
 expect(buscar('VG249Q5R').productos.map(p=>p.id)).toEqual(['monitor']);
 expect(buscar('headphones JBL',{idioma:'en'}).productos.map(p=>p.id)).toEqual(['buds']);
 expect(buscar('audifonos',{max:'30000'}).productos.map(p=>p.id)).toEqual(['headset']);
 expect(buscar('audifonos',{marcas:'JBL'}).productos.map(p=>p.id)).toEqual(['buds']);
 expect(buscar('audifonos',{orden:'menor'}).productos.map(p=>p.precio)).toEqual([25000,36000]);
 expect(buscar('producto inexistente zzz').total).toBe(0);
 expect(buscar('red').total).toBe(0);
});
test('audífonos del catálogo real no devuelven monitores',()=>{
 const respuesta=consultarCatalogo(real,new URLSearchParams({q:'audifonos'}));
 expect(respuesta.total).toBeGreaterThan(0);
 expect(respuesta.productos.every(p=>!p.nombre.es.startsWith('MONITOR'))).toBe(true);
});
