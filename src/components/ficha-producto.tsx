"use client";
import Link from "next/link";
import {ContadorCantidad} from './contador-cantidad';
import {AsesoriaWhatsApp} from "./asesoria-whatsapp";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { FotoProducto } from "./foto-producto";
import {
  traducir,
  colones,
  type CatalogoPublico,
  type Texto,
} from "@/lib/catalogo-modelo";
import { agregarProducto, useCarrito } from "@/lib/carrito";
import { useCatalogo } from "./datos-catalogo";
export function FichaProducto({
  producto: p,
  categoria,
}: {
  producto: CatalogoPublico["productos"][number];
  categoria: Texto;
}) {
  const a = useTranslations("Asesoria");
  const t = useTranslations("Ficha"),
    s = useTranslations("Tienda"),
    n = useTranslations("Navegacion"),
    l = useLocale(),
    datos = useCatalogo();
  const [cantidad,setCantidad]=useState(1);
  const [foto, setFoto] = useState(0);
  const fotos = [...new Set([p.imagen, ...(p.imagenes ?? [])])];
  const agregado = useCarrito().some((x) => x.id === p.id);
  return (
    <>
      <Link className="ficha-volver" href="/soluciones">
        <ArrowLeft size={17} />
        {t("volver")}
      </Link>
      <div className="ficha-grid">
        <section className="ficha-galeria" aria-label={t("galeria")}>
          <div className="ficha-foto">
            <FotoProducto src={fotos[foto]} alt={traducir(p.nombre, l)} />
          </div>
          {fotos.length > 1 && (
            <div className="ficha-miniaturas">
              {fotos.map((src, i) => (
                <button
                  key={src}
                  aria-label={t("foto", { numero: i + 1 })}
                  aria-pressed={foto === i}
                  onClick={() => setFoto(i)}
                >
                  <FotoProducto src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="ficha-compra">
          <p className="etiqueta">
            {p.marca} / {traducir(categoria, l)}
          </p>
          <h1>{traducir(p.nombre, l)}</h1>
          <p className="ficha-codigo">
            {t("codigo")}: {p.codigoFabricante || t("pendiente")}
          </p>
          <p>{traducir(p.descripcion, l)}</p>
          <div className="ficha-precio">
            <strong>
              {p.precio === null ? s("precioPendiente") : colones(p.precio)}
            </strong>
            {p.precio !== null && <small>{a("precioConIva")}</small>}
          </div>
          {p.disponibilidad==='agotado'&&<p className="ficha-stock">{s('agotado')}</p>}
          <p className="ficha-asesoria-nota">{a('fichaAyuda')}</p>
          <AsesoriaWhatsApp lineas={[{producto:p,cantidad}]} onSolicitar={()=>{datos.recordar([p]);if(!agregado&&p.disponibilidad!=='agotado')agregarProducto(p.id,cantidad,false);}}/>
          <div className="ficha-cantidad"><span>{t("cantidad")}</span><ContadorCantidad cantidad={cantidad} cambiar={setCantidad} nombre={traducir(p.nombre,l)}/></div>
          <button
            className="boton boton-contorno ficha-agregar"
            disabled={p.disponibilidad === "agotado"}
            onClick={() => {
              datos.recordar([p]);
              agregarProducto(p.id,cantidad);
            }}
          >
            <ShoppingCart size={19} aria-hidden="true" />
            {s("agregar")}
          </button>

          <div className="ficha-confianza">
            <span>
              <Truck size={20} />
              {t("entrega")}
            </span>
          </div>
        </section>
      </div>
      <section className="ficha-detalles">
        <div>
          <p className="etiqueta">{t("detalleEtiqueta")}</p>
          <h2>{t("especificaciones")}</h2>
          <p>{t("detalleTexto")}</p>
        </div>
        <div>
          <dl>
            <div>
              <dt>{t("marca")}</dt>
              <dd>{p.marca}</dd>
            </div>
            <div>
              <dt>{t("codigo")}</dt>
              <dd>{p.codigoFabricante || t("pendiente")}</dd>
            </div>
            <div>
              <dt>{t("categoria")}</dt>
              <dd>{traducir(categoria, l)}</dd>
            </div>
            {(p.especificaciones ?? []).map((e, i) => (
              <div key={i}>
                <dt>{traducir(e.nombre, l)}</dt>
                <dd>{traducir(e.valor, l)}</dd>
              </div>
            ))}
          </dl>
          <p className="ficha-descripcion-completa">
            {traducir(p.descripcion, l)}
          </p>
          {p.fichaTecnica && (
            <a href={p.fichaTecnica} target="_blank" rel="noopener noreferrer">
              {t("documento")}
              <span className="sr-only">{n("nuevaPestana")}</span>
            </a>
          )}
        </div>
      </section>
    </>
  );
}
