import "server-only";
import { cache } from "react";
import base from "./contenido-base.json";
import { esquemaContenido } from "./contenido-modelo";
import { crearClienteServidor } from "./supabase/servidor";
import {leerLocal} from './admin-local';
export const contenidoInicial = esquemaContenido.parse(base);
export const leerContenido = cache(async () => {
  const local=await leerLocal('contenido');
  if(local){const contenido=esquemaContenido.parse(local.contenido);return {...contenido,casos:contenido.casos.filter(c=>c.publicado)};}
  const c = await crearClienteServidor();
  if (!c) return contenidoInicial;
  const { data } = await c
    .from("contenido_publico")
    .select("contenido")
    .eq("id", 1)
    .maybeSingle();
  const p = esquemaContenido.safeParse(data?.contenido);
  return p.success ? p.data : contenidoInicial;
});
