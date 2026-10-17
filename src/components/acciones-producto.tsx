'use client';
import * as Dialog from '@radix-ui/react-dialog';
import {Heart,Search,ShoppingCart,Check,X} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import Link from 'next/link';
import {AsesoriaWhatsApp} from './asesoria-whatsapp';
import {ContadorCantidad} from './contador-cantidad';
import {descripcionUtil} from '@/lib/descripcion-producto';
import {FotoProducto} from './foto-producto';
import {PrecioProducto,EtiquetaDescuento} from './precio-producto';
import {traducir,type CatalogoPublico} from '@/lib/catalogo-modelo';
import {rutaProducto} from '@/lib/rutas-productos';
import {agregarProducto} from '@/lib/carrito';
import {useCatalogo} from './datos-catalogo';
import {useVistaPrevia} from '@/lib/vista-previa';
import {medir} from '@/lib/analitica-cliente';
export function AccionesProducto({producto:p,favorito,cambiarFavorito,listo,bloqueado=false}:{producto:CatalogoPublico['productos'][number];favorito:boolean;cambiarFavorito:()=>void;listo:boolean;bloqueado?:boolean}){
 const t=useTranslations('AccionesProducto'),tienda=useTranslations('Tienda'),a=useTranslations('Asesoria'),idioma=useLocale(),catalogo=useCatalogo();
 const [abierta,setAbierta]=useVistaPrevia();const [cantidad,setCantidad]=useState(1),[agregado,setAgregado]=useState(false);const temporizador=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(temporizador.current)clearTimeout(temporizador.current);},[]);
 const nombre=traducir(p.nombre,idioma),agotado=p.disponibilidad==='agotado';
 function agregar(unidades:number){if(bloqueado||agotado||p.coleccion==='empresas')return;catalogo.recordar([p]);agregarProducto(p.id,unidades);setAgregado(true);if(temporizador.current)clearTimeout(temporizador.current);temporizador.current=setTimeout(()=>setAgregado(false),1800);}
 return <Dialog.Root open={abierta} onOpenChange={valor=>{setAbierta(valor);if(valor){setCantidad(1);medir('producto',p.id);}}}>
 {p.coleccion==='empresas'?<AsesoriaWhatsApp etiqueta="confirmarExistencia" className="producto-agregar" lineas={[{producto:p,cantidad:1}]}/>:<button type="button" className="producto-agregar" disabled={bloqueado||agotado} onClick={()=>agregar(1)}>{agregado?<Check size={19}/>:<ShoppingCart size={19}/>}<span>{agregado?t('agregado'):agotado?tienda('agotado'):t('agregar')}</span></button>}
 <div className="producto-acciones"><button type="button" className="producto-accion" aria-label={t(favorito?'quitarFavorito':'guardarFavorito',{nombre})} aria-pressed={favorito} disabled={!listo} onClick={cambiarFavorito}><Heart size={19} fill={favorito?'currentColor':'none'}/></button><Dialog.Trigger asChild><button type="button" className="producto-accion" aria-label={t('vistaPrevia',{nombre})}><Search size={19}/></button></Dialog.Trigger></div>

 {abierta&&<Dialog.Portal><Dialog.Overlay className="producto-preview-overlay"/><Dialog.Content className="producto-preview"><Dialog.Close className="producto-preview-cerrar" aria-label={t('cerrar')}><X size={22}/></Dialog.Close><div className="producto-preview-cuerpo"><div className="producto-preview-foto"><EtiquetaDescuento producto={p}/><FotoProducto src={p.imagen} alt={nombre}/></div><div className="producto-preview-datos"><p className="producto-preview-marca">{p.marca}</p><Dialog.Title>{nombre}</Dialog.Title><Dialog.Description className={descripcionUtil(p,idioma)?undefined:'sr-only'}>{descripcionUtil(p,idioma)||t('vistaPrevia',{nombre})}</Dialog.Description><div className="producto-preview-precio"><PrecioProducto producto={p} pendiente={tienda('precioPendiente')}/><small>{a('precioConIva')}</small></div>{p.codigoFabricante&&<p className="producto-preview-codigo">{p.codigoFabricante}</p>}<dl>{p.especificaciones.slice(0,4).map((x,i)=><div key={i}><dt>{traducir(x.nombre,idioma)}</dt><dd>{traducir(x.valor,idioma)}</dd></div>)}</dl><div className="producto-compra-fila"><ContadorCantidad cantidad={cantidad} cambiar={setCantidad} nombre={nombre}/>{p.coleccion==='empresas'?<AsesoriaWhatsApp etiqueta="confirmarExistencia" className="boton boton-azul" lineas={[{producto:p,cantidad}]}/>:<button type="button" className="boton boton-azul" disabled={bloqueado||agotado} onClick={()=>{setAbierta(false);agregar(cantidad);}}>{agregado?<Check size={19}/>:<ShoppingCart size={19}/>} {agregado?t('agregado'):t('agregar')}</button>}</div><Dialog.Close asChild><Link className="producto-preview-detalles" href={rutaProducto(p)}>{t('detalles')}</Link></Dialog.Close><p className="sr-only" role="status">{agregado?t('agregado'):''}</p></div></div></Dialog.Content></Dialog.Portal>}
 </Dialog.Root>;
}
