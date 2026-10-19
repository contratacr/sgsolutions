// Isolated account/profile fixture. No real accounts, messages or charges.
import http from 'node:http';
const user={id:'00000000-0000-4000-8000-000000000051',email:'checkout@example.com',email_confirmed_at:'2026-10-15T00:00:00Z',user_metadata:{nombre_completo:'Ana Prueba'},app_metadata:{provider:'email'},aud:'authenticated',created_at:'2026-10-15T00:00:00Z'};
let profile=null;
http.createServer(async(req,res)=>{
 let body='';for await(const part of req)body+=part;
 const url=new URL(req.url,'http://127.0.0.1:3126');res.setHeader('Content-Type','application/json');
 if(url.pathname==='/auth/v1/settings')return res.end(JSON.stringify({external:{google:false}}));
 if(url.pathname==='/auth/v1/user'){
  if(!req.headers.authorization?.includes('.fixture')){res.statusCode=401;return res.end('{"message":"No test session"}');}
  return res.end(JSON.stringify(user));
 }
 if(url.pathname==='/rest/v1/rpc/cuenta_habilitada')return res.end('true');
 if(url.pathname==='/rest/v1/rpc/es_administrador_activo')return res.end('false');
 if(['/rest/v1/rpc/mis_pedidos','/rest/v1/rpc/mis_pedidos_referencias'].includes(url.pathname))return res.end('[]');
 if(url.pathname==='/rest/v1/perfiles_compra_clientes'){
  if(req.method==='POST'){profile=JSON.parse(body).datos;return res.end('{}');}
  return res.end(JSON.stringify(profile?[{datos:profile}]:[]));
 }
 if(url.pathname==='/__test/profile')return res.end(JSON.stringify(profile));
 res.statusCode=404;res.end('{}');
}).listen(3126,'127.0.0.1');
