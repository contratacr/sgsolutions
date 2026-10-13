// Read-only deployment check. Never print keys, customer records or URLs with tokens.
const {SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:clave}=process.env;
if(!url||!clave)throw new Error('Falta la conexión del servidor a Supabase.');
const tablas={
 solicitudes_asesoria:'id,creado_en,estado,idioma,articulos,token,vence_en,pedido_id,contacto,numero,eliminado_en,origen',
 pedidos_manuales:'id,estado,metodo,cliente,articulos,total_productos,costo_envio,total_cobrar,comprobante_path,comprobante_en,correo_cliente_en,correo_equipo_en,correo_pago_en,cliente_usuario_id',
 pedidos_tilopay:'id,estado,entorno,moneda,total,cliente,articulos,transaccion_tilopay,resultado_tilopay,cliente_usuario_id',
 correos_pago_tarjeta:'pedido_id,destinatario,estado,actualizado_en,intentos',
 catalogo_privado:'id,contenido',catalogo_publico:'id,contenido',
 perfiles:'id,rol,activo',perfiles_compra_clientes:'usuario_id,datos',estado_cuentas_usuario:'usuario_id,estado,version',
};
let errores=0;
for(const [tabla,columnas]of Object.entries(tablas)){
 const respuesta=await fetch(new URL(`/rest/v1/${tabla}?select=${columnas}&limit=0`,url),{headers:{apikey:clave,Authorization:`Bearer ${clave}`}});
 if(!respuesta.ok){const error=await respuesta.json().catch(()=>({}));console.error(`${tabla}: esquema no disponible (${respuesta.status}, ${/^[A-Z0-9]+$/.test(error.code??'')?error.code:'sin_codigo'}).`);errores++;}
 else console.log(`${tabla}: correcto.`);
}
const almacenamiento=await fetch(new URL('/storage/v1/bucket/comprobantes-pedidos',url),{headers:{apikey:clave,Authorization:`Bearer ${clave}`}});
const bucket=await almacenamiento.json().catch(()=>null);
if(!almacenamiento.ok||bucket?.public!==false){console.error('Comprobantes: falta almacenamiento privado.');errores++;}else console.log('Comprobantes: almacenamiento privado correcto.');
if(errores)process.exitCode=1;
