"use client";
import {DireccionCompra} from './direccion-compra';
import {normalizarComprobante} from '@/lib/archivo-comprobante';
import {CampoIdentificacion} from './campo-identificacion';
import {CampoTelefono} from './campo-telefono';
import {rutaProducto} from "@/lib/rutas-productos";
import {datosClienteCompra} from '@/lib/datos-cliente-compra';
import {AccesoCompra} from './acceso-compra';
import {combinarDatosCompra} from '@/lib/perfil-compra';
import type {EstadoDatosCompra} from '@/lib/guardar-perfil-compra';
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
  ArrowRight,
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
const instantePago=()=>Date.now();
const CAMPOS_BORRADOR=['nombre','apellidos','correo','telefono','tipoIdentificacion','identificacion','razonSocial','actividad','correoFactura','direccionFiscal','provincia','canton','distrito','direccion','apartamento','postal','receptor','telefonoReceptor','notas'];
export function FinalizarCompra({ simularPedido, datosGuardados={},cuentaDisponible=false,googleDisponible=false,pagos, aprobacion, enlaceInvalido=false, tarjetaDisponible = false, tarjetaEnPruebas = true, pedidosManualesDisponibles = false }: { simularPedido?:(datos:Record<string,string>,metodo:'tarjeta'|'sinpe'|'transferencia',archivo?:File)=>Promise<void>; datosGuardados?:Record<string,string>;cuentaDisponible?:boolean;googleDisponible?:boolean;pagos: Contenido["pagos"]; aprobacion?: {contacto?:import('@/lib/asesorias').SolicitudAsesoria['contacto'];id:string;token:string;articulos:{producto:import("@/lib/catalogo-modelo").CatalogoPublico["productos"][number];cantidad:number}[]}|null; tarjetaDisponible?: boolean; tarjetaEnPruebas?: boolean; pedidosManualesDisponibles?: boolean;enlaceInvalido?:boolean }) {
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
  const selectorArchivo=useRef<HTMLInputElement>(null);
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
  const bloqueoRevision=useRef(false);
  const [guardandoCompra,setGuardandoCompra]=useState(false);
  useEffect(()=>{
    const volver=()=>{setProcesando(false);setGuardandoCompra(false);bloqueoRevision.current=false;};
    window.addEventListener('pageshow',volver);
    window.addEventListener('sg-app-resume',volver);
    return()=>{window.removeEventListener('pageshow',volver);window.removeEventListener('sg-app-resume',volver);};
  },[]);
  const [agregarNotas,setAgregarNotas]=useState(Boolean(borrador.notas));
  const [paso,setPaso]=useState(0),[ultimoPaso,setUltimoPaso]=useState(0);
  const formularioPasos=useRef<HTMLFormElement>(null),cabeceraPasos=useRef<HTMLElement>(null);
  const claveBorrador='sg-compra-borrador-v1:'+ (aprobacion?.id??'carrito');
  const [borradorListo,setBorradorListo]=useState(false);
  const compraTerminada=useRef(false);
  const borradorModificado=useRef(false);
  useEffect(()=>{
    let activo=true;
    queueMicrotask(()=>{
      if(!activo)return;
      try{
        const d=JSON.parse(localStorage.getItem(claveBorrador)||'null');
        if(d&&Number.isFinite(d.fecha)&&Date.now()-d.fecha>=0&&Date.now()-d.fecha<86400000&&d.datos&&typeof d.datos==='object'){
          borradorModificado.current=true;
          setBorrador(prev=>({...prev,...Object.fromEntries(Object.entries(d.datos).filter((entrada):entrada is [string,string]=>CAMPOS_BORRADOR.includes(entrada[0])&&typeof entrada[1]==='string'))}));
          if(['fisica','juridica','dimex','nite'].includes(d.tipo))setTipoIdentificacion(d.tipo);
          setExpress(d.express===true);setEntrega(d.entrega===true);setFactura(d.factura===true);setOtro(d.otro===true);setAgregarNotas(d.notas===true);
          if(['sinpe','transferencia','tarjeta'].includes(d.pago))setPago(d.pago);
          const etapa=Number.isInteger(d.paso)&&d.paso>=0&&d.paso<=2?d.paso:0;
          setPaso(etapa);setUltimoPaso(etapa);
        }
      }catch{/* El formulario sigue disponible sin almacenamiento. */}
      setBorradorListo(true);
    });
    return()=>{activo=false;};
  },[claveBorrador]);
  const guardarBorradorActual=useRef(()=>{});
  useEffect(()=>{
    const guardar=()=>{
      if(!borradorListo||!borradorModificado.current||compraTerminada.current||!formularioPasos.current)return;
      const valores=new FormData(formularioPasos.current);
      const datos=Object.fromEntries(CAMPOS_BORRADOR.flatMap(k=>{const v=valores.get(k);return typeof v==='string'?[[k,v]]:[];}));
      try{localStorage.setItem(claveBorrador,JSON.stringify({fecha:Date.now(),datos,tipo:tipoIdentificacion,express,entrega,factura,otro,notas:agregarNotas,pago,paso}));}catch{/* No interrumpir la compra. */}
    };
    guardarBorradorActual.current=guardar;guardar();
    window.addEventListener('pagehide',guardar);
    window.addEventListener('sg-app-background',guardar);
    document.addEventListener('visibilitychange',guardar);
    return()=>{guardar();window.removeEventListener('pagehide',guardar);window.removeEventListener('sg-app-background',guardar);document.removeEventListener('visibilitychange',guardar);};
  },[borradorListo,claveBorrador,tipoIdentificacion,express,entrega,factura,otro,agregarNotas,pago,paso]);
  function limpiarBorrador(){compraTerminada.current=true;try{localStorage.removeItem(claveBorrador);}catch{}}
  function cambiarPaso(valor:number){setPaso(valor);setUltimoPaso(actual=>Math.max(actual,valor));setErrorFormulario(false);requestAnimationFrame(()=>{cabeceraPasos.current?.focus({preventScroll:true});cabeceraPasos.current?.scrollIntoView({block:'start',behavior:'instant'});});}
  function validarPaso(form:HTMLFormElement,numero:number){
    const grupo=form.querySelector<HTMLElement>('[data-compra-paso="'+numero+'"]');
    const campos=Array.from(grupo?.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')??[]);
    const invalidos=campos.filter(c=>!c.checkValidity()).map(c=>c.name);
    const datos=Object.fromEntries(new FormData(form).entries());
    const validacion=datosClienteCompra.safeParse({...datos,...(numero<2?{consentimiento:'on'}:{})});
    if(!validacion.success)for(const issue of validacion.error.issues){const nombre=String(issue.path[0]);if(campos.some(c=>c.name===nombre))invalidos.push(nombre);}
    if(!invalidos.length)return true;
    setPaso(numero);setCamposInvalidos([...new Set(invalidos)]);setErrorFormulario(true);
    requestAnimationFrame(()=>{const campo=campos.find(c=>invalidos.includes(c.name));campo?.focus();campo?.reportValidity();});
    return false;
  }
  function avanzar(){const form=formularioPasos.current;if(form&&validarPaso(form,paso))cambiarPaso(paso+1);}
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
    if(procesando||bloqueoRevision.current)return;
    if(paso<2){avanzar();return;}
    for(let i=0;i<3;i++)if(!validarPaso(e.currentTarget,i))return;
    if(pago!=='tarjeta'&&(!comprobante||errorComprobante)){setErrorFormulario(true);return;}
    setErrorFormulario(false);setGuardadoPerfil('inicio');
    const formulario=new FormData(e.currentTarget);
    const datos = Object.fromEntries(
      Array.from(formulario.entries()).filter(([clave])=>!clave.startsWith('tlpy_')),
    ) as Record<string, string>;
    setBorrador(datos);
    const validacion=datosClienteCompra.safeParse(datos);
    if(!validacion.success){setCamposInvalidos([...new Set(validacion.error.issues.map(x=>String(x.path[0])))]);setErrorFormulario(true);return;}
    setCamposInvalidos([]);
    if(pago!=='tarjeta')setRevision({...datos,...validacion.data});
    medir('pedido_revisado');
    bloqueoRevision.current=true;setGuardandoCompra(true);
    try{
      if(cuentaDisponible&&!simularPedido){
        try{
          const respuesta=await fetch('/api/cuenta/datos-compra',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(validacion.data)});
          const guardado=await respuesta.json();
          setGuardadoPerfil(guardado.estado==='guardado'?'guardado':'error');
        }catch{setGuardadoPerfil('error');}
      }
      if(pago==='tarjeta'&&tarjetaDisponible)await pagarConTarjeta({...datos,...validacion.data});
    }finally{bloqueoRevision.current=false;setGuardandoCompra(false);}
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
      if(simularPedido){await simularPedido(datosCompra,'tarjeta');limpiarBorrador();return;}
      const huella=JSON.stringify({datosCompra,articulos:productos.map(x=>({id:x.p.id,cantidad:x.cantidad}))});
      const clavePendiente='sg-pago-pendiente-v1:'+claveBorrador;
      let anterior=null;
      try{anterior=JSON.parse(localStorage.getItem(clavePendiente)||'null');}catch{}
      if(anterior?.huella===huella&&instantePago()-anterior.fecha<86400000&&typeof anterior.url==='string'){
        const url=new URL(anterior.url);
        if(url.protocol==='https:'&&['secure.tilopay.com','securepayment.tilopay.com','app.tilopay.com'].includes(url.hostname)){
          guardarBorradorActual.current();window.location.assign(url.href);return;
        }
      }
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
      const destino=new URL(datos.url);
      if(destino.protocol!=='https:'||!['secure.tilopay.com','securepayment.tilopay.com','app.tilopay.com'].includes(destino.hostname))throw new Error('PAGO_NO_DISPONIBLE');
      guardarBorradorActual.current();
      try{localStorage.setItem(clavePendiente,JSON.stringify({fecha:instantePago(),huella,url:datos.url,pedido:datos.pedido,ruta:location.pathname+location.search,claveBorrador,borrador:localStorage.getItem(claveBorrador),articulos:aprobacion?[]:productos.map(x=>({id:x.p.id,cantidad:x.cantidad}))}));}catch{/* La navegación no depende del almacenamiento. */}
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
      if(simularPedido){await simularPedido(revision,pago as 'sinpe'|'transferencia',comprobante);limpiarBorrador();return;}
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
      limpiarBorrador();
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
      <Link className="ficha-volver compra-volver" href="/tienda">
        <ArrowLeft size={17} />
        {t("volver")}
      </Link>
      {guardadoPerfil!=='inicio'&&<p className="compra-aviso-datos" role={guardadoPerfil==='guardado'?'status':'alert'}>{dc(guardadoPerfil==='guardado'?'guardado':'errorCompra')}</p>}
      {errorStock&&<p role="alert">{t('stockCambio')}</p>}
      <h1 className="sr-only">{t("titulo")}</h1>
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
      {!enlaceInvalido&&!errorAutorizacion&&lineas.length>0&&!revision&&<nav ref={cabeceraPasos} tabIndex={-1} className="compra-pasos" aria-label={t('pasosCompra')}>{['pasoInformacion','pasoAdicional','pasoPago'].map((clave,i)=><button key={clave} type="button" aria-current={paso===i?'step':undefined} disabled={i>ultimoPaso||procesando} onClick={()=>{if(i<=paso)cambiarPaso(i);else if(formularioPasos.current&&validarPaso(formularioPasos.current,paso))cambiarPaso(i);}}><span>{String(i+1).padStart(2,'0')}.</span><strong>{t(clave)}</strong></button>)}</nav>}
            {!simularPedido&&!cuentaDisponible&&!revision&&<AccesoCompra google={googleDisponible} retorno={aprobacion?'/pagar?'+new URLSearchParams({asesoria:aprobacion.id,acceso:aprobacion.token}) :'/pagar'}/>}
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
                            "factura", "tipoIdentificacion", "tipoCliente",
                          ].includes(k)
                            ? (v==='CR'?t('costaRica'):t(v))
                            : v==='CR'?t('costaRica'):v}
                        </dd>
                      </div>
                    ))}
                </dl>
                {comprobante&&<p>{t('comprobanteSeleccionado',{nombre:comprobante.name})}</p>}
                {pago === 'tarjeta' && tarjetaDisponible && tarjetaEnPruebas && <p>{t('tarjetaPruebaAviso')}</p>}
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
              <form key={borradorListo?'restaurado':'inicial'} ref={formularioPasos} onChangeCapture={()=>{borradorModificado.current=true;queueMicrotask(()=>guardarBorradorActual.current());}} noValidate onSubmit={revisar} onInvalidCapture={() => setErrorFormulario(true)}>

                {cuentaDisponible&&<p className="compra-guardar-datos">{dc('guardarAutomatico')}</p>}
                <div data-compra-paso="0" hidden={paso!==0}><section ref={pasoCompra} tabIndex={-1} className="compra-bloque compra-paso">
                  <h2>
                    {t("datosContactoTitulo")}
                  </h2>
                  <div className="compra-campos compra-datos-principales">
                    <div className="compra-ancho">{campo("correo", true, "email", "email")}</div>
                    {campo("nombre", true, "text", "given-name")}
                    {campo("apellidos", true, "text", "family-name")}
                    {campo("telefono", true, "tel", "tel")}
                  </div>
                </section>
                <section className="compra-bloque">
                  <h2>{t("datosFacturacionTitulo")}</h2>
                  <div className="compra-campos">
                    <fieldset className="compra-tipo-cliente compra-ancho"><legend>{t('tipoCliente')}<IndicadorCampo obligatorio/></legend><div>{['fisica','juridica'].map(tipo=><label key={tipo} data-activo={(tipoIdentificacion==='juridica')===(tipo==='juridica')}><input type="radio" name="tipoCliente" value={tipo} checked={(tipoIdentificacion==='juridica')===(tipo==='juridica')} onChange={()=>setTipoIdentificacion(tipo)}/><span>{t(tipo==='fisica'?'clienteFisico':'clienteJuridico')}</span></label>)}</div></fieldset>
                    {tipoIdentificacion==='juridica'&&<div className="compra-ancho">{campo('razonSocial')}</div>}
                    <label><span>{a('tipoIdentificacion')}<IndicadorCampo obligatorio/></span><select name="tipoIdentificacion" value={tipoIdentificacion} onChange={e=>setTipoIdentificacion(e.target.value)}>{['fisica','juridica','dimex','nite'].map(tipo=><option key={tipo} value={tipo}>{a(tipo)}</option>)}</select></label>
                    {campo('identificacion',true)}
                    <label className="compra-check compra-ancho"><input type="checkbox" checked={factura} onChange={e=>setFactura(e.target.checked)}/><span>{t('facturaElectronicaOpcional')}</span></label>
                    <input type="hidden" name="factura" value={factura?'electronica':'tiquete'}/>
                    {factura&&<div className="compra-campos compra-ancho compra-datos-expandibles" ref={facturaCampos}>{tipoIdentificacion!=='juridica'&&campo('razonSocial')}{campo('actividad',false)}{campo('correoFactura',true,'email')}{campo('direccionFiscal')}</div>}

                  </div>
                </section>
                <section className="compra-bloque">
                  <h2>
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
                        {m==='express'&&express&&<small className="compra-express-cotizacion">{t('expressAviso')}</small>}
                      </label>
                    ))}
                  </fieldset>
                  <input type="hidden" name="pais" value="CR"/>
                  {entrega && (
                    <div className="compra-campos" ref={entregaCampos}>
                      <div className="compra-ubicacion compra-ancho"><DireccionCompra inicial={borrador}/></div>
                      <div className="compra-ancho">{campo("direccion", true, "text", "street-address")}</div>
                      {campo("apartamento", false)}
                      {campo("postal", false, "text", "postal-code")}
                      <label className="compra-check compra-ancho">
                        <input
                          type="checkbox"
                          checked={otro}
                          onChange={(e) => {if(e.target.checked) desplazamientoPendiente.current="receptor";setOtro(e.target.checked);}}
                        />
                        {t("otro")}
                      </label>
                      {otro && (
                        <div className="compra-campos compra-campos-anidados compra-datos-expandibles" ref={receptorCampos}>
                          {campo("receptor")}
                          {campo("telefonoReceptor", true, "tel")}
                        </div>
                      )}
                    </div>
                  )}
                </section>
                </div><div data-compra-paso="1"  hidden={paso!==1}><section className="compra-bloque">
                  <h2>
                    {t("pasoAdicional")}
                  </h2>
                  <label className="compra-check compra-notas-opcion">
                    <input type="checkbox" checked={agregarNotas} onChange={e=>setAgregarNotas(e.target.checked)} aria-controls="compra-notas-campo" aria-expanded={agregarNotas}/>
                    <span>{t("agregarNotas")}</span>
                  </label>
                  <div id="compra-notas-campo" hidden={!agregarNotas} className="compra-notas-campo">
                    <label htmlFor="compra-notas">{t("notas")}</label>
                    <textarea id="compra-notas" defaultValue={borrador.notas ?? ""} name="notas" disabled={!agregarNotas} rows={7} maxLength={600} placeholder={t("notasEjemplo")} />
                  </div>
