// Isolated authentication contract. No external identity provider is contacted.
import http from 'node:http';import {createHash} from 'node:crypto';
const admin='00000000-0000-4000-8000-000000000001',cliente='00000000-0000-4000-8000-000000000002',comercial='00000000-0000-4000-8000-000000000003';let operacionesMfa=0;
function usuario(id,provider='email'){return {id,aud:'authenticated',email:id===admin?'admin@example.test':id===comercial?'comercial@example.test':'cliente@example.test',email_confirmed_at:'2026-10-19T00:00:00Z',created_at:'2026-10-19T00:00:00Z',app_metadata:{provider},user_metadata:{nombre_completo:'Prueba aislada',rol:'administrador',aal:'aal2'},factors:[]};}
function sesion(id,provider){const jwt=[{alg:'HS256',typ:'JWT'},{sub:id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated',aal:'aal1'}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';return {access_token:jwt,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user:usuario(id,provider)};}
http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');const url=new URL(req.url,'http://127.0.0.1:3175');let texto='';for await(const c of req)texto+=c;const d=texto?JSON.parse(texto):{};const send=(v,status=200)=>{res.statusCode=status;res.end(JSON.stringify(v));};let sub='';try{sub=JSON.parse(Buffer.from((req.headers.authorization??'').split('.')[1]??'','base64url').toString()).sub??'';}catch{}
 if(url.pathname==='/__test/mfa')return send({operacionesMfa});
 if(url.pathname.startsWith('/auth/v1/factors')){operacionesMfa++;return send({message:'Not allowed in this contract'},403);}
 if(url.pathname==='/auth/v1/settings')return send({external:{google:true}});
 if(url.pathname==='/auth/v1/user')return sub?send(usuario(sub)):send({message:'No session'},401);
 if(url.pathname==='/auth/v1/logout'){res.statusCode=204;return res.end();}
 if(url.pathname==='/auth/v1/token'){
  if(url.searchParams.get('grant_type')==='password'&&d.password==='Prueba!12345'&&['cliente@example.test','comercial@example.test','admin@example.test'].includes(d.email))return send(sesion(d.email.startsWith('admin')?admin:d.email.startsWith('comercial')?comercial:cliente,'email'));
  const esperado='test-google.'+createHash('sha256').update(d.nonce??'').digest('hex')+'.'+'x'.repeat(100);
  if(url.searchParams.get('grant_type')==='id_token'&&d.provider==='google'&&d.id_token===esperado)return send(sesion(cliente,'google'));
  return send({message:'Invalid credentials',code:'invalid_credentials'},400);
 }
 if(url.pathname==='/rest/v1/rpc/cuenta_habilitada')return send(Boolean(sub));
 if(url.pathname==='/rest/v1/rpc/es_administrador_identificado')return send(sub===admin);
 if(url.pathname==='/rest/v1/rpc/es_administrador_activo')return send(false);
 if(url.pathname==='/rest/v1/perfiles')return send(sub===cliente?null:{id:sub,nombre:'Prueba aislada',rol:sub===admin?'administrador':'comercial',activo:true});
 if(url.pathname==='/rest/v1/favoritos'||url.pathname==='/rest/v1/rpc/mis_pedidos_referencias')return send([]);
 return send(null);
}).listen(3175,'127.0.0.1');
