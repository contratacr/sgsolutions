import {z} from 'zod';
export const entidadesSoporte=['tickets','empresas','equipos','mantenimientos'] as const;
export type EntidadSoporte=typeof entidadesSoporte[number];
const texto=(max:number)=>z.string().trim().max(max);
const opcional=(max:number)=>texto(max).default('');
const uuid=z.union([z.uuid(),z.literal('')]).transform(v=>v||null).nullable().default(null);
export const estadosTicket=['pendiente','en_proceso','resuelto','cerrado'] as const;
export const esquemasSoporte={
 empresas:z.strictObject({razon_social:texto(150).min(2),identificacion:texto(30).min(3),telefono:opcional(30),correo:z.union([z.email().max(254),z.literal('')]).default(''),direccion:opcional(200)}),
 equipos:z.strictObject({nombre:texto(100).min(2),tipo:texto(50).min(2),marca:opcional(80),modelo:opcional(80),numero_serie:texto(100).min(1),estado:z.enum(['operativo','mantenimiento','fuera_servicio']),empresa_id:uuid,cliente_nombre:opcional(150)}).refine(d=>Boolean(d.empresa_id)!==Boolean(d.cliente_nombre),{message:'propietario',path:['empresa_id']}),
 tickets:z.strictObject({asunto:texto(150).min(3),descripcion:texto(2000).min(5),categoria:opcional(50),prioridad:z.enum(['baja','media','alta']),estado:z.enum(estadosTicket),solucion:opcional(2000),empresa_id:uuid,equipo_id:uuid,tecnico_id:uuid}).refine(d=>!['resuelto','cerrado'].includes(d.estado)||d.solucion.length>=5,{message:'solucion',path:['solucion']}),
 mantenimientos:z.strictObject({equipo_id:z.uuid(),ticket_id:uuid,tecnico_id:uuid,tipo:z.enum(['preventivo','correctivo']),fecha:z.iso.date().refine(v=>v>='2000-01-01'&&v<='2100-12-31'),descripcion:texto(1000).min(5),observaciones:opcional(1000),completado:z.boolean()})
};
export type FilaSoporte={id:string;numero:number;version:number;archivado:boolean;creado_en:string;actualizado_en:string}&Record<string,string|number|boolean|null>;
export type OpcionSoporte={id:string;nombre:string};
export type DatosSoporte={filas:FilaSoporte[];total:number;empresas:OpcionSoporte[];equipos:(OpcionSoporte&{empresa_id:string|null})[];tecnicos:OpcionSoporte[];tickets:(OpcionSoporte&{equipo_id:string|null})[];historial:{id:number;entidad:string;registro_id:string;accion:string;fecha:string;actor_nombre:string|null}[]};
export const camposSoporte:Record<EntidadSoporte,{nombre:string;tipo?:'textarea'|'select'|'date'|'checkbox'|'email';max?:number;obligatorio?:boolean;opciones?:readonly string[]}[]>={
 empresas:[{nombre:'razon_social',max:150,obligatorio:true},{nombre:'identificacion',max:30,obligatorio:true},{nombre:'telefono',max:30},{nombre:'correo',tipo:'email',max:254},{nombre:'direccion',tipo:'textarea',max:200}],
 equipos:[{nombre:'nombre',max:100,obligatorio:true},{nombre:'tipo',max:50,obligatorio:true},{nombre:'marca',max:80},{nombre:'modelo',max:80},{nombre:'numero_serie',max:100,obligatorio:true},{nombre:'estado',tipo:'select',opciones:['operativo','mantenimiento','fuera_servicio']},{nombre:'empresa_id',tipo:'select'},{nombre:'cliente_nombre',max:150}],
 tickets:[{nombre:'asunto',max:150,obligatorio:true},{nombre:'descripcion',tipo:'textarea',max:2000,obligatorio:true},{nombre:'categoria',max:50},{nombre:'prioridad',tipo:'select',opciones:['media','alta','baja']},{nombre:'estado',tipo:'select',opciones:estadosTicket},{nombre:'empresa_id',tipo:'select'},{nombre:'equipo_id',tipo:'select'},{nombre:'tecnico_id',tipo:'select'},{nombre:'solucion',tipo:'textarea',max:2000}],
 mantenimientos:[{nombre:'equipo_id',tipo:'select',obligatorio:true},{nombre:'ticket_id',tipo:'select'},{nombre:'tecnico_id',tipo:'select'},{nombre:'tipo',tipo:'select',opciones:['preventivo','correctivo']},{nombre:'fecha',tipo:'date',obligatorio:true},{nombre:'descripcion',tipo:'textarea',max:1000,obligatorio:true},{nombre:'observaciones',tipo:'textarea',max:1000},{nombre:'completado',tipo:'checkbox'}]
};
