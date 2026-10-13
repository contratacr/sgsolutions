import {rm} from 'node:fs/promises';
export default async function limpiar(){await rm('.privado/contenido-pruebas',{recursive:true,force:true});await rm('public/imagenes/admin-contenido-pruebas',{recursive:true,force:true});}
