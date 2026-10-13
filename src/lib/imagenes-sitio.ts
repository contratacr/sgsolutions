export const imagenesSitio={inicioTienda:'/imagenes/gamer.webp',inicioSoporte:'/imagenes/oficina.webp',inicioEmpresas:'/imagenes/casos/eco-mini-market-instalacion.webp',empresasPortada:'/imagenes/red-hero.webp',soporteInstalaciones:'/imagenes/oficina.webp',nosotrosPortada:'/imagenes/oficina.avif',contactoUbicacion:'/imagenes/oficina.webp',proyectoSeguridad:'/imagenes/camaras.webp',proyectoNegocio:'/imagenes/pos.webp',tiendaInvitacion:'/imagenes/portatil.webp',nosotrosSeccion:'/imagenes/oficina.webp'};
export type ImagenSitio=keyof typeof imagenesSitio;
export function imagenSitioValida(src:string){
 if(/^\/imagenes\/[a-zA-Z0-9._/-]+$/.test(src))return !src.split('/').includes('..');
 try{const url=new URL(src);return url.protocol==='https:'&&Boolean(url.hostname)&&!url.username&&!url.password&&!/\s/.test(src);}catch{return false;}
}
