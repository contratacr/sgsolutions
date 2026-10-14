import http from 'node:http';
let error=false,eventos=0;
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1:3123');let s='';for await(const c of req)s+=c;const d=s?JSON.parse(s):{};
 const send=x=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(x));};
 if(u.pathname==='/__test/eventos')return send({eventos});
 if(u.pathname==='/rest/v1/rpc/registrar_evento'){eventos++;return send(null);}
 if(u.pathname==='/__test/error'){error=Boolean(d.error);return send({});}
 if(u.pathname==='/auth/v1/settings')return send({});
 let sub='';try{sub=JSON.parse(Buffer.from((req.headers.authorization??'').split('.')[1]??'','base64url').toString()).sub??'';}catch{}
 if(u.pathname==='/auth/v1/user')return send({id:sub,email:'admin-fixture@example.com',aud:'authenticated',email_confirmed_at:'2026-10-13T00:00:00Z',user_metadata:{},app_metadata:{}});
 if(u.pathname==='/rest/v1/perfiles')return send({id:sub,rol:'administrador',activo:true});
 if(u.pathname==='/rest/v1/rpc/es_administrador_activo')return send(Boolean(sub));
 if(u.pathname==='/rest/v1/catalogo_publico')return send(null);
 if(u.pathname==='/rest/v1/rpc/popularidad_productos_panel')return send(error?null:{vistas:[{id:'producto-demo',cantidad:d.dias===7?2:8}],compras:[{id:'producto-demo',nombre:'Producto comprado',cantidad:d.dias===7?1:5,pedidos:2}]});
 if(u.pathname==='/rest/v1/rpc/resumen_estadisticas_panel'){
  if(error){res.statusCode=503;return send({code:'FIXTURE_UNAVAILABLE',message:'No disponible'});}
  const corto=d.dias===7,n=corto?2:18,fecha=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return send({total:40,sesiones:n,visitantes:corto?1:12,filas:[{tipo:'pagina',detalle:'/',cantidad:20},{tipo:'pagina',detalle:'/tienda',cantidad:10},{tipo:'producto',detalle:'producto-demo',cantidad:8},{tipo:'whatsapp',detalle:'flotante',cantidad:4},{tipo:'telefono',detalle:'',cantidad:2},{tipo:'carrito',detalle:'producto-demo',cantidad:3}],diario:[{fecha,visitas:n,paginas:30}],dispositivos:[{detalle:'movil',cantidad:10},{detalle:'escritorio',cantidad:8}],idiomas:[{detalle:'es',cantidad:15},{detalle:'en',cantidad:3}],clientes:{total:9,nuevos:corto?1:3,activos:4},compras:{total:5,pagados:2,pendientes:3,ingresos:35000,promedio:17500}});
 }
 return send(null);
}).listen(3123,'127.0.0.1');
