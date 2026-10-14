/** Identificar el contenido, sin depender del MIME que reporte macOS o el navegador. */
export async function normalizarComprobante(archivo:File):Promise<File|null>{
 if(archivo.size<100||archivo.size>5*1024*1024)return null;
 const bytes=new Uint8Array(await archivo.slice(0,4).arrayBuffer());
 const firmas:[string,number[]][]=[['application/pdf',[0x25,0x50,0x44,0x46]],['image/png',[0x89,0x50,0x4e,0x47]],['image/jpeg',[0xff,0xd8,0xff]]];
 const tipo=firmas.find(([,firma])=>firma.every((v,i)=>bytes[i]===v))?.[0];
 if(!tipo)return null;
 return archivo.type===tipo?archivo:new File([archivo],archivo.name,{type:tipo,lastModified:archivo.lastModified});
}
