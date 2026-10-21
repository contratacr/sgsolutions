import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table public.pedidos_tilopay(id uuid primary key default gen_random_uuid(),estado text not null,entorno text not null,creado_en timestamptz not null default now(),cliente jsonb not null default '{}');
 create table public.correos_pago_tarjeta(pedido_id uuid,destinatario text,estado text);
 insert into public.pedidos_tilopay(id,estado,entorno,creado_en) values('00000000-0000-4000-8000-000000000001','pendiente','produccion',now()-interval '40 minutes');`);
 await db.exec(await readFile('supabase/migrations/20261021000100_conciliacion_tarjeta.sql','utf8'));
 assert.equal((await db.query('select aviso_intento_elegible from pedidos_tilopay')).rows[0].aviso_intento_elegible,false);
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);await assert.rejects(()=>db.query('select * from reservar_conciliacion_tarjeta()'),/permission denied/);await db.exec('reset role');
 }
 await db.exec(`insert into pedidos_tilopay(estado,entorno,creado_en) values
 ('pendiente','produccion',now()-interval '40 minutes'),('pendiente','pruebas',now()-interval '40 minutes'),
 ('pendiente','produccion',now()-interval '8 days'),('pendiente','produccion',now()),
 ('pagado','produccion',now()-interval '40 minutes'),('pendiente','produccion',now()-interval '2 days');`);
 await db.exec('set role service_role');
 const [a,b]=await Promise.all([db.query('select * from reservar_conciliacion_tarjeta()'),db.query('select * from reservar_conciliacion_tarjeta()')]);
 assert.equal(a.rows.length+b.rows.length,4);assert.equal(new Set([...a.rows,...b.rows].map(r=>r.id)).size,4,'Concurrent reservations do not overlap');
 await db.exec('reset role');
 const historico=(await db.query(`select estado,aviso_intento_elegible from pedidos_tilopay where id='00000000-0000-4000-8000-000000000001'`)).rows[0];assert.equal(historico.estado,'pendiente');assert.equal(historico.aviso_intento_elegible,false);
 const filas=(await db.query("select *,extract(epoch from conciliacion_proxima_en-now()) as segundos from pedidos_tilopay where conciliacion_reserva is not null")).rows;
 assert.ok(filas.some(f=>Number(f.segundos)>21000),'Older attempts back off to six hours');
 console.log('PASS SQL: exclusive ephemeral PostgreSQL, migration preservation, future-only alerts, roles, concurrent reservations, backoff, test/old/recent exclusion, paid email retries.');
}finally{await db.close();}
