"use server";
import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import es from "../../../../messages/es.json";
import en from "../../../../messages/en.json";
import {leerTexto,textoCompatible} from '@/lib/textos-editables';
import { esquemaContenido } from "@/lib/contenido-modelo";
import {adminLocalDisponible,sesionLocal,guardarLocal} from '@/lib/admin-local';
export async function guardarContenido(datos: unknown, revision: number):Promise<{error?:string;revision?:number;campos?:(string|number)[][]}> {
  const local=await adminLocalDisponible();
  if(local&&!await sesionLocal())return {error:'sinPermiso'};
  const c = local?null:await crearClienteServidor();
  if (!local&&!c) return { error: "noDisponible" };
  const {
    data: { user },
  } = c?await c.auth.getUser():{data:{user:null}};
  if (!local&&!user) return { error: "sinPermiso" };
  const { data: perfil } = c&&user?await c
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle():{data:local?{rol:'administrador'}:null};
  if (perfil?.rol !== "administrador") return { error: "sinPermiso" };
  const p = esquemaContenido.safeParse(datos);
  if (!p.success) return {error:"validacion",campos:p.error.issues.map(x=>x.path.map(k=>typeof k==='number'?k:String(k)))};
  if (!Number.isInteger(revision) || revision < 0) return {error:"validacion"};
  delete p.data.textos['Marca.telefono'];delete p.data.textos['Marca.correo'];
  for(const [clave,valor] of Object.entries(p.data.textos))for(const l of ['es','en'] as const){
    const original=leerTexto(l==='es'?es:en,clave);
    if(typeof original!=='string'||!textoCompatible(original,valor[l]))return {error:'validacion',campos:[['textos',clave,l]]};
  }
  if(local){const resultado=await guardarLocal('contenido',p.data,revision);if(!resultado.error)revalidatePath('/','layout');return resultado;}
  const { data, error } = await c!.rpc("guardar_contenido", {
    privado: p.data,
    visible: { ...p.data, casos: p.data.casos.filter((x) => x.publicado) },
    revision_esperada: revision,
  });
  if (error)
    return {
      error: error.message.includes("CONFLICTO") ? "conflicto" : "error",
    };
  revalidatePath("/", "layout");
  return { revision: Number(data) };
}
