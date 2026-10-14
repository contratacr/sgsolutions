import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.SG_PGLITE_MODULE??'@electric-sql/pglite');const db=new PGlite();
await db.exec(`create role anon;create role authenticated;
create table solicitudes_asesoria(id integer primary key,estado text,creado_en timestamptz default now());
create table pedidos_manuales(id integer primary key,estado text,estado_entrega text,creado_en timestamptz default now());
create table pedidos_tilopay(id integer primary key,estado text,estado_entrega text,creado_en timestamptz default now());
revoke all on solicitudes_asesoria,pedidos_manuales,pedidos_tilopay from anon,authenticated;`);
await db.exec(await readFile('supabase/migrations/20261013000500_archivo_panel.sql','utf8'));
await db.exec("insert into solicitudes_asesoria(id,estado) values(1,'solicitada'),(2,'cancelada');insert into pedidos_manuales(id,estado,estado_entrega) values(1,'pagado','pendiente_preparar'),(2,'pagado','entregado'),(3,'cancelado','pendiente_preparar');insert into pedidos_tilopay(id,estado,estado_entrega) values(1,'pagado','pendiente_preparar'),(2,'pagado','entregado'),(3,'rechazado','pendiente_preparar'),(4,'pendiente','pendiente_preparar');");
for(const tabla of ['solicitudes_asesoria','pedidos_manuales','pedidos_tilopay']){
 await assert.rejects(()=>db.exec(`update ${tabla} set archivado_en=now() where id=1`),/invalid_archive/);
 await db.exec(`update ${tabla} set archivado_en=now() where id=2`);assert.ok((await db.query(`select archivado_en from ${tabla} where id=2`)).rows[0].archivado_en);
 await db.exec(`update ${tabla} set archivado_en=null where id=2`);assert.equal((await db.query(`select archivado_en from ${tabla} where id=2`)).rows[0].archivado_en,null);
}
await assert.rejects(()=>db.exec('update pedidos_tilopay set archivado_en=now() where id=4'),/invalid_archive/);
await db.exec("update pedidos_tilopay set creado_en=now()-interval '25 hours' where id=4;update pedidos_tilopay set archivado_en=now() where id=4;update pedidos_tilopay set estado='pagado' where id=4;");const tardio=(await db.query('select * from pedidos_tilopay where id=4')).rows[0];assert.equal(tardio.archivado_en,null);assert.equal(tardio.estado_entrega,'pendiente_preparar');
await db.exec('set role authenticated');await assert.rejects(()=>db.exec('update pedidos_tilopay set archivado_en=now()'),/permission denied/);await db.exec('reset role');
console.log('PASS: archivar/restaurar sin cambiar pagos, pedidos activos protegidos, abandono después de 24 horas y pago tardío vuelve a atención.');await db.close();
