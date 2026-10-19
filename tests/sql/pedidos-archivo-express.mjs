import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
for(const f of ['20260930000100_pedidos_tilopay.sql','20260930000200_pedidos_manuales.sql','20261004000100_asesorias.sql','20261013000400_estado_entrega.sql','20261013000500_archivo_panel.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
for(let n=1;n<=3;n++){
 if(n===1)await db.query(`insert into public.pedidos_manuales(id,estado,metodo,total_productos,total_cobrar,cliente,articulos) values($1,'pagado','sinpe',1000,1000,'{"modalidad":"express"}','[]')`,[id(n)]);
 else await db.query(`insert into public.pedidos_tilopay(id,estado,entorno,total,cliente,articulos) values($1,'pagado','produccion',1000,'{"modalidad":"express"}','[]')`,[id(n)]);
 const tabla=n===1?'pedidos_manuales':'pedidos_tilopay';await db.query(`update public.${tabla} set estado_entrega='preparando' where id=$1`,[id(n)]);
 await assert.rejects(()=>db.query(`update public.${tabla} set estado_entrega='enviado' where id=$1`,[id(n)]),/invalid_delivery_transition/);
}
await db.query(`insert into public.pedidos_tilopay(id,estado,entorno,total,cliente,articulos) values($1,'pendiente','produccion',1000,'{}','[]')`,[id(4)]);
await assert.rejects(()=>db.query('update public.pedidos_tilopay set archivado_en=now() where id=$1',[id(4)]),/invalid_archive/);
await db.exec(await readFile('supabase/migrations/20261019000200_pedidos_archivo_y_express.sql','utf8'));
for(let n=1;n<=3;n++){
 const tabla=n===1?'pedidos_manuales':'pedidos_tilopay';await db.query(`update public.${tabla} set estado_entrega='enviado' where id=$1`,[id(n)]);
 const p=(await db.query(`select estado,estado_entrega,entrega_actualizada_en from public.${tabla} where id=$1`,[id(n)])).rows[0];assert.equal(p.estado,'pagado');assert.equal(p.estado_entrega,'enviado');assert.ok(p.entrega_actualizada_en);
 await assert.rejects(()=>db.query(`update public.${tabla} set archivado_en=now(),archivado_motivo='Envío en curso' where id=$1`,[id(n)]),/invalid_archive/);
}
await assert.rejects(()=>db.query('update public.pedidos_tilopay set archivado_en=now() where id=$1',[id(4)]),/invalid_archive/);
await db.query("update public.pedidos_tilopay set archivado_en=now(),archivado_motivo='  Demostración sin pago  ' where id=$1",[id(4)]);
let p=(await db.query('select * from public.pedidos_tilopay where id=$1',[id(4)])).rows[0];assert.equal(p.estado,'pendiente');assert.equal(p.archivado_motivo,'Demostración sin pago');assert.ok(p.archivado_en);
await assert.rejects(()=>db.query("update public.pedidos_tilopay set estado_entrega='preparando' where id=$1",[id(4)]),/payment_required/);
await assert.rejects(()=>db.query("update public.pedidos_tilopay set archivado_motivo='Cambiar historial' where id=$1",[id(4)]),/archive_reason_immutable/);
await db.query("update public.pedidos_tilopay set estado='pagado' where id=$1",[id(4)]);p=(await db.query('select * from public.pedidos_tilopay where id=$1',[id(4)])).rows[0];assert.equal(p.archivado_en,null);assert.equal(p.archivado_motivo,'Demostración sin pago');assert.equal(p.total,'1000.00');
await db.query(`insert into public.pedidos_manuales(id,estado,metodo,total_productos,cliente,articulos) values($1,'pendiente_pago','sinpe',1000,'{}','[]')`,[id(5)]);
await db.query("update public.pedidos_manuales set archivado_en=now(),archivado_motivo='Compra abandonada' where id=$1",[id(5)]);
await db.query('update public.pedidos_manuales set archivado_en=null where id=$1',[id(5)]);p=(await db.query('select * from public.pedidos_manuales where id=$1',[id(5)])).rows[0];assert.equal(p.archivado_motivo,'Compra abandonada');assert.equal(p.estado,'pendiente_pago');
for(const tabla of ['pedidos_manuales','pedidos_tilopay']){
 const digitalId=tabla==='pedidos_manuales'?id(6):id(7);
 await db.query(tabla==='pedidos_manuales'?`insert into public.pedidos_manuales(id,estado,metodo,total_productos,cliente,articulos) values($1,'pagado','sinpe',42000,'{"modalidad":"digital"}','[]')`:`insert into public.pedidos_tilopay(id,estado,entorno,total,cliente,articulos) values($1,'pagado','pruebas',42000,'{"modalidad":"digital"}','[]')`,[digitalId]);
 await db.query(`update public.${tabla} set estado_entrega='preparando' where id=$1`,[digitalId]);
 await assert.rejects(()=>db.query(`update public.${tabla} set estado_entrega='enviado' where id=$1`,[digitalId]),/invalid_delivery_transition/);
 await db.query(`update public.${tabla} set estado_entrega='entregado' where id=$1`,[digitalId]);
 assert.equal((await db.query(`select estado_entrega from public.${tabla} where id=$1`,[digitalId])).rows[0].estado_entrega,'entregado');
}
await db.exec(`create table public.favoritos(producto_id text constraint favoritos_producto_id_check check (producto_id ~ '^(eurocomp|empresa-intcomex)-[a-z0-9-]{1,60}$'));insert into public.favoritos values('eurocomp-existente');`);
await db.exec(await readFile('supabase/migrations/20261019000300_favorito_software.sql','utf8'));
await db.exec("insert into public.favoritos values('software-intcomex-se027mse92')");await assert.rejects(()=>db.exec("insert into public.favoritos values('software-intcomex-otro')"),/check constraint/);assert.equal((await db.query('select count(*) as n from public.favoritos')).rows[0].n,2);
await db.exec('set role anon');await assert.rejects(()=>db.exec('select * from public.pedidos_tilopay'),/permission denied/);
console.log('Reproducidos y corregidos: tres Express (SINPE y tarjeta), archivo inmediato con motivo, restauración, pago tardío y permisos.');await db.close();
