// Contract fixture only: never accepts a real Google token or contacts a provider.
import http from 'node:http';
import {createHash} from 'node:crypto';
const id='00000000-0000-4000-8000-000000000001';
const usuario={id,aud:'authenticated',email:'fixture@example.com',email_confirmed_at:'2026-10-12T00:00:00Z',app_metadata:{provider:'google'},user_metadata:{},created_at:'2026-10-12T00:00:00Z'};
let tokens=0;const aceptaciones=[];
http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');
 const url=new URL(req.url,'http://127.0.0.1:3121');
 let texto='';for await(const parte of req)texto+=parte;
 const body=texto?JSON.parse(texto):{};
 if(url.pathname==='/__test/estado')return res.end(JSON.stringify({tokens,aceptaciones}));
 if(url.pathname==='/rest/v1/pedidos_tilopay')return res.end(JSON.stringify({estado:url.searchParams.get('id')?.endsWith('9')?'rechazado':'pagado',cliente:{modalidad:'retiro'},entorno:url.searchParams.get('id')?.endsWith('1')?'pruebas':'produccion'}));
 if(url.pathname==='/rest/v1/catalogo_publico'||url.pathname==='/rest/v1/contenido_publico')return res.end('null');
 if(url.pathname==='/rest/v1/perfiles')return res.end('null');
 if(url.pathname==='/auth/v1/user'&&req.method==='PUT'){usuario.user_metadata={...usuario.user_metadata,...body.data};aceptaciones.push(body.data);return res.end(JSON.stringify(usuario));}
 if(url.pathname==='/auth/v1/settings')return res.end(JSON.stringify({external:{google:true}}));
 if(url.pathname==='/auth/v1/user')return res.end(JSON.stringify(usuario));
 if(url.pathname==='/auth/v1/logout')return res.end('{}');
 if(url.pathname==='/rest/v1/rpc/cuenta_habilitada')return res.end('true');
 if(['/rest/v1/rpc/es_administrador_activo','/rest/v1/rpc/es_administrador_identificado'].includes(url.pathname))return res.end('false');
 if(url.pathname==='/rest/v1/perfiles_compra_clientes')return res.end('null');
 if(['/rest/v1/rpc/mis_pedidos','/rest/v1/rpc/mis_pedidos_referencias'].includes(url.pathname))return res.end(JSON.stringify([{id:'11111111-1111-4111-8111-111111111111',origen:'manual',referencia_numero:42,creado_en:'2026-10-12T12:00:00Z',estado:'pagado',total:15000,articulos:[{nombre:'Compra previa de prueba',cantidad:2}]}]));
 if(url.pathname==='/auth/v1/signup')return res.end(JSON.stringify({user:usuario}));
 if(url.pathname==='/auth/v1/resend')return res.end('{}');
 if(url.pathname==='/auth/v1/verify'){
  if(body.token!=='123456'||body.type!=='email'){res.statusCode=403;return res.end(JSON.stringify({code:'otp_expired',msg:'Invalid code'}));}
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
  return res.end(JSON.stringify({access_token:jwt,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user:usuario}));
 }
 if(url.pathname==='/auth/v1/token'){tokens++;
  const esperado='test-google.'+createHash('sha256').update(body.nonce??'').digest('hex')+'.'+'x'.repeat(100);
  if(!(url.searchParams.get('grant_type')==='password'&&body.email==='fixture@example.com'&&body.password==='Ab1!xyzw')&&(url.searchParams.get('grant_type')!=='id_token'||body.provider!=='google'||body.id_token!==esperado)){res.statusCode=400;return res.end(JSON.stringify({code:'invalid_credentials',msg:'Rejected fixture token'}));}
  const jwt=[{alg:'HS256',typ:'JWT'},{sub:id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
  return res.end(JSON.stringify({access_token:jwt,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user:usuario}));
 }
 res.statusCode=404;res.end('{}');
}).listen(Number(process.env.SG_GOOGLE_FIXTURE_PORT??3121),'127.0.0.1');
