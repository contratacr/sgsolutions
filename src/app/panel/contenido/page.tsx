import {exigirAdminMfa} from '@/lib/acceso-panel';
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { contenidoInicial } from "@/lib/contenido-servidor";
import { esquemaContenido } from "@/lib/contenido-modelo";
import { EditorContenido } from "@/components/editor-contenido";
import es from "../../../../messages/es.json";
import en from "../../../../messages/en.json";
import {textosEditables} from '@/lib/textos-editables';
import {sesionLocal,leerLocal} from '@/lib/admin-local';
export async function generateMetadata(){const t=await getTranslations('AdminContenido');return {title:t('titulo'),robots:{index:false,follow:false}};}
export default async function Pagina() {
 await exigirAdminMfa();
  const local=await sesionLocal();
  const c = local?null:await crearClienteServidor();
  if (!local && !c) redirect("/admin");
  const {
    data: { user },
  } = c?await c.auth.getUser():{data:{user:null}};
  if (!local && !user) redirect("/admin");
  const { data: perfil } = c&&user?await c
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle():{data:local};
  if (perfil?.rol !== "administrador") redirect("/panel");
  const t = await getTranslations("AdminContenido");
  const { data, error } = local?{data:await leerLocal('contenido'),error:null}:await c!
    .from("contenido_privado")
    .select("contenido,revision")
    .eq("id", 1)
    .maybeSingle();
  if (error)
    return (
      <main id="contenido" className="contenedor seccion">
        <h1>{t("titulo")}</h1>
        <p>{t("noDisponible")}</p>
      </main>
    );
  const textos=textosEditables(es,en);
  return (
    <main id="contenido" className="contenedor seccion">
      <h1>{t("titulo")}</h1>
      <EditorContenido
        inicial={
          data ? esquemaContenido.parse(data.contenido) : contenidoInicial
        }
        revisionInicial={data?.revision ?? 0}
        textos={textos}
      />
    </main>
  );
}
