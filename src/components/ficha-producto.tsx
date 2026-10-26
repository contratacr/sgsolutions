"use client";
import {clasificacionesDeProducto} from '@/lib/soluciones-empresariales';
import {limiteCantidadProducto} from '@/lib/software';
import {PrecioProducto,EtiquetaDescuento} from './precio-producto';
import Link from "next/link";
import {descripcionUtil} from '@/lib/descripcion-producto';
import {ContadorCantidad} from './contador-cantidad';
import {AsesoriaWhatsApp} from "./asesoria-whatsapp";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ShoppingCart,
} from "lucide-react";
import { FotoProducto } from "./foto-producto";
import {
  traducir,
  type CatalogoPublico,
  type Texto,
} from "@/lib/catalogo-modelo";
import { agregarProducto } from "@/lib/carrito";
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
  const general=clasificacionesDeProducto(p).find(x=>x.categoria!=='soluciones-empresariales');
  const categoriaVisible=datos.categorias.find(x=>x.id===general?.categoria)?.nombre??categoria;
  let descripcion=descripcionUtil(p,l);
  // El importador puede repetir el título y las mismas especificaciones como párrafo.
  let sinRepeticiones=descripcion;
  for(const e of p.especificaciones){
   const nombre=traducir(e.nombre,l).replace(' > ',' — ');
   sinRepeticiones=sinRepeticiones.replace(`${nombre}: ${traducir(e.valor,l)}.`, '');
  }
  if(sinRepeticiones!==descripcion){
   const prefijo=traducir(p.nombre,l)+'.';
   if(sinRepeticiones.startsWith(prefijo))sinRepeticiones=sinRepeticiones.slice(prefijo.length);
   descripcion=sinRepeticiones.replace(/\s+/g,' ').trim();
  }
  const etiquetaTecnica=(texto:string)=>{
   const etiquetas:Record<string,string>=l==='en'?{'Processor > Processor Number':'Processor model','Processor > Type':'Processor','RAM > Installed Size':'Memory (RAM)','System > Hard Drive Capacity':'Storage','Display > Diagonal Size':'Screen size'}:{'Procesador > Número de procesador':'Modelo de procesador','Procesador > Tipo':'Procesador','Memoria RAM > Tamaño instalado':'Memoria RAM','Sistema > Capacidad del disco duro':'Almacenamiento','Pantalla > Tamaño en diagonal':'Pantalla'};
   return etiquetas[texto]??texto.replace(/\s*>\s*/g,': ');
  };
  const [cantidad,setCantidad]=useState(1);
  const [foto, setFoto] = useState(0);
  const fotos = [...new Set([p.imagen, ...(p.imagenes ?? [])])];
  return (
    <>
      <Link className="ficha-volver" href={p.coleccion==='empresas'?'/tienda?categoria=soluciones-empresariales':'/tienda'}>
        <ArrowLeft size={17} />
        {t("volver")}
      </Link>
      <div className="ficha-grid">
        <section className="ficha-galeria" aria-label={t("galeria")}>
          <div className="ficha-foto"><EtiquetaDescuento producto={p}/>
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
          <h1>{traducir(p.nombre, l)}</h1>
          <dl className="ficha-identidad">
            <div><dt>{t("codigo")}:</dt><dd>{p.codigoFabricante || t("pendiente")}</dd></div>
            <div><dt>{t("categoria")}:</dt><dd>{traducir(categoriaVisible,l)}</dd></div>
            {p.coleccion==='empresas'&&<div><dt>{t("coleccion")}:</dt><dd>{traducir(categoria,l)}</dd></div>}
            <div><dt>{t("marca")}:</dt><dd>{p.marca || t("pendiente")}</dd></div>
          </dl>
          <div className="ficha-precio-acciones"><div className="ficha-precio">
            <PrecioProducto producto={p} pendiente={s("precioPendiente")}/>
            {p.precio !== null && <small>{a("precioConIva")}</small>}
            {typeof p.stockDisponible==='number'&&Number.isSafeInteger(p.stockDisponible)&&p.stockDisponible>=0&&<small className="ficha-disponibles" aria-label={t('existenciasProveedor',{cantidad:p.stockDisponible})}>{t('disponibles',{cantidad:p.stockDisponible})}</small>}
          </div><AsesoriaWhatsApp etiqueta="asesorar" className="shop-asesoria-inline" lineas={[{producto:p,cantidad}]}/></div>
          {p.disponibilidad==='agotado'&&<p className="ficha-stock">{s('agotado')}</p>}
          <div className="producto-compra-fila">{p.coleccion!=='empresas'&&<ContadorCantidad maximo={limiteCantidadProducto(p.id)} cantidad={cantidad} cambiar={setCantidad} nombre={traducir(p.nombre,l)}/>}
          {p.coleccion==='empresas'?<AsesoriaWhatsApp etiqueta="confirmarExistencia" className="boton boton-azul" lineas={[{producto:p,cantidad:1}]}/>:          <button
            className="boton boton-azul ficha-agregar"
            disabled={p.disponibilidad === "agotado"}
            onClick={() => {
              datos.recordar([p]);
              agregarProducto(p.id,cantidad);
            }}
          >
            <ShoppingCart size={19} aria-hidden="true" />
            {s("agregar")}
          </button>}</div>


      {descripcion&&<p className="ficha-descripcion-completa">{descripcion}</p>}
      {(p.especificaciones.length>0||p.fichaTecnica)&&<section className="ficha-detalles">
        <div className="ficha-detalles-cabecera">
          <h2>{t("especificaciones")}</h2>

        </div>
        <div>
          <dl>
            {(p.especificaciones ?? []).map((e, i) => (
              <div key={i}>
                <dt>{etiquetaTecnica(traducir(e.nombre, l))}</dt>
                <dd>{traducir(e.valor, l)}</dd>
              </div>
            ))}
          </dl>
          {p.fichaTecnica && (
            <a href={p.fichaTecnica} target="_blank" rel="noopener noreferrer">
              {t("documento")}
              <span className="sr-only">{n("nuevaPestana")}</span>
            </a>
          )}
        </div>
      </section>}
        </section>
      </div>

    </>
  );
}