</section></div><div data-compra-paso="2" hidden={paso!==2}><section className="compra-bloque">
                  <h2>
                    {t("pagoTitulo")}
                  </h2>
                  <fieldset className="compra-metodos">
                    <legend>{t("pago")}<IndicadorCampo obligatorio/></legend>
                    {[
                      { id: "tarjeta", Icon: CreditCard },
                      { id: "sinpe", Icon: Smartphone },
                      { id: "transferencia", Icon: Landmark },

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
                  {pago === "tarjeta" && !tarjetaDisponible && <p className="compra-aviso"><ShieldCheck size={19}/>{t('tarjetaPendiente')}</p>}
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
                      <input ref={selectorArchivo} id="compra-comprobante" type="file" required={!comprobante} aria-required="true" aria-label={t('comprobanteEtiqueta')} accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" aria-invalid={errorComprobante||undefined} onChange={async e=>{const f=e.target.files?.[0]??null;setComprobante(f);setErrorComprobante(Boolean(f));if(!f)return;const normalizado=await normalizarComprobante(f);setComprobante(normalizado??f);setErrorComprobante(!normalizado);}}/>
                      <button type="button" className="compra-archivo-boton" onClick={()=>selectorArchivo.current?.click()}>{t('seleccionarArchivo')}</button>
                      <span className="compra-archivo-nombre" aria-live="polite">{comprobante?comprobante.name:t('ningunArchivo')}</span>
                    </div>
                    {errorComprobante&&<p role="alert">{pm('archivoInvalido')}</p>}
                  </div>
                  )}
                  <label className="compra-check">
                    <input type="checkbox" name="consentimiento" required />
                    <span>{t("consentimiento")}<IndicadorCampo obligatorio/></span>
                  </label>
                  {errorPago&&<p role="alert">{t('errorPago')}</p>}
                  {errorFormulario && <p role="alert" className="aviso-formulario">{t('validacion')}</p>}
                  <div className="compra-pasos-acciones compra-acciones-finales">
                    <button type="button" className="boton boton-contorno" onClick={()=>cambiarPaso(1)} disabled={procesando}>{t('pasoAtras')}</button>
                  <button
                    className="boton boton-naranja"
                    type="submit"
                    disabled={bloqueado||procesando||guardandoCompra||(pago==='tarjeta'&&(!tarjetaDisponible||pendiente))}
                  >
                    {procesando||guardandoCompra?t('procesandoPago'):t(pago==='tarjeta'?'pagarTotal':'revisarTotal',{total:colones(total)})}
                    <ClipboardCheck size={19} aria-hidden="true" />
                  </button>
                  </div>
                </section></div>
                {paso<2&&errorFormulario&&<p role="alert" className="aviso-formulario">{t('validacion')}</p>}
                {paso<2&&<div className={`compra-pasos-acciones${paso===0?' compra-acciones-iniciales':''}`}>{paso===0&&<Link className="compra-regresar-tienda" href="/tienda"><ArrowLeft size={18} aria-hidden="true"/>{t('volver')}</Link>}{paso>0&&<button type="button" className="boton boton-contorno" onClick={()=>cambiarPaso(paso-1)} disabled={procesando}>{t('pasoAtras')}</button>}{paso<2&&<button type="submit" className="boton boton-azul">{t('pasoSiguiente')}<ArrowRight size={18} aria-hidden="true"/></button>}</div>}
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
