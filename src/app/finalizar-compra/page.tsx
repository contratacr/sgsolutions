import {proveedoresCuenta} from '@/lib/supabase/proveedores-cuenta';
import {leerPerfilCompra} from '@/lib/perfil-compra-servidor';
import {leerAprobacion} from '@/lib/asesorias';
import { getTranslations } from "next-intl/server";
import { leerContenido } from "@/lib/contenido-servidor";
import { FinalizarCompra } from "@/components/finalizar-compra";
import { configuracionTilopay } from "@/lib/tilopay";
import { configuracionPedidosManuales } from "@/lib/pedidos-manuales";
export async function generateMetadata() {
  const t = await getTranslations("Compra");
  return { title: t("titulo"), robots: { index: false, follow: false }, referrer:"no-referrer" as const };
}
export default async function Compra({searchParams}:{searchParams:Promise<{asesoria?:string;acceso?:string}>}) {
  const parametros=await searchParams;
  const solicitud=await leerAprobacion(parametros.asesoria??"",parametros.acceso??"");
  const aprobacion=solicitud?{id:solicitud.id,token:solicitud.token!,articulos:solicitud.articulos,contacto:solicitud.contacto}:null;
  const perfilCompra=await leerPerfilCompra();
  const proveedores=perfilCompra?{google:false}:await proveedoresCuenta();
  const { pagos } = await leerContenido();
  return (
    <main id="contenido" className="contenedor compra-pagina">
      <FinalizarCompra sdkLocal={process.env.NODE_ENV==="development"&&process.env.SG_ENTORNO!=="produccion"} sdkDisponible={Boolean(configuracionTilopay()?.modo==="pruebas"&&process.env.TILOPAY_RETORNO_URL)} googleDisponible={proveedores.google} datosGuardados={perfilCompra?.datos} cuentaDisponible={Boolean(perfilCompra)} enlaceInvalido={Boolean((parametros.asesoria||parametros.acceso)&&!aprobacion)} aprobacion={aprobacion} pagos={pagos} tarjetaEnPruebas={process.env.TILOPAY_MODO !== "produccion"} tarjetaDisponible={Boolean(configuracionTilopay() && process.env.TILOPAY_RETORNO_URL)} pedidosManualesDisponibles={Boolean(configuracionPedidosManuales())} />
    </main>
  );
}
