import {buscarProductoPorRuta,rutaProducto} from "@/lib/rutas-productos";
import { notFound, permanentRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import {headers} from 'next/headers';
import { leerCatalogoPublico } from "@/lib/catalogo-servidor";
import { traducir } from "@/lib/catalogo-modelo";
import { FichaProducto } from "@/components/ficha-producto";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const c = await leerCatalogoPublico();
  const p = buscarProductoPorRuta(c.productos,id);
  if (!p) return {};
  const l = await getLocale();
  const host = (await headers()).get('host');
  const origen = host && /^(sgsolutions\.sgsolutions\.workers\.dev|(?:www\.)?sgsolutionscr\.com)$/.test(host)
    ? `https://${host}` : 'https://sgsolutionscr.com';
  const nombre = traducir(p.nombre, l);
  const descripcion = traducir(p.descripcion, l);
  return {
    alternates: {canonical: `${origen}${rutaProducto(p)}`},
    title: nombre,
    description: descripcion,
    openGraph: {
      title: nombre,
      description: descripcion,
      url: `${origen}${rutaProducto(p)}`,
      images: [{url: new URL(p.imagen, origen).href, alt: nombre}],
      type: 'website',
    },
  };
}
export default async function Producto({ params }: Props) {
  const { id } = await params;
  const c = await leerCatalogoPublico();
  const p = buscarProductoPorRuta(c.productos,id);
  if (!p) notFound();
  if(p.slug && id!==p.slug)permanentRedirect(rutaProducto(p));
  return (
    <main id="contenido" className="contenedor ficha-pagina">
      <FichaProducto
        producto={p}
        categoria={c.categorias.find((x) => x.id === p.categoria)!.nombre}
      />
    </main>
  );
}
