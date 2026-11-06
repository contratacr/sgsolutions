import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create function public.es_administrador_activo() returns boolean language sql as $$select true$$;`);
await db.exec(await readFile('supabase/migrations/20260909000200_catalogo.sql','utf8'));
for(const tabla of ['pedidos_manuales','pedidos_tilopay'])await db.exec(`create table public.${tabla}(id uuid primary key,entorno text,estado text,articulos jsonb,cliente jsonb not null default '{}'::jsonb);grant insert,update,select on public.${tabla} to service_role;`);
await db.exec("create table public.solicitudes_asesoria(id uuid primary key,estado text);");
for(const f of ['20261013000400_estado_entrega.sql','20261013000500_archivo_panel.sql','20261019000200_pedidos_archivo_y_express.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
await db.exec(await readFile('supabase/migrations/20261105000100_inventario_manual.sql','utf8'));
const producto={id:'manual-qa',origen:'manual',stockManual:3,publicado:true};
await db.query('insert into public.catalogo_privado values(1,$1,1)',[{productos:[producto]}]);
await db.query('insert into public.catalogo_publico values(1,$1)',[{productos:[{...producto,stockDisponible:3}]}]);
const unidades=async()=>Number((await db.query("select contenido->'productos'->0->>'stockManual' n from public.catalogo_privado")).rows[0].n);
const pedido=(n)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function insertar(n,cantidad,tabla='pedidos_manuales',entorno='produccion',lineas){await db.query(`insert into public.${tabla}(id,entorno,estado,articulos) values($1,$2,$3,$4)`,[pedido(n),entorno,tabla==='pedidos_manuales'?'pendiente_pago':'iniciado',lineas??[{id:'manual-qa',cantidad}]]);}
async function estado(n,e,tabla='pedidos_manuales'){await db.query(`update public.${tabla} set estado=$1 where id=$2`,[e,pedido(n)]);}
await insertar(1,2);assert.equal(await unidades(),1);
await assert.rejects(()=>insertar(2,2),/STOCK_INSUFICIENTE/);assert.equal(await unidades(),1);assert.equal((await db.query('select * from public.pedidos_manuales')).rows.length,1);
// Two competing checkouts for the final unit: exactly one can reserve it.
const carreras=await Promise.allSettled([insertar(3,1),insertar(4,1)]);assert.equal(carreras.filter(r=>r.status==='fulfilled').length,1);assert.equal(await unidades(),0);
await estado(1,'pagado');await estado(1,'pagado');assert.equal(await unidades(),0);
const ganador=carreras[0].status==='fulfilled'?3:4;await estado(ganador,'cancelado');await estado(ganador,'cancelado');assert.equal(await unidades(),1);
// Rollback must restore earlier lines when a later item has insufficient stock.
await assert.rejects(()=>insertar(5,0,'pedidos_manuales','produccion',[{id:'manual-qa',cantidad:1},{id:'manual-qa',cantidad:1}]),/STOCK_INSUFICIENTE/);assert.equal(await unidades(),1);
await insertar(6,1,'pedidos_tilopay');assert.equal(await unidades(),0);
await db.exec('select public.liberar_reservas_inventario()');assert.equal(await unidades(),0);
await db.query("update public.pedidos_tilopay set archivado_en=now(),archivado_motivo='Intento abandonado revisado' where id=$1",[pedido(6)]);assert.equal(await unidades(),1);
await insertar(7,1);await estado(7,'comprobante_recibido');await db.exec('select public.liberar_reservas_inventario()');assert.equal(await unidades(),0);
await assert.rejects(()=>db.query("select public.guardar_catalogo($1,$2,(select revision from public.catalogo_privado))",[{productos:[]},{productos:[]}]),/INVENTARIO_CON_RESERVAS/);
// Late payment is retained as a real payment but raises a fulfilment exception.
await estado(6,'pagado','pedidos_tilopay');assert.equal((await db.query('select inventario_alerta from public.pedidos_tilopay where id=$1',[pedido(6)])).rows[0].inventario_alerta,true);assert.equal(await unidades(),0);
await assert.rejects(()=>db.query("update public.pedidos_tilopay set estado_entrega='enviado' where id=$1",[pedido(6)]),/INVENTARIO_REQUIERE_REVISION/);
await estado(7,'cancelado');assert.equal(await unidades(),1);
await insertar(8,99,'pedidos_tilopay','pruebas');assert.equal(await unidades(),1);
await assert.rejects(()=>db.query("update public.pedidos_manuales set entorno='pruebas' where id=$1",[pedido(1)]),/ENTORNO_INMUTABLE/);
await assert.rejects(()=>db.query("select public.guardar_catalogo($1,$2,1)",[{productos:[producto]},{productos:[producto]}]),/CONFLICTO/);
// Replenishment allows an explicit retry to resolve the late-payment exception.
await db.query("update public.pedidos_tilopay set inventario_alerta=false where id=$1",[pedido(6)]);
assert.equal(await unidades(),0);assert.equal((await db.query('select inventario_alerta from public.pedidos_tilopay where id=$1',[pedido(6)])).rows[0].inventario_alerta,false);
await db.query("update public.pedidos_tilopay set estado_entrega='preparando' where id=$1",[pedido(6)]);
await estado(6,'pagado','pedidos_tilopay');assert.equal(await unidades(),0);
await db.query("select public.guardar_catalogo($1,$2,(select revision from public.catalogo_privado))",[{productos:[{...producto,stockManual:2}]},{productos:[{...producto,stockDisponible:2}]}]);
await insertar(9,1);await db.query("update public.pedidos_manuales set archivado_en=now(),archivado_motivo='Prueba autorizada' where id=$1",[pedido(9)]);assert.equal(await unidades(),2);
await insertar(10,1);await db.exec("update public.reservas_inventario_manual set vence_en=now()-interval '1 minute' where estado='reservado' and fuente='manual';select public.liberar_reservas_inventario();select public.liberar_reservas_inventario();");assert.equal(await unidades(),2);
await db.exec('set role anon');await assert.rejects(()=>db.exec('select * from public.reservas_inventario_manual'),/permission denied/);await assert.rejects(()=>db.exec('select public.liberar_reservas_inventario()'),/permission denied/);
await db.exec('reset role;set role authenticated');await assert.rejects(()=>db.exec("select public.ajustar_existencias_manual('manual-qa',99)"),/permission denied/);
await db.exec('reset role');assert.equal((await db.query("select contenido->'productos'->0->>'stockDisponible' n from public.catalogo_publico")).rows[0].n,'2');
await db.close();console.log('Inventario SQL: reservas atómicas, concurrencia, pago idempotente, cancelación, expiración, comprobante, pago tardío, sandbox, revisión y permisos aprobados.');
