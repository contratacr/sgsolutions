'use server';
import {z} from 'zod';
import {leerBaseImportacion} from './acciones';
import {buscarFotoIntcomex} from '@/lib/intcomex/fotos';
import {subirImagen} from '@/app/panel/imagenes';
export async function buscarFotoProducto(datos:unknown){
 try{
  await leerBaseImportacion();
  const p=z.object({sku:z.string().trim().min(1).max(100),mpn:z.string().trim().max(100)}).parse(datos);
  const foto=await buscarFotoIntcomex(p.sku,p.mpn);if(!foto)return null;
  const form=new FormData();form.set('archivo',new File([new Uint8Array(foto.bytes)],'producto',{type:foto.tipo}));
  const subida=await subirImagen(form);return subida.src?{src:subida.src,fuente:foto.fuente}:null;
 }catch{return null;}
}
