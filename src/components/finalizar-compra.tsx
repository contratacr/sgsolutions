"use client";
import type { Contenido } from "@/lib/contenido-modelo";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Landmark,
  Smartphone,
} from "lucide-react";
import { useCatalogo } from "./datos-catalogo";
import { useCarrito } from "@/lib/carrito";
import { colones, traducir } from "@/lib/catalogo-modelo";
import { enlaceWhatsApp } from "@/lib/empresa";
import { FotoProducto } from "./foto-producto";
const provincias = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
];
export function FinalizarCompra({ pagos }: { pagos: Contenido["pagos"] }) {
  const t = useTranslations("Compra"),
    n = useTranslations("Navegacion"),
    l = useLocale(),
    c = useCatalogo(),
    lineas = useCarrito();
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [entrega, setEntrega] = useState(false),
    [factura, setFactura] = useState(false),
    [otro, setOtro] = useState(false),
    [pago, setPago] = useState("sinpe"),
    [revision, setRevision] = useState<Record<string, string> | null>(null);
  const productos = lineas.flatMap((x) => {
    const p = c.productos.find((p) => p.id === x.id);
    return p ? [{ ...x, p }] : [];
  });
  const bloqueado =
    c.errorCarrito ||
    productos.length !== lineas.length ||
    productos.some((x) => x.p.disponibilidad === "agotado");
  const pendiente = productos.some((x) => x.p.precio === null),
    total = productos.reduce((s, x) => s + (x.p.precio ?? 0) * x.cantidad, 0);
  function revisar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    ) as Record<string, string>;
    setBorrador(datos);
    setRevision(datos);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const mensaje = revision
    ? [
        t("saludo"),
        ...Object.entries(revision)
          .filter(([k, v]) => v && k !== "consentimiento")
          .map(
            ([k, v]) =>
              `${t(k)}: ${["modalidad", "pago", "contacto", "factura"].includes(k) ? t(v) : v}`,
          ),
        ...productos.map(
          (x) =>
            `${x.cantidad} × ${traducir(x.p.nombre, l)} (${x.p.codigoFabricante}) — ${x.p.precio === null ? t("pendiente") : colones(x.p.precio * x.cantidad)}`,
        ),
        `${t("subtotal")}: ${pendiente ? t("pendiente") : colones(total)}`,
        t("confirmacion"),
      ].join("\n")
    : "";
  const campo = (
    name: string,
    required = true,
    type = "text",
    autoComplete?: string,
  ) => (
    <label key={name}>
      {t(name)}
      <input
        defaultValue={borrador[name] ?? ""}
        name={name}
        type={type}
        required={required}
        maxLength={name === "direccion" ? 350 : 150}
        autoComplete={autoComplete}
      />
    </label>
  );
  return (
    <>
      <Link className="ficha-volver" href="/tienda">
        <ArrowLeft size={17} />
        {t("volver")}
      </Link>
      <header className="compra-cabecera">
        <p className="etiqueta">{t("etiqueta")}</p>
        <h1>{t("titulo")}</h1>
        <p>{t("intro")}</p>
      </header>
      {!lineas.length ? (
        <div className="compra-bloque">
          <h2>{t("vacio")}</h2>
          <Link className="boton boton-azul" href="/tienda">
            {t("volver")}
          </Link>
        </div>
      ) : (
        <div className="compra-grid">
          <div>
            {revision ? (
              <section className="compra-bloque">
                <p className="etiqueta">{t("revision")}</p>
                <h2>{t("revisarTitulo")}</h2>
                <dl className="pedido-datos">
                  {Object.entries(revision)
                    .filter(([k, v]) => v && k !== "consentimiento")
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{t(k)}</dt>
                        <dd>
                          {[
                            "modalidad",
                            "pago",
                            "contacto",
                            "factura",
                          ].includes(k)
                            ? t(v)
                            : v}
                        </dd>
                      </div>
                    ))}
                </dl>
                <p>{t("confirmacion")}</p>
                {!bloqueado && (
                  <a
                    className="boton boton-naranja"
                    href={enlaceWhatsApp(mensaje)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("enviar")}
                    <ArrowUpRight size={18} />
                    <span className="sr-only">{n("nuevaPestana")}</span>
                  </a>
                )}
                <button
                  className="pedido-volver"
                  onClick={() => setRevision(null)}
                >
                  {t("editar")}
                </button>
              </section>
            ) : (
              <form onSubmit={revisar}>
                <section className="compra-bloque">
                  <h2>
                    <span>01</span>
                    {t("contactoTitulo")}
                  </h2>
                  <div className="compra-campos">
                    {campo("nombre", true, "text", "given-name")}
                    {campo("apellidos", true, "text", "family-name")}
                    {campo("correo", true, "email", "email")}
                    {campo("telefono", true, "tel", "tel")}
                    <label>
                      {t("contacto")}
                      <select
                        name="contacto"
                        defaultValue={borrador.contacto ?? "whatsapp"}
                      >
                        <option value="whatsapp">{t("whatsapp")}</option>
                        <option value="llamada">{t("llamada")}</option>
                        <option value="email">{t("email")}</option>
                      </select>
                    </label>
                  </div>
                </section>
                <section className="compra-bloque">
                  <h2>
                    <span>02</span>
                    {t("entregaTitulo")}
                  </h2>
                  <fieldset className="compra-opciones">
                    <legend className="sr-only">{t("modalidad")}</legend>
                    {["retiro", "envio"].map((m, i) => (
                      <label key={m}>
                        <input
                          type="radio"
                          name="modalidad"
                          value={m}
                          checked={entrega === (i === 1)}
                          onChange={() => setEntrega(i === 1)}
                        />
                        <strong>{t(m)}</strong>
                        <small>{t(`${m}Detalle`)}</small>
                      </label>
                    ))}
                  </fieldset>
                  {entrega && (
                    <div className="compra-campos">
                      <label>
                        {t("provincia")}
                        <select
                          name="provincia"
                          defaultValue={borrador.provincia ?? ""}
                          required
                        >
                          <option value="">{t("seleccione")}</option>
                          {provincias.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                      {campo("canton")}
                      {campo("distrito")}
                      {campo("direccion", true, "text", "street-address")}
                      {campo("apartamento", false)}
                      {campo("postal", false, "text", "postal-code")}
                      <label className="compra-check">
                        <input
                          type="checkbox"
                          checked={otro}
                          onChange={(e) => setOtro(e.target.checked)}
                        />
                        {t("otro")}
                      </label>
                      {otro && (
                        <>
                          {campo("receptor")}
                          {campo("telefonoReceptor", true, "tel")}
                        </>
                      )}
                    </div>
                  )}
                </section>
                <section className="compra-bloque">
                  <h2>
                    <span>03</span>
                    {t("facturacionTitulo")}
                  </h2>
                  <label>
                    {t("factura")}
                    <select
                      name="factura"
                      value={factura ? "electronica" : "tiquete"}
                      onChange={(e) =>
                        setFactura(e.target.value === "electronica")
                      }
                    >
                      <option value="tiquete">{t("tiquete")}</option>
                      <option value="electronica">{t("electronica")}</option>
                    </select>
                  </label>
                  {factura && (
                    <div className="compra-campos">
                      {campo("identificacion")}
                      {campo("razonSocial")}
                      {campo("actividad", false)}
                      {campo("correoFactura", true, "email")}
                      {campo("direccionFiscal")}
                    </div>
                  )}
                </section>
                <section className="compra-bloque">
                  <h2>
                    <span>04</span>
                    {t("pagoTitulo")}
                  </h2>
                  <fieldset className="compra-metodos">
                    <legend>{t("pago")}</legend>
                    {[
                      { id: "sinpe", Icon: Smartphone },
                      { id: "transferencia", Icon: Landmark },
                      { id: "tarjeta", Icon: CreditCard },
                    ].map(({ id, Icon }) => (
                      <label key={id} data-activo={pago === id}>
                        <input
                          type="radio"
                          name="pago"
                          value={id}
                          checked={pago === id}
                          onChange={() => setPago(id)}
                        />
                        <Icon size={23} />
                        <span>
                          <strong>{t(id)}</strong>
                          <small>{t(`${id}Detalle`)}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="compra-aviso">
                    <ShieldCheck size={19} />
                    {t(
                      pago === "tarjeta" ? "tarjetaPendiente" : "pagoPendiente",
                    )}
                  </p>
                  {pago !== "tarjeta" && (
                    <details className="compra-cuentas">
                      <summary>{t("verCuentas")}</summary>
                      <p>{pagos.titular}</p>
                      {pago === "sinpe" ? (
                        <strong>
                          {pagos.sinpe.replace(/(\d{4})(\d{4})/, "$1 $2")}
                        </strong>
                      ) : (
                        pagos.cuentas.map((c) => (
                          <div key={c.iban}>
                            <strong>{c.banco}</strong>
                            <code>{c.iban}</code>
                          </div>
                        ))
                      )}
                      <p>{t("referencia")}</p>
                    </details>
                  )}
                  <label>
                    {t("notas")}
                    <textarea
                      defaultValue={borrador.notas ?? ""}
                      name="notas"
                      rows={3}
                      maxLength={600}
                    />
                  </label>
                  <label className="compra-check">
                    <input type="checkbox" name="consentimiento" required />
                    {t("consentimiento")}
                  </label>
                  <button
                    className="boton boton-naranja"
                    type="submit"
                    disabled={bloqueado}
                  >
                    {t("revisar")}
                    <ArrowUpRight size={19} />
                  </button>
                </section>
              </form>
            )}
          </div>
          <aside className="compra-resumen">
            <p className="etiqueta">{t("resumen")}</p>
            <h2>{t("seleccion")}</h2>
            {productos.map(({ p, cantidad }) => (
              <div className="compra-linea" key={p.id}>
                <div>
                  <FotoProducto src={p.imagen} alt={traducir(p.nombre, l)} />
                </div>
                <p>
                  <Link href={`/tienda/${p.id}`}>{traducir(p.nombre, l)}</Link>
                  <small>
                    {cantidad} ×{" "}
                    {p.precio === null ? t("pendiente") : colones(p.precio)}
                  </small>
                </p>
              </div>
            ))}
            <dl>
              <div>
                <dt>{t("subtotal")}</dt>
                <dd>{pendiente ? t("pendiente") : colones(total)}</dd>
              </div>
              <div>
                <dt>{t("entregaTitulo")}</dt>
                <dd>{t(entrega ? "envioPorConfirmar" : "retiroDetalle")}</dd>
              </div>
            </dl>
            <p>{t("iva")}</p>
            {bloqueado && <p role="alert">{t("carga")}</p>}
            <p className="compra-aviso">{t("confirmacion")}</p>
          </aside>
        </div>
      )}
    </>
  );
}
