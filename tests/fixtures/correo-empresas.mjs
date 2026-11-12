import http from 'node:http';
// Brevo plus the minimum PostgREST surface used by /api/empresas: durable inbox first, email afterwards.
let correos=[],fallar=false,fallarAlmacen=false,solicitudes=[];
const json=(res,estado,cuerpo,extra={})=>{res.writeHead(estado,{'content-type':'application/json',...extra});res.end(cuerpo===undefined?'':JSON.stringify(cuerpo));};
const filtro=(url,campo)=>{const v=url.searchParams.get(campo);return v?.startsWith('eq.')?decodeURIComponent(v.slice(3)):null;};
http.createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);const cuerpo=Buffer.concat(chunks).toString();const url=new URL(req.url,'http://127.0.0.1');const unico=String(req.headers.accept??'').includes('vnd.pgrst.object');
 if(url.pathname==='/reset'){correos=[];fallar=false;fallarAlmacen=false;solicitudes=[];return json(res,200,{});}
 if(url.pathname==='/fallar'){fallar=true;return json(res,200,{});}
 if(url.pathname==='/fallar-almacen'){fallarAlmacen=true;return json(res,200,{});}
 if(url.pathname==='/correos')return json(res,200,correos);
 if(url.pathname==='/solicitudes')return json(res,200,solicitudes);
 if(url.pathname==='/brevo'){if(fallar)return json(res,503,{});correos.push(JSON.parse(cuerpo));return json(res,200,{messageId:'test-'+correos.length});}
 if(url.pathname==='/rest/v1/solicitudes_empresas'){
  if(fallarAlmacen)return json(res,503,{message:'fixture'});
  if(req.method==='POST'){const fila=JSON.parse(cuerpo);if(!solicitudes.some(s=>s.clave_solicitud===fila.clave_solicitud))solicitudes.push({...fila,estado:'recibida',intentos:0});return json(res,201,undefined);}
  if(req.method==='GET'){const s=solicitudes.find(x=>x.clave_solicitud===filtro(url,'clave_solicitud'));return s?json(res,200,unico?{id:s.id}:[{id:s.id}]):json(res,406,{code:'PGRST116',message:'0 rows'});}
  if(req.method==='PATCH'){const s=solicitudes.find(x=>x.id===filtro(url,'id'));if(s)Object.assign(s,JSON.parse(cuerpo));return json(res,204,undefined);}
 }
 if(url.pathname==='/rest/v1/rpc/reservar_solicitud_empresa'){const {identificador}=JSON.parse(cuerpo);const s=solicitudes.find(x=>x.id===identificador&&x.estado==='recibida');if(!s)return json(res,200,[]);Object.assign(s,{estado:'notificando',reservado_en:new Date().toISOString()});return json(res,200,[s]);}
 if(url.pathname.startsWith('/rest/v1/'))return json(res,404,{code:'PGRST205',message:'not in fixture'});
 json(res,200,{});
}).listen(3151,'127.0.0.1');
