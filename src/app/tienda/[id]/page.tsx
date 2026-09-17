import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { leerCatalogoPublico } from "@/lib/catalogo-servidor";
import { traducir } from "@/lib/catalogo-modelo";
import { FichaProducto } from "@/components/ficha-producto";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const c = await leerCatalogoPublico();
  const p = c.productos.find((p) => p.id === id);
  if (!p) return {};
  const l = await getLocale();
  return {
    title: traducir(p.nombre, l),
    description: traducir(p.descripcion, l),
  };
}
export default async function Producto({ params }: Props) {
  const { id } = await params;
  const c = await leerCatalogoPublico();
  const p = c.productos.find((p) => p.id === id);
  if (!p) notFound();
  return (
    <main id="contenido" className="contenedor ficha-pagina">
      <FichaProducto
        producto={p}
        categoria={c.categorias.find((x) => x.id === p.categoria)!.nombre}
      />
    </main>
  );
}
