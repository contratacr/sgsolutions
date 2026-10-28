// Explicit manual run only. Ephemeral PostgreSQL; no network or production data.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz,deleted_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.pedidos_manuales(id uuid primary key,creado_en timestamptz default now(),estado text,total_cobrar numeric,total_productos numeric,costo_envio numeric,cliente jsonb,articulos jsonb default '[]');
 create table public.pedidos_tilopay(id uuid primary key,creado_en timestamptz default now(),estado text,total numeric,entorno text,cliente jsonb,articulos jsonb default '[]');
 create table public.catalogo_publico(id integer primary key,contenido jsonb);
 insert into public.catalogo_publico values(1,'{"productos":[{"id":"qa-producto","slug":"qa"}]}');`);
 for(const f of ['20260909000100_perfiles.sql','20261013000300_estadisticas_panel.sql','20261013000600_popularidad_productos.sql','20261017000200_estadisticas_agregadas.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 await db.exec(`create or replace function public.es_administrador_activo() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.perfiles where id=auth.uid() and activo and rol='administrador') and current_setting('request.jwt.claim.aal',true)='aal2'$$;`);
 await db.exec(await readFile('supabase/migrations/20261020000100_campanas_conversiones_privadas.sql','utf8'));
 await db.query("insert into auth.users(id,email) values($1,'admin@example.test'),($2,'cliente@example.test')",[id(1),id(2)]);
 await db.query("insert into public.perfiles(id,nombre,rol,activo) values($1,'Admin QA','administrador',true),($2,'Cliente QA','comercial',true)",[id(1),id(2)]);
 async function rol(r,usuario='',aal='aal1'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.aal',$2,false)",[usuario,aal]);await db.exec('set role '+r);}
 for(const r of ['anon','authenticated']){await rol(r,id(2));for(const tabla of ['publicidad_cola','medicion_operaciones','estadisticas_embudo'])await assert.rejects(()=>db.query('select * from public.'+tabla),/permission denied/);await assert.rejects(()=>db.query('select public.reservar_publicidad()'),/permission denied/);}
 await rol('authenticated',id(1),'aal1');await assert.rejects(()=>db.query('select public.resumen_campanas_panel()'),/SIN_PERMISO/);
 await rol('authenticated',id(1),'aal2');assert.deepEqual((await db.query('select public.resumen_campanas_panel() as r')).rows[0].r.embudo,[]);
 await rol('service_role');
 const contexto={id:id(20),vence:Date.now()+86400000,primero:{canal:'google',medio:'pago',campana:'qa'},reciente:{canal:'instagram',medio:'referido',campana:''}};
 const hito={clave:'a'.repeat(43),tipo:'solicitud_recibida',idioma:'es',contexto,excluir:false};
 await db.query('select public.registrar_hito_negocio($1)',[JSON.stringify(hito)]);await db.query('select public.registrar_hito_negocio($1)',[JSON.stringify(hito)]);
 await db.query('select public.registrar_hito_negocio($1)',[JSON.stringify({...hito,clave:'b'.repeat(43),excluir:true})]);
 assert.equal(Number((await db.query('select sum(cantidad) n from public.estadisticas_embudo')).rows[0].n),1);
 const evento={id:'c'.repeat(43),contexto:contexto.id,evento:'Lead',ruta:'/empresas',producto:null,valor:null,fbp:'fb.1.1792531717000.1234',fbc:null,vence_contexto:new Date(contexto.vence).toISOString()};
 await db.query('select public.encolar_publicidad($1)',[JSON.stringify(evento)]);await db.query('select public.encolar_publicidad($1)',[JSON.stringify(evento)]);
 const lote=(await db.query('select * from public.reservar_publicidad(8)')).rows;assert.equal(lote.length,1);assert.equal(lote[0].intentos,1);assert.equal((await db.query('select * from public.reservar_publicidad(8)')).rows.length,0);
 await db.query("select public.terminar_publicidad($1,$2,'aceptado','200')",[evento.id,lote[0].reserva]);
 const terminado=(await db.query('select estado,fbp,fbc from public.publicidad_cola')).rows[0];assert.equal(terminado.estado,'aceptado');assert.equal(terminado.fbp,null);
 await db.query('select public.encolar_publicidad($1)',[JSON.stringify({...evento,id:'d'.repeat(43)})]);await db.query('select public.revocar_publicidad($1)',[contexto.id]);
 assert.equal((await db.query("select estado from public.publicidad_cola where id=$1",['d'.repeat(43)])).rows[0].estado,'suprimido');
 await db.query('select public.encolar_publicidad($1)',[JSON.stringify({...evento,id:'e'.repeat(43)})]);assert.equal((await db.query("select id from public.publicidad_cola where id=$1",['e'.repeat(43)])).rows.length,0);
 // Retries stay bounded; stale reservations recover without duplicating acceptance.
 const reintento={...evento,id:'f'.repeat(43),contexto:id(21)};
 await db.query('select public.encolar_publicidad($1)',[JSON.stringify(reintento)]);
 for(let intento=1;intento<=5;intento++){
  const filas=(await db.query('select * from public.reservar_publicidad(8)')).rows;assert.equal(filas.length,1);assert.equal(filas[0].intentos,intento);
  await db.query("select public.terminar_publicidad($1,$2,'aceptado','200')",[reintento.id,id(999)]);
  assert.equal((await db.query('select estado from public.publicidad_cola where id=$1',[reintento.id])).rows[0].estado,'enviando');
  await db.query("select public.terminar_publicidad($1,$2,'pendiente','503')",[reintento.id,filas[0].reserva]);
  await db.query('update public.publicidad_cola set proximo_en=now() where id=$1',[reintento.id]);
 }
 assert.equal((await db.query('select estado,fbp from public.publicidad_cola where id=$1',[reintento.id])).rows[0].estado,'expirado');
 assert.equal((await db.query('select * from public.reservar_publicidad(8)')).rows.length,0);
 await db.query('select public.encolar_publicidad($1)',[JSON.stringify({...reintento,id:'g'.repeat(43)})]);
 await db.query("update public.publicidad_cola set estado='enviando',intentos=5,reservado_en=now()-interval '11 minutes' where id=$1",['g'.repeat(43)]);
 await db.query('select public.depurar_medicion()');
 assert.deepEqual((await db.query('select estado,fbp from public.publicidad_cola where id=$1',['g'.repeat(43)])).rows[0],{estado:'expirado',fbp:null});
 await db.exec('reset role');
 await db.query("insert into public.pedidos_manuales(id,estado,cliente,total_cobrar,entorno) values($1,'pagado','{\"correo\":\"cliente@example.test\"}',42000,'produccion'),($2,'pagado','{\"correo\":\"admin@example.test\"}',999,'produccion'),($3,'pagado','{\"correo\":\"cliente@example.test\"}',999,'pruebas')",[id(30),id(31),id(32)]);
 await rol('service_role');assert.equal((await db.query("select public.medicion_operacion_elegible('manual',$1) as ok",[id(30)])).rows[0].ok,true);
 for(const n of [31,32])assert.equal((await db.query("select public.medicion_operacion_elegible('manual',$1) as ok",[id(n)])).rows[0].ok,false);
 // Los totales y el ranking excluyen correo administrador y operaciones marcadas,
 // incluso cuando el pedido contiene el correo de un cliente distinto.
 await db.exec('reset role');
 await db.query("insert into public.pedidos_manuales(id,estado,cliente,total_cobrar,entorno) values($1,'pagado',$3,9000,'produccion'),($2,'pagado',$4,7000,'produccion')",[id(33),id(34),JSON.stringify({correo:'cliente@example.test'}),JSON.stringify({correo:'cliente@example.test',excluir_medicion:true})]);
 await db.query("insert into public.pedidos_tilopay(id,estado,cliente,total,entorno) values($1,'pagado',$3,8000,'produccion'),($2,'pagado',$4,6000,'produccion')",[id(40),id(41),JSON.stringify({correo:'cliente@example.test'}),JSON.stringify({correo:'ADMIN@example.test'})]);
 await db.query("insert into public.medicion_operaciones(clave,tipo,operacion,excluir,idioma) values($1,'manual',$2,true,'es')",['q'.repeat(43),id(33)]);
 const articulos=JSON.stringify([{id:'qa-producto',nombre:'Producto QA',cantidad:1}]);
 await db.query('update public.pedidos_manuales set articulos=$1::jsonb',[articulos]);
 await db.query('update public.pedidos_tilopay set articulos=$1::jsonb',[articulos]);
 await db.exec(await readFile('supabase/migrations/20261028000100_estadisticas_excluir_pedidos_admin.sql','utf8'));
 await rol('authenticated',id(1),'aal2');
 const resumen=(await db.query('select public.resumen_estadisticas_agregadas_panel(7) as r')).rows[0].r;
 assert.deepEqual(resumen.compras,{total:2,pagados:2,pendientes:0,ingresos:50000,promedio:25000});
 const ranking=(await db.query('select public.popularidad_productos_agregada_panel(7) as r')).rows[0].r;
 assert.equal(ranking.compras[0].id,'qa-producto');assert.equal(Number(ranking.compras[0].cantidad),2);assert.equal(Number(ranking.compras[0].pedidos),2);
 assert.ok(!JSON.stringify(resumen).includes('example.test'));
 await rol('authenticated',id(2),'aal2');await assert.rejects(()=>db.query('select public.resumen_estadisticas_agregadas_panel(7)'),/forbidden/);
 console.log('Campañas SQL: aislamiento, MFA, deduplicación, reservas, recepción, revocación y exclusión de pruebas/admin aprobados.');
}finally{await db.close();}
