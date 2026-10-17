// Se ejecuta en el navegador antes de subir una foto de la portada.
export async function optimizarFotoInicio(archivo:File):Promise<File>{
 if(archivo.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(archivo.type))return archivo;
 const imagen=await createImageBitmap(archivo);
 try{
  const escala=Math.min(1,1600/Math.max(imagen.width,imagen.height));
  const lienzo=document.createElement('canvas');
  lienzo.width=Math.max(1,Math.round(imagen.width*escala));lienzo.height=Math.max(1,Math.round(imagen.height*escala));
  const contexto=lienzo.getContext('2d');if(!contexto)return archivo;
  contexto.drawImage(imagen,0,0,lienzo.width,lienzo.height);
  const foto=await new Promise<Blob|null>(resolve=>lienzo.toBlob(resolve,'image/webp',.8));
  return foto?.type==='image/webp'&&foto.size<archivo.size?new File([foto],archivo.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp'}):archivo;
 }finally{imagen.close();}
}
