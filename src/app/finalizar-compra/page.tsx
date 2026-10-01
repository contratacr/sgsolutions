import { getTranslations } from "next-intl/server";
import { leerContenido } from "@/lib/contenido-servidor";
import { FinalizarCompra } from "@/components/finalizar-compra";
import { configuracionTilopay } from "@/lib/tilopay";
export async function generateMetadata() {
  const t = await getTranslations("Compra");
  return { title: t("titulo"), robots: { index: false, follow: false } };
}
export default async function Compra() {
  const { pagos } = await leerContenido();
  return (
    <main id="contenido" className="contenedor compra-pagina">
      <FinalizarCompra pagos={pagos} tarjetaPruebaDisponible={Boolean(configuracionTilopay() && process.env.TILOPAY_RETORNO_URL)} />
    </main>
  );
}
