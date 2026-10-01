"use client";
import {medir} from '@/lib/analitica-cliente';
import type { Contenido } from "@/lib/contenido-modelo";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
import {enlaceProductoParaWhatsApp, mensajePedidoWhatsApp} from '@/lib/mensaje-pedido-whatsapp';
import {costoEntrega} from '@/lib/envio';
import { FotoProducto } from "./foto-producto";
import { desplazarContenido } from "@/lib/desplazar-contenido";
const provincias = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
];
export function FinalizarCompra({ pagos, tarjetaPruebaDisponible = false, pedidosManualesDisponibles = false }: { pagos: Contenido["pagos"]; tarjetaPruebaDisponible?: boolean; pedidosManualesDisponibles?: boolean }) {
  const t = useTranslations("Compra"),
    w = useTranslations('MensajePedido'),
    n = useTranslations("Navegacion"),
    l = useLocale(),
    c = useCatalogo(),
    lineas = useCarrito();
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [entrega, setEntrega] = useState(false),
    [factura, setFactura] = useState(false),
    [otro, setOtro] = useState(false),
    [pago, setPago] = useState("sinpe"),
    [revision, setRevision] = useState<Record<string, string> | null>(null),
    [procesando, setProcesando] = useState(false),
    [errorPago, setErrorPago] = useState(false),
    [errorPedido, setErrorPedido] = useState(false),
    [errorFormulario, setErrorFormulario] = useState(false);
  const entregaCampos = useRef<HTMLDivElement>(null),
    receptorCampos = useRef<HTMLDivElement>(null),
    facturaCampos = useRef<HTMLDivElement>(null),
    pagoDatos = useRef<HTMLDetailsElement>(null),
    desplazamientoPendiente = useRef<"entrega" | "receptor" | "factura" | "pago" | null>(null);
  useEffect(() => {
    const destino = desplazamientoPendiente.current;
    if (!destino) return;
    desplazamientoPendiente.current = null;
    desplazarContenido({ entrega: entregaCampos, receptor: receptorCampos, factura: facturaCampos, pago: pagoDatos }[destino].current);
  }, [entrega, otro, factura, pago]);
  const productos = lineas.flatMap((x) => {
    const p = c.productos.find((p) => p.id === x.id);
    return p ? [{ ...x, p }] : [];
  });
  const bloqueado =
    c.errorCarrito ||
    productos.length !== lineas.length ||
    productos.some((x) => x.p.disponibilidad === "agotado");
  const pendiente = productos.some((x) => x.p.precio === null),
    subtotal = productos.reduce((s, x) => s + (x.p.precio ?? 0) * x.cantidad, 0),
    envio = costoEntrega(entrega ? 'envio' : 'retiro'),
    total = subtotal + envio;
  function revisar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorFormulario(false);
    const datos = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    ) as Record<string, string>;
    setBorrador(datos);
    setRevision(datos);
    medir('pedido_revisado');
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function pagarConTarjeta() {
    if (!revision || procesando || entrega || pendiente || bloqueado) return;
    setProcesando(true);
    setErrorPago(false);
    try {
      const respuesta = await fetch('/api/pagos/tilopay/iniciar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nombre: revision.nombre, apellidos: revision.apellidos, correo: revision.correo,
          telefono: revision.telefono, consentimiento: revision.consentimiento === 'on',
          articulos: productos.map(x => ({ id: x.p.id, cantidad: x.cantidad })),
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || typeof datos.url !== 'string') throw new Error('PAGO_NO_DISPONIBLE');
      window.location.assign(datos.url);
    } catch {
      setErrorPago(true);
      setProcesando(false);
    }
  }
  async function crearPedidoManual() {
    if (!revision || procesando || bloqueado || pendiente || !['sinpe', 'transferencia'].includes(pago)) return;
    setProcesando(true); setErrorPedido(false);
    try {
      const respuesta = await fetch('/api/pedidos/manual', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idioma: l, datos: revision, metodo: pago, articulos: productos.map(x => ({ id: x.p.id, cantidad: x.cantidad })) }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok || typeof datos.url !== 'string' || !datos.url.startsWith('/finalizar-compra/pedido?')) throw new Error('PEDIDO_NO_DISPONIBLE');
      window.location.assign(datos.url);
    } catch { setErrorPedido(true); setProcesando(false); }
  }
  const mensaje = revision ? mensajePedidoWhatsApp({
    lineas: productos.map(x => ({cantidad: x.cantidad, nombre: traducir(x.p.nombre, l), codigo: x.p.codigoFabricante, precio: x.p.precio === null ? t('pendiente') : colones(x.p.precio * x.cantidad)})),
    subtotal: pendiente ? t('pendiente') : colones(subtotal),
    costoEnvio: colones(costoEntrega(revision.modalidad === 'envio' ? 'envio' : 'retiro')),
    total: pendiente ? t('pendiente') : colones(subtotal + costoEntrega(revision.modalidad === 'envio' ? 'envio' : 'retiro')),
    nombre: [revision.nombre, revision.apellidos].filter(Boolean).join(' '),
    telefono: revision.telefono,
    correo: revision.correo,
    contacto: t(revision.contacto),
    entrega: t(revision.modalidad),
    direccion: revision.modalidad === 'envio' ? [revision.provincia, revision.canton, revision.distrito, revision.direccion, revision.apartamento, revision.postal].filter(Boolean).join(', ') : undefined,
    receptor: revision.receptor ? [revision.receptor, revision.telefonoReceptor].filter(Boolean).join(' · ') : undefined,
    pago: t(revision.pago),
    comprobante: revision.factura === 'electronica' ? w('facturaElectronica') : w('tiqueteElectronico'),
    datosFactura: revision.factura === 'electronica' ? [
      `${t('identificacion')}: ${revision.identificacion}`,
      `${t('razonSocial')}: ${revision.razonSocial}`,
      revision.actividad ? `${t('actividad')}: ${revision.actividad}` : '',
      `${t('correoFactura')}: ${revision.correoFactura}`,
      `${t('direccionFiscal')}: ${revision.direccionFiscal}`,
    ].filter(Boolean) : undefined,
    notas: revision.notas,
    enlaceProducto: productos.length === 1 ? enlaceProductoParaWhatsApp(productos[0].p.id) : undefined,
  }, {
    titulo: w('titulo'), productos: w('productos'), codigo: w('codigo'), subtotal: w('subtotal'), costoEnvio: w('costoEnvio'), total: w('total'),
    entrega: w('entrega'), direccion: w('direccion'), receptor: w('receptor'), pago: w('pago'),
    comprobante: w('comprobante'), cliente: w('cliente'), correo: w('correo'),
    contacto: w('contacto'), notas: w('notas'), ficha: w('ficha'), confirmacion: w('confirmacion'),
  }) : '';
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
                <p>{pago === 'tarjeta' && tarjetaPruebaDisponible ? t('tarjetaPruebaAviso') : t("confirmacion")}</p>
                {pago === 'tarjeta' && tarjetaPruebaDisponible && !entrega && !pendiente && !bloqueado ? (
                  <button className="boton boton-naranja" type="button" onClick={pagarConTarjeta} disabled={procesando}>
                    {t(procesando ? 'procesandoPago' : 'pagarPrueba')}
                    <ArrowUpRight size={18} />
                  </button>
                ) : pedidosManualesDisponibles && (pago === 'sinpe' || pago === 'transferencia') && !pendiente && !bloqueado ? (
                  <button className="boton boton-naranja" type="button" onClick={crearPedidoManual} disabled={procesando}>
                    {t(procesando ? 'creandoPedido' : 'completarPedido')}
                    <ArrowUpRight size={18} />
                  </button>
                ) : !bloqueado && (
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
                {errorPago && <p role="alert">{t('errorPago')}</p>}
                {errorPedido && <p role="alert">{t('errorPedido')}</p>}
                <button
                  className="pedido-volver"
                  onClick={() => setRevision(null)}
                >
                  {t("editar")}
                </button>
              </section>
            ) : (
              <form onSubmit={revisar} onInvalidCapture={() => setErrorFormulario(true)}>
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
                          onChange={() => {if(i === 1) desplazamientoPendiente.current="entrega";setEntrega(i === 1);}}
                        />
                        <strong>{t(m)}</strong>
                        <small>{t(`${m}Detalle`)}</small>
                      </label>
                    ))}
                  </fieldset>
                  {entrega && (
                    <div className="compra-campos" ref={entregaCampos}>
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
                          onChange={(e) => {if(e.target.checked) desplazamientoPendiente.current="receptor";setOtro(e.target.checked);}}
                        />
                        {t("otro")}
                      </label>
                      {otro && (
                        <div className="compra-campos compra-campos-anidados" ref={receptorCampos}>
                          {campo("receptor")}
                          {campo("telefonoReceptor", true, "tel")}
                        </div>
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
                      onChange={(e) => {const activa=e.target.value === "electronica";if(activa) desplazamientoPendiente.current="factura";setFactura(activa);}}
                    >
                      <option value="tiquete">{t("tiquete")}</option>
                      <option value="electronica">{t("electronica")}</option>
                    </select>
                  </label>
                  <p className="texto-suave compra-ayuda-factura">{t(factura ? "electronicaAyuda" : "tiqueteAyuda")}</p>
                  {factura && (
                    <div className="compra-campos" ref={facturaCampos}>
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
                          onChange={() => {if(id!=="tarjeta") desplazamientoPendiente.current="pago";setPago(id);}}
                        />
                        <Icon size={23} />
                        <span>
                          <strong>{t(id)}</strong>
                          <small>{id === 'tarjeta' && tarjetaPruebaDisponible ? t('tarjetaPruebaDetalle') : t(`${id}Detalle`)}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="compra-aviso">
                    <ShieldCheck size={19} />
                    {t(pago === "tarjeta" ? tarjetaPruebaDisponible ? entrega ? 'tarjetaSoloRetiro' : 'tarjetaPruebaAviso' : "tarjetaPendiente" : "pagoPendiente")}
                  </p>
                  {pago !== "tarjeta" && !pedidosManualesDisponibles && (
                    <details key={pago} className="compra-cuentas" open ref={pagoDatos}>
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
                  {errorFormulario && <p role="alert" className="aviso-formulario">{t('validacion')}</p>}
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
                <dd>{pendiente ? t("pendiente") : colones(subtotal)}</dd>
              </div>
              <div>
                <dt>{t("costoEnvio")}</dt>
                <dd>{colones(envio)}</dd>
              </div>
              <div className="compra-total"><dt>{t('total')}</dt><dd>{pendiente ? t('pendiente') : colones(total)}</dd></div>
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
