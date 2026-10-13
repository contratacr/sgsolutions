// Contract fixture only: never accepts a real Google token or contacts a provider.
import http from 'node:http';
import {createHash} from 'node:crypto';
const id='00000000-0000-4000-8000-000000000001';
const usuario={id,aud:'authenticated',email:'fixture@example.com',email_confirmed_at:'2026-10-12T00:00:00Z',app_metadata:{provider:'google'},user_metadata:{},created_at:'2026-10-12T00:00:00Z'};
http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');
 const url=new URL(req.url,'http://127.0.0.1:3121');
 let texto='';for await(const parte of req)texto+=parte;
 const body=texto?JSON.parse(texto):{};
 if(url.pathname==='/auth/v1/settings')return res.end(JSON.stringify({external:{google:true}}));
 if(url.pathname==='/auth/v1/user')return res.end(JSON.stringify(usuario));
 if(url.pathname==='/auth/v1/logout')return res.end('{}');
 if(url.pathname==='/rest/v1/rpc/cuenta_habilitada')return res.end('true');
 if(url.pathname==='/rest/v1/rpc/es_administrador_activo')return res.end('false');
 if(url.pathname==='/rest/v1/perfiles_compra_clientes')return res.end('null');
 if(url.pathname==='/rest/v1/rpc/mis_pedidos')return res.end(JSON.stringify([{id:'11111111-1111-4111-8111-111111111111',origen:'manual',creado_en:'2026-10-12T12:00:00Z',estado:'pagado',total:15000,articulos:[{nombre:'Compra previa de prueba',cantidad:2}]}]));
 if(url.pathname==='/auth/v1/token'){
  const esperado='test-google.'+createHash('sha256').update(body.nonce??'').digest('hex')+'.'+'x'.repeat(100);
  if(url.searchParams.get('grant_type')!=='id_token'||body.provider!=='google'||body.id_token!==esperado){res.statusCode=400;return res.end(JSON.stringify({code:'invalid_credentials',msg:'Rejected fixture token'}));}
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
  return res.end(JSON.stringify({access_token:jwt,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user:usuario}));
 }
 res.statusCode=404;res.end('{}');
}).listen(3121,'127.0.0.1');
