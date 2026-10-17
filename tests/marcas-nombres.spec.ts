import {test,expect} from '@playwright/test';
import {nombreMarca} from '../src/lib/marcas-nombres';
import {consultarCatalogo} from '../src/lib/catalogo-consulta';
import {publicarCatalogo,esquemaCatalogo} from '../src/lib/catalogo-modelo';
import inicial from '../src/lib/catalogo-inicial.json';
test('variantes de marca se agrupan y los filtros anteriores siguen encontrándolas',()=>{
 for(const [a,b] of [['Dell','DELL'],['Hikvision','HIKVISION'],['Custom America','Custom'],['Nueva Marca','NUEVA MARCA']])expect(nombreMarca(a)).toBe(nombreMarca(b));
 const c=publicarCatalogo(esquemaCatalogo.parse(inicial));
 const base=c.productos[0];const datos={...c,productos:[{...base,id:'uno',marca:'Dell'},{...base,id:'dos',marca:'DELL'}]};
 const filtrado=consultarCatalogo(datos,new URLSearchParams({marca:'DELL'}));
 expect(filtrado.total).toBe(2);expect(new Set(filtrado.productos.map(p=>p.marca))).toEqual(new Set(['Dell']));
});
