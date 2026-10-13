import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.SG_PGLITE_MODULE??'@electric-sql/pglite');
for(const existente of [false,true]){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,created_at timestamptz default now(),last_sign_in_at timestamptz,deleted_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.pedidos_manuales(id uuid primary key,creado_en timestamptz,estado text,total_cobrar numeric,total_productos numeric,costo_envio numeric);
 create table public.pedidos_tilopay(id uuid primary key,creado_en timestamptz,estado text,total numeric,entorno text);`);
 await db.exec(await readFile('supabase/migrations/20260909000100_perfiles.sql','utf8'));
 if(existente)await db.exec(await readFile('supabase/migrations/20260922000100_analitica.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/20261013000300_estadisticas_panel.sql','utf8'));
 const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 await db.query("insert into auth.users(id) values($1)",[id(1)]);await db.query("insert into public.perfiles(id,nombre,rol,activo) values($1,'Administrador','administrador',true)",[id(1)]);
 await db.query("insert into auth.users(id,created_at,last_sign_in_at) values($1,now()-interval '1 day',now()),($2,now()-interval '15 days',now()-interval '15 days'),($3,now(),now())",[id(2),id(3),id(4)]);
 await db.query('update auth.users set deleted_at=now() where id=$1',[id(4)]);
 for(const [n,dias,sesion,visitante] of [[1,1,10,20],[2,1,11,20],[3,15,12,21],[4,35,13,22]])await db.query("insert into public.eventos_analitica(id,sesion,visitante,creado_en,tipo,ruta,detalle,dispositivo,idioma,campana) values($1,$2,$3,now()-($4||' days')::interval,'pagina','/tienda','','movil','es','demo')",[id(100+n),id(sesion),id(visitante),String(dias)]);
 await db.query("insert into public.pedidos_manuales values($1,now()-interval '1 day','pagado',100,90,10),($2,now(),'revision',null,500,null)",[id(30),id(31)]);
 await db.query("insert into public.pedidos_tilopay values($1,now()-interval '1 day','pagado',200,'produccion'),($2,now()-interval '15 days','pagado',50,'produccion'),($3,now(),'pagado',999,'pruebas')",[id(32),id(33),id(34)]);
 async function sesion(rol,usuario=''){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[usuario]);await db.exec(`set role ${rol}`);}
 await sesion('anon');await assert.rejects(()=>db.query('select public.resumen_estadisticas_panel()'),/permission denied/);
 await sesion('authenticated',id(2));await assert.rejects(()=>db.query('select public.resumen_estadisticas_panel()'),/forbidden/);
 await assert.rejects(()=>db.query('select * from public.eventos_analitica'),/permission denied/);
 await sesion('authenticated',id(1));await assert.rejects(()=>db.query('select public.resumen_estadisticas_panel(90)'),/invalid_period/);
 const resumen=async dias=>(await db.query('select public.resumen_estadisticas_panel($1) as resumen',[dias])).rows[0].resumen;
 const semana=await resumen(7);assert.equal(semana.total,2);assert.equal(semana.sesiones,2);assert.equal(semana.visitantes,1);assert.deepEqual(semana.clientes,{total:2,nuevos:1,activos:1});assert.deepEqual(semana.compras,{total:3,pagados:2,pendientes:1,ingresos:300,promedio:150});assert.equal(semana.dispositivos[0].cantidad,2);assert.equal(semana.diario[0].visitas,2);
 const mes=await resumen(30);assert.equal(mes.total,3);assert.equal(mes.visitantes,2);assert.equal(mes.clientes.nuevos,2);assert.equal(mes.compras.ingresos,350);assert.equal(mes.compras.pagados,3);
 assert.ok(!JSON.stringify(mes).includes(id(1)));assert.ok(!JSON.stringify(mes).includes('correo'));
 await sesion('anon');const evento={id:id(200),sesion:id(210),visitante:id(220),tipo:'producto',ruta:'/tienda/'+('a'.repeat(95)),detalle:'demo',dispositivo:'movil',idioma:'es',campana:''};
 await db.query('select public.registrar_evento($1::jsonb)',[JSON.stringify(evento)]);await db.query('select public.registrar_evento($1::jsonb)',[JSON.stringify(evento)]);
 await db.query('select public.registrar_evento($1::jsonb)',[JSON.stringify({...evento,id:id(201),tipo:'pagina',ruta:'/pagar'})]);
 await assert.rejects(()=>db.query('select public.registrar_evento($1::jsonb)',[JSON.stringify({...evento,id:id(202),ruta:'/admin'})]),/check constraint/);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::integer as total from public.eventos_analitica where id=$1',[id(200)])).rows[0].total,1);
 await db.close();console.log('PASS estadísticas: '+(existente?'actualización de esquema':'instalación nueva')+', permisos, visitantes, períodos, registros y pedidos reales.');
}
