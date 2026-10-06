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
  const { pagos } = await leerContenido();
  return (
    <main id="contenido" className="contenedor compra-pagina">
      <FinalizarCompra enlaceInvalido={Boolean((parametros.asesoria||parametros.acceso)&&!aprobacion)} aprobacion={aprobacion} pagos={pagos} tarjetaPruebaDisponible={Boolean(configuracionTilopay() && process.env.TILOPAY_RETORNO_URL)} pedidosManualesDisponibles={Boolean(configuracionPedidosManuales())} />
    </main>
  );
}
