"use client";
import {CampoIdentificacion} from './campo-identificacion';
import {CampoTelefono} from './campo-telefono';
import {rutaProducto} from "@/lib/rutas-productos";
import {datosClienteCompra} from '@/lib/datos-cliente-compra';
import {AccesoCompra} from './acceso-compra';
import {combinarDatosCompra} from '@/lib/perfil-compra';
import {guardarDatosCompra,type EstadoDatosCompra} from '@/app/cuenta/datos-acciones';
import {cuentaCorta} from '@/lib/cuentas-bancarias';
import {adjuntarComprobantePedido} from '@/lib/adjuntar-comprobante';
import {IndicadorCampo} from './indicador-campo';
import {medir} from '@/lib/analitica-cliente';
import type { Contenido } from "@/lib/contenido-modelo";
import Link from "next/link";
import {AsesoriaWhatsApp} from "./asesoria-whatsapp";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ClipboardCheck,
  ShieldCheck,
  CreditCard,
  Landmark,
  Smartphone,
} from "lucide-react";
import { useCatalogo } from "./datos-catalogo";
import { useCarrito, retirarArticulosPedido } from "@/lib/carrito";
import { colones, traducir } from "@/lib/catalogo-modelo";
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
export function FinalizarCompra({ datosGuardados={},cuentaDisponible=false,googleDisponible=false,pagos, aprobacion, enlaceInvalido=false, tarjetaDisponible = false, tarjetaEnPruebas = true, pedidosManualesDisponibles = false }: { datosGuardados?:Record<string,string>;cuentaDisponible?:boolean;googleDisponible?:boolean;pagos: Contenido["pagos"]; aprobacion?: {contacto?:import('@/lib/asesorias').SolicitudAsesoria['contacto'];id:string;token:string;articulos:{producto:import("@/lib/catalogo-modelo").CatalogoPublico["productos"][number];cantidad:number}[]}|null; tarjetaDisponible?: boolean; tarjetaEnPruebas?: boolean; pedidosManualesDisponibles?: boolean;enlaceInvalido?:boolean }) {
  const a = useTranslations("Asesoria");
  const t = useTranslations("Compra"),
    l = useLocale(),
    c = useCatalogo(),
    carrito = useCarrito();
  const lineas=aprobacion?aprobacion.articulos.map(x=>({id:x.producto.id,cantidad:x.cantidad})):carrito;

  const [errorStock,setErrorStock]=useState(false);
  const [camposInvalidos,setCamposInvalidos]=useState<string[]>([]);
  const [errorAutorizacion,setErrorAutorizacion]=useState(false);
  const [borrador, setBorrador] = useState<Record<string, string>>(():Record<string,string>=>{const d=aprobacion?.contacto;if(!d)return datosGuardados;const partes=d.nombre.trim().split(/\s+/);return combinarDatosCompra(datosGuardados,{nombre:partes.slice(0,-1).join(' ')||d.nombre,apellidos:partes.length>1?partes.at(-1)!:'',correo:d.correo??'',telefono:d.telefono?(d.telefono.startsWith('+')?d.telefono:'+'+d.telefono):'',tipoIdentificacion:d.tipoIdentificacion??'fisica',identificacion:d.identificacion??'',correoFactura:d.correo??''});});
  const [tipoIdentificacion,setTipoIdentificacion]=useState(borrador.tipoIdentificacion??'fisica');
  const dc=useTranslations('DatosCuenta');const [guardadoPerfil,setGuardadoPerfil]=useState<EstadoDatosCompra>('inicio');
  const [comprobante,setComprobante]=useState<File|null>(null),[errorComprobante,setErrorComprobante]=useState(false);
  const pm=useTranslations('PedidoManual');
  const [express,setExpress]=useState(false);
  const [entrega, setEntrega] = useState(false),
    [factura, setFactura] = useState(false),
    [otro, setOtro] = useState(false),
    [pago, setPago] = useState("sinpe"),
    [revision, setRevision] = useState<Record<string, string> | null>(null),
    [procesando, setProcesando] = useState(false),
    [errorPago, setErrorPago] = useState(false),
    [errorPedido, setErrorPedido] = useState(false),
    [errorFormulario, setErrorFormulario] = useState(false);
  const revisionVisible=Boolean(revision);
  const pasoCompra=useRef<HTMLElement>(null);
  const pasoAnterior=useRef(revisionVisible);
  useEffect(()=>{
    if(pasoAnterior.current===revisionVisible)return;
    pasoAnterior.current=revisionVisible;
    const frame=requestAnimationFrame(()=>{
      const destino=pasoCompra.current;
      if(!destino)return;
      window.scrollTo({top:Math.max(0,window.scrollY+destino.getBoundingClientRect().top-100),behavior:"instant"});
      destino.focus({preventScroll:true});
    });
    return ()=>cancelAnimationFrame(frame);
  },[revisionVisible]);
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
    const p = aprobacion?.articulos.find(a=>a.producto.id===x.id)?.producto ?? c.productos.find((p) => p.id === x.id);
    return p ? [{ ...x, p }] : [];
  });
  const bloqueado =
    (!aprobacion && c.errorCarrito) ||
    productos.length !== lineas.length ||
    productos.some((x) => x.p.disponibilidad === "agotado");
  const pendiente = productos.some((x) => x.p.precio === null),
    subtotal = productos.reduce((s, x) => s + (x.p.precio ?? 0) * x.cantidad, 0),
    envio = costoEntrega(express?'express':entrega?'envio':'retiro'),
    total = subtotal + envio;
  async function revisar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(procesando)return;
    if(pago!=='tarjeta'&&(!comprobante||errorComprobante)){setErrorFormulario(true);return;}
    setErrorFormulario(false);setGuardadoPerfil('inicio');
    const formulario=new FormData(e.currentTarget);
    const datos = Object.fromEntries(
      formulario.entries(),
    ) as Record<string, string>;
    setBorrador(datos);
    const validacion=datosClienteCompra.safeParse(datos);
    if(!validacion.success){setCamposInvalidos([...new Set(validacion.error.issues.map(x=>String(x.path[0])))]);setErrorFormulario(true);return;}
    setCamposInvalidos([]);
    if(pago!=='tarjeta')setRevision({...datos,...validacion.data});
    medir('pedido_revisado');
    if(cuentaDisponible){
      try{setGuardadoPerfil(await guardarDatosCompra('inicio',formulario));}catch{setGuardadoPerfil('error');}
    }
    if(pago==='tarjeta'&&tarjetaDisponible)await pagarConTarjeta({...datos,...validacion.data});
  }
  async function accesoCompra(){
    if(aprobacion)return {id:aprobacion.id,token:aprobacion.token};
    const r=await fetch('/api/compra/verificar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idioma:l,articulos:productos.map(x=>({id:x.p.id,cantidad:x.cantidad,precio:x.p.precio}))})});
    const d=await r.json();if(!r.ok||typeof d.id!=='string'||typeof d.token!=='string'){if(d.error==='catalogo_actualizado')setErrorStock(true);throw new Error('COMPRA_NO_DISPONIBLE');}return d as {id:string;token:string};
  }
  async function pagarConTarjeta(datosCompra:Record<string,string>|null=revision) {
    if (!datosCompra || procesando || pendiente || bloqueado) return;
    setProcesando(true);
    setErrorPago(false);
    try {
      const acceso=await accesoCompra();
      const respuesta = await fetch('/api/pagos/tilopay/iniciar', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          asesoria:acceso.id,acceso:acceso.token, idioma:l, datos:datosCompra, nombre: datosCompra.nombre, apellidos: datosCompra.apellidos, correo: datosCompra.correo,
          telefono: datosCompra.telefono, consentimiento: datosCompra.consentimiento === 'on',
          articulos: productos.map(x => ({ id: x.p.id, cantidad: x.cantidad })),
        }),
      });
      const datos = await respuesta.json();
      if(datos.error==='catalogo_actualizado')setErrorStock(true);
      if(respuesta.status===403&&datos.error==='asesoria_requerida')setErrorAutorizacion(true);
      if (!respuesta.ok || typeof datos.url !== 'string') throw new Error('PAGO_NO_DISPONIBLE');
      if (!aprobacion) retirarArticulosPedido(productos.map(x => ({id:x.p.id,cantidad:x.cantidad})));
      window.location.assign(datos.url);
    } catch {
      setErrorPago(true);
      setProcesando(false);
    }
  }
  async function crearPedidoManual() {
    if (!revision || procesando || bloqueado || pendiente || !comprobante || errorComprobante || !['sinpe', 'transferencia'].includes(pago)) return;
    setProcesando(true); setErrorPedido(false);
    try {
      const acceso=await accesoCompra();
      const respuesta = await fetch('/api/pedidos/manual', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ asesoria:acceso.id,acceso:acceso.token, idioma: l, datos: revision, metodo: pago, articulos: productos.map(x => ({ id: x.p.id, cantidad: x.cantidad })) }),
      });
      const datos = await respuesta.json();
      if(datos.error==='catalogo_actualizado')setErrorStock(true);
      if(respuesta.status===403&&datos.error==='asesoria_requerida')setErrorAutorizacion(true);
      const ruta = datos.urlCorta ?? datos.url;
      if (!respuesta.ok || typeof ruta !== 'string' || !(/^\/pedido\/[A-Za-z0-9_-]{64}$/.test(ruta) || ruta.startsWith('/finalizar-compra/pedido?'))) throw new Error('PEDIDO_NO_DISPONIBLE');
      const destino=new URL(ruta,window.location.origin);
      await adjuntarComprobantePedido(destino,comprobante);
      if (!aprobacion) retirarArticulosPedido(productos.map(x => ({id:x.p.id,cantidad:x.cantidad})));
      window.location.assign(destino.href);
    } catch { setErrorPedido(true); setProcesando(false); }
  }
  const campo = (
    name: string,
    required = true,
    type = "text",
    autoComplete?: string,
  ) => (
    <label key={name}>
      <span>{t(name)}{(required||!['apartamento','postal','actividad'].includes(name))&&<IndicadorCampo obligatorio={required}/>}</span>
      {name==='identificacion'?<CampoIdentificacion tipo={tipoIdentificacion} defaultValue={borrador[name]} required={required} invalid={camposInvalidos.includes(name)} describedBy={tipoIdentificacion==='fisica'?undefined:'compra-identificacion-ayuda'} onChange={()=>setCamposInvalidos(actual=>actual.filter(c=>c!==name))}/>:type==='tel'?<CampoTelefono name={name} defaultValue={borrador[name]} required={required} invalid={camposInvalidos.includes(name)} onChange={()=>setCamposInvalidos(actual=>actual.filter(c=>c!==name))}/>:<input
        defaultValue={borrador[name] || (type === "tel" ? "+506 " : "")}
        name={name}
        type={type}
        required={required}
        maxLength={name==='direccion'?350:['nombre','apellidos'].includes(name)?100:['canton','distrito'].includes(name)?80:type==='tel'?26:150}
        aria-invalid={camposInvalidos.includes(name)||undefined}
        onChange={()=>setCamposInvalidos(actual=>actual.filter(c=>c!==name))}
        autoComplete={autoComplete}
        inputMode={name==='identificacion'?'numeric':undefined}
        pattern={name==='identificacion'?(tipoIdentificacion==='juridica'?'[0-9]{10}|[0-9]-[0-9]{3}-[0-9]{6}':'[0-9]{9}|[0-9]-[0-9]{4}-[0-9]{4}'):undefined}
        aria-describedby={name==='identificacion'&&tipoIdentificacion!=='fisica'?'compra-identificacion-ayuda':undefined}
      />}
      {camposInvalidos.includes(name)&&<small role="alert" className="campo-error">{t(type==='tel'?'telefonoInvalido':'campoInvalido')}</small>}
      {name==='identificacion'&&tipoIdentificacion!=='fisica'&&<small id="compra-identificacion-ayuda">{t(tipoIdentificacion==='dimex'?'identificacionDimexAyuda':tipoIdentificacion==='nite'?'identificacionNiteAyuda':tipoIdentificacion==='juridica'?'identificacionJuridicaAyuda':'identificacionFisicaAyuda')}</small>}
    </label>
  );
  return (
    <>
      <Link className="ficha-volver" href="/tienda">
        <ArrowLeft size={17} />
        {t("volver")}
      </Link>
      {guardadoPerfil!=='inicio'&&<p className="compra-aviso-datos" role={guardadoPerfil==='guardado'?'status':'alert'}>{dc(guardadoPerfil==='guardado'?'guardado':'errorCompra')}</p>}
      {errorStock&&<p role="alert">{t('stockCambio')}</p>}
      <header className="compra-cabecera">
        <p className="etiqueta">{t("etiqueta")}</p>
        <h1>{t("titulo")}</h1>
        <p>{t("intro")}</p>
      </header>
      {enlaceInvalido||errorAutorizacion ? <section className="compra-bloque"><h2>{a('enlaceInvalido')}</h2><p role="status">{a('enlaceInvalidoTexto')}</p><AsesoriaWhatsApp etiqueta="asesorar"/></section> : !lineas.length ? (
        <div className="compra-bloque">
          <h2>{t("vacio")}</h2>
          <Link className="boton boton-azul" href="/tienda">
            {t("volver")}
          </Link>
        </div>
      ) : (
        <div className="compra-grid">
          <div>
            {!cuentaDisponible&&!revision&&<AccesoCompra google={googleDisponible} retorno={aprobacion?'/pagar?'+new URLSearchParams({asesoria:aprobacion.id,acceso:aprobacion.token}) :'/pagar'}/>}
            {revision ? (
              <section ref={pasoCompra} tabIndex={-1} className="compra-bloque compra-paso">
                <p className="etiqueta">{t("revision")}</p>
                <h2>{t("revisarTitulo")}</h2>
                <dl className="pedido-datos">
                  {Object.entries(revision)
                    .filter(([k, v]) => v && k !== "consentimiento" && k !== "contacto" && k !== "guardarDatos")
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{t(k)}</dt>
                        <dd>
                          {[
                            "modalidad",
                            "pago",
                            "contacto",
                            "factura", "tipoIdentificacion",
                          ].includes(k)
                            ? t(v)
                            : v}
                        </dd>
                      </div>
                    ))}
                </dl>
                {comprobante&&<p>{t('comprobanteSeleccionado',{nombre:comprobante.name})}</p>}
                {pago === 'tarjeta' && tarjetaDisponible && <p>{t(tarjetaEnPruebas ? 'tarjetaPruebaAviso' : 'tarjetaAviso')}</p>}
                {pago === 'tarjeta' && tarjetaDisponible && !pendiente && !bloqueado ? (
                  <button className="boton boton-naranja" type="button" onClick={()=>pagarConTarjeta()} disabled={procesando}>
                    {t(procesando ? 'procesandoPago' : tarjetaEnPruebas ? 'pagarPrueba' : 'pagarTarjeta')}
                    <CreditCard size={18} aria-hidden="true" />
                  </button>
                ) : pedidosManualesDisponibles && (pago === 'sinpe' || pago === 'transferencia') && !pendiente && !bloqueado ? (
                  <button className="boton boton-naranja" type="button" onClick={crearPedidoManual} disabled={procesando}>
                    {t(procesando ? 'creandoPedido' : 'completarPedido')}
                    <ClipboardCheck size={18} aria-hidden="true" />
                  </button>
                ) : <p role="status">{a('compraNoDisponible')}</p>}
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

                {cuentaDisponible&&<p className="compra-guardar-datos">{dc('guardarAutomatico')}</p>}
                <section ref={pasoCompra} tabIndex={-1} className="compra-bloque compra-paso">
                  <h2>
                    <span>01</span>
                    {t("contactoTitulo")}
                  </h2>
                  <div className="compra-campos">
                    {campo("nombre", true, "text", "given-name")}
                    {campo("apellidos", true, "text", "family-name")}
                    {campo("correo", true, "email", "email")}
                    {campo("telefono", true, "tel", "tel")}
                      <label><span>{a('tipoIdentificacion')}<IndicadorCampo obligatorio={factura}/></span><select required={factura} name="tipoIdentificacion" value={tipoIdentificacion} onChange={e=>setTipoIdentificacion(e.target.value)}><option value="fisica">{a('fisica')}</option><option value="juridica">{a('juridica')}</option><option value="dimex">{a('dimex')}</option><option value="nite">{a('nite')}</option></select></label>
                      {campo("identificacion", factura)}

                  </div>
                </section>
                <section className="compra-bloque">
                  <h2>
                    <span>02</span>
                    {t("entregaTitulo")}
                  </h2>
                  <fieldset className="compra-opciones">
                    <legend>{t("modalidad")}<IndicadorCampo obligatorio/></legend>
                    {["retiro", "envio", "express"].map((m, i) => (
                      <label key={m}>
                        <input
                          type="radio"
                          required
                          name="modalidad"
                          value={m}
                          checked={express ? m==='express' : entrega === (i === 1)&&m!=='express'}
                          onChange={() => {if(i > 0) desplazamientoPendiente.current="entrega";setEntrega(i > 0);setExpress(m==='express');}}
                        />
                        <strong>{t(m)}</strong>
                        <small>{t(`${m}Detalle`)}</small>
                      </label>
                    ))}
                  </fieldset>
                  {express&&<div className="compra-express-cotizacion"><p>{t('expressAviso')}</p></div>}
                  {entrega && (
                    <div className="compra-campos" ref={entregaCampos}>
                      <label>
                        <span>{t("provincia")}<IndicadorCampo obligatorio/></span>
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
                    <span>{t("factura")}<IndicadorCampo obligatorio/></span>
                    <select required
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
                    <legend>{t("pago")}<IndicadorCampo obligatorio/></legend>
                    {[
                      { id: "sinpe", Icon: Smartphone },
                      { id: "transferencia", Icon: Landmark },
                      { id: "tarjeta", Icon: CreditCard },

                    ].map(({ id, Icon }) => (
                      <label key={id} data-activo={pago === id}>
                        <input
                          type="radio"
                          required
                          name="pago"
                          value={id}
                          checked={pago === id}
                          onChange={() => {if(id!=="tarjeta") desplazamientoPendiente.current="pago";setPago(id);}}
                        />
                        <Icon size={23} />
                        <span>
                          <strong>{t(id)}</strong>
                          <small>{id === 'tarjeta' && tarjetaDisponible && tarjetaEnPruebas ? t('tarjetaPruebaDetalle') : t(`${id}Detalle`)}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {pago === "tarjeta" && <p className="compra-aviso"><ShieldCheck size={19}/>{t(tarjetaDisponible ? tarjetaEnPruebas ? 'tarjetaPruebaAviso' : 'tarjetaAviso' : 'tarjetaPendiente')}</p>}
                  {pago !== "tarjeta" && (
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
                            {cuentaCorta(c) && <span>{t('cuentaCorta')}: <code>{cuentaCorta(c)}</code></span>}
                            <span>{t('iban')}: <code>{c.iban}</code></span>
                          </div>
                        ))
                      )}
                    </details>
                  )}
                  {(pago === "sinpe" || pago === "transferencia") && (
                  <div className="compra-comprobante">
                    <label htmlFor="compra-comprobante"><span>{t('comprobanteEtiqueta')}<IndicadorCampo obligatorio/></span></label>
                    <div className="compra-archivo-control">
                      <input id="compra-comprobante" type="file" required={!comprobante} aria-required="true" aria-label={t('comprobanteEtiqueta')} accept="image/jpeg,image/png,application/pdf" aria-invalid={errorComprobante||undefined} onChange={e=>{const f=e.target.files?.[0]??null;const invalido=Boolean(f&&(f.size<100||f.size>5*1024*1024||!['image/jpeg','image/png','application/pdf'].includes(f.type)));setErrorComprobante(invalido);setComprobante(invalido?null:f);if(invalido)e.target.value='';}}/>
                      <label htmlFor="compra-comprobante" className="compra-archivo-boton">{t('seleccionarArchivo')}</label>
                      <span className="compra-archivo-nombre" aria-live="polite">{comprobante?comprobante.name:t('ningunArchivo')}</span>
                    </div>
                    {errorComprobante&&<p role="alert">{pm('archivoInvalido')}</p>}
                  </div>
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
                    <span>{t("consentimiento")}<IndicadorCampo obligatorio/></span>
                  </label>
                  {errorPago&&<p role="alert">{t('errorPago')}</p>}
                  {errorFormulario && <p role="alert" className="aviso-formulario">{t('validacion')}</p>}
                  <button
                    className="boton boton-naranja"
                    type="submit"
                    disabled={bloqueado||procesando||(pago==='tarjeta'&&(!tarjetaDisponible||pendiente))}
                  >
                    {t(procesando?'procesandoPago':pago==='tarjeta'?'completarPedido':'revisar')}
                    <ClipboardCheck size={19} aria-hidden="true" />
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
                  <Link href={rutaProducto(p)}>{traducir(p.nombre, l)}</Link>
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
                <dd>{express?t('expressPendiente'):colones(envio)}</dd>
              </div>
              <div className="compra-total"><dt>{t('total')}</dt><dd>{pendiente ? t('pendiente') : colones(total)}</dd></div>
            </dl>
            <p>{t("iva")}</p>
            {bloqueado && <p role="alert">{t("carga")}</p>}
          </aside>
        </div>
      )}
    </>
  );
}
