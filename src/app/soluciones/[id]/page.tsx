import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import {headers} from 'next/headers';
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
  const host = (await headers()).get('host');
  const origen = host && /^(sgsolutions\.soportecontratacr\.workers\.dev|(?:www\.)?sgsolutionscr\.com)$/.test(host)
    ? `https://${host}` : 'https://sgsolutions.soportecontratacr.workers.dev';
  const nombre = traducir(p.nombre, l);
  const descripcion = traducir(p.descripcion, l);
  return {
    title: nombre,
    description: descripcion,
    openGraph: {
      title: nombre,
      description: descripcion,
      url: `${origen}/soluciones/${encodeURIComponent(id)}`,
      images: [{url: new URL(p.imagen, origen).href, alt: nombre}],
      type: 'website',
    },
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
