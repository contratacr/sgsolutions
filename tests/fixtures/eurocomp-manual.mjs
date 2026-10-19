import http from 'node:http';
let intento=Date.now()-10*60_000,modo='ok',consultas=0,publicaciones=0;
const base={gestion:'manual',categorias:[{id:'redes',nombre:{es:'Redes',en:'Networking'}}],productos:[],ajustes:{cambio:500,adicional:0,iva:13,utilidad:20},textos:{titulo:{es:'Tienda',en:'Store'},descripcion:{es:'Equipos',en:'Equipment'},aviso:{es:'Disponibilidad',en:'Availability'}}};
const favoritos=new Map();
let privado=structuredClone(base),visible={...base},revision=0,copia={fecha:'2026-10-13T00:00:00Z',articulos:[],bodega:0};
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1:3121');let text='';for await(const c of req)text+=c;
 const send=x=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(x));};const error=(message,status=400)=>{res.statusCode=status;send({code:'P0001',message});};
 if(u.pathname==='/eurocomp'){
  consultas++;if(!text.includes('wsc_request_bodega_all_items')||/send_orden|send_preventa/.test(text))return error('OPERACION_NO_PERMITIDA');
  if(modo==='conexion'){res.statusCode=503;return res.end();}
  const fila=(codigo,stock)=>`<item xsi:type="t:items_Row"><codigo>${codigo}</codigo><parte>${codigo}</parte><descripcion>Router demo ${codigo}</descripcion><marca>Demo</marca><familia>Routers</familia><FamiliaPadre>REDES Y CONECTIVDAD</FamiliaPadre><precio>10</precio><currency_code>USD</currency_code><stock>${stock}</stock><image_url>https://eurocompcr.com/upload/demo.jpg</image_url></item>`;
  res.setHeader('Content-Type','text/xml');return res.end(`<?xml version="1.0"?><Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:t="urn:server"><result>0</result><data>${modo==='vacio'?'':fila('DEMO15',15)+fila('DEMO14',14)}</data></Envelope>`);
 }
 const d=text?JSON.parse(text):{};
 if(u.pathname==='/__test/reset'){intento=Date.now()-10*60_000;modo=d.modo??'ok';consultas=0;publicaciones=0;return send({});}
 if(u.pathname==='/__test/state')return send({consultas,publicaciones,privado,visible,copia});
 let sub='';try{sub=JSON.parse(Buffer.from((req.headers.authorization??'').split('.')[1]??'','base64url').toString()).sub??'';}catch{}
 if(u.pathname==='/auth/v1/settings')return send({});
 if(u.pathname==='/auth/v1/user')return sub?send({id:sub,email:'admin-fixture@example.com',aud:'authenticated',email_confirmed_at:'2026-10-13T00:00:00Z',app_metadata:{},user_metadata:{}}):error('SIN_PERMISO',401);
 if(u.pathname==='/rest/v1/rpc/cuenta_habilitada')return send(Boolean(sub)&&!sub.endsWith('7'));
 if(u.pathname==='/rest/v1/favoritos'){
  const ids=favoritos.get(sub)??new Set();favoritos.set(sub,ids);
  if(req.method==='POST')for(const x of Array.isArray(d)?d:[d])ids.add(x.producto_id);
  if(req.method==='DELETE')ids.delete((u.searchParams.get('producto_id')??'').replace(/^eq\./,''));
  return send(req.method==='GET'?[...ids].map(producto_id=>({producto_id})):null);
 }
 if(u.pathname==='/rest/v1/perfiles')return send({id:sub,rol:'administrador',activo:!sub.endsWith('7')});
 if(['/rest/v1/rpc/es_administrador_activo','/rest/v1/rpc/es_administrador_identificado'].includes(u.pathname))return send(Boolean(sub)&&!sub.endsWith('7'));
 if(u.pathname==='/rest/v1/catalogo_publico')return send({contenido:visible});
 if(u.pathname==='/rest/v1/catalogo_privado')return send({contenido:privado,revision});
 if(u.pathname==='/rest/v1/rpc/consultar_eurocomp')return send({fecha:copia.fecha,total:copia.articulos.length,resultados:copia.articulos.length,pagina:1,paginas:1,articulos:copia.articulos});
 if(u.pathname==='/rest/v1/rpc/iniciar_eurocomp'){if(!sub||sub.endsWith('7'))return error('SIN_PERMISO');if(Date.now()-intento<300000)return error('ESPERA');intento=Date.now();return send(true);}
 if(u.pathname==='/rest/v1/rpc/publicar_eurocomp'){if(modo==='conflicto')return error('CONFLICTO');privado=d.privado;visible=d.visible;copia=d.nuevo_catalogo;publicaciones++;revision++;return send(revision);}
 return send(null);
}).listen(3121,'127.0.0.1');
