// Isolated OAuth/PKCE fixture. No Google account, email, charge or supplier order is created.
import http from 'node:http';
const usuario={id:'00000000-0000-4000-8000-000000000041',aud:'authenticated',email:'fixture@example.com',email_confirmed_at:'2026-10-12T00:00:00Z',app_metadata:{provider:'google'},user_metadata:{nombre_completo:'Ana Prueba'},created_at:'2026-10-12T00:00:00Z'};
const token=()=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:usuario.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
http.createServer(async(req,res)=>{
 let raw='';for await(const parte of req)raw+=parte;const datos=raw?JSON.parse(raw):{};
 const url=new URL(req.url,'http://127.0.0.1:3114');res.setHeader('Content-Type','application/json');
 if(url.pathname==='/auth/v1/settings'){res.end(JSON.stringify({external:{google:true,facebook:false}}));return;}
 if(url.pathname==='/auth/v1/authorize'){res.setHeader('Content-Type','text/html');res.end('<h1>Proveedor de prueba / Test provider</h1><a class="fixture-continuar" href="http://127.0.0.1:3108/cuenta/confirmar?code=fixture-success">Continuar / Continue</a>');return;}
 if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='pkce'&&datos.auth_code==='fixture-success'&&datos.code_verifier?.length>=43){res.end(JSON.stringify({access_token:token(),refresh_token:'fixture-refresh-token',token_type:'bearer',expires_in:3600,user:usuario}));return;}
 if(url.pathname==='/auth/v1/user'&&req.headers.authorization?.includes('.fixture')){res.end(JSON.stringify(usuario));return;}
 if(url.pathname==='/rest/v1/rpc/cuenta_habilitada'){res.end('true');return;}
 if(url.pathname==='/rest/v1/rpc/es_administrador_activo'){res.end('false');return;}
 if(url.pathname==='/rest/v1/perfiles_compra_clientes'){res.end(JSON.stringify([{datos:{nombre:'Ana',apellidos:'Prueba',telefono:'+506 88883333'}}]));return;}
 if(url.pathname==='/rest/v1/rpc/mis_pedidos'){res.end('[]');return;}
 res.writeHead(401);res.end(JSON.stringify({code:'session_not_found',message:'Fixture has no authenticated session'}));
}).listen(3114,'127.0.0.1');
