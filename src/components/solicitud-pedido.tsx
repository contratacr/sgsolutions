'use client';

import {FormEvent, useMemo, useState} from 'react';
import {ArrowLeft, ArrowUpRight, Check} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';

import type {CatalogoPublico} from '@/lib/catalogo-modelo';
import {colones, traducir} from '@/lib/catalogo-modelo';
import {enlaceWhatsApp} from '@/lib/empresa';

type Producto = CatalogoPublico['productos'][number];
type LineaPedido = {cantidad: number; producto: Producto};
type Modalidad = 'retiro' | 'entrega';
type DatosPedido = {
  nombre: string;
  telefono: string;
  correo: string;
  modalidad: Modalidad;
  destino: string;
  notas: string;
};

export function SolicitudPedido({lineas, regresar}: {lineas: LineaPedido[]; regresar: () => void}) {
  const t = useTranslations('Pedido');
  const n = useTranslations('Navegacion');
  const idioma = useLocale();
  const [modalidad, setModalidad] = useState<Modalidad>('retiro');
  const [revision, setRevision] = useState<DatosPedido | null>(null);
  const tienePrecioPendiente = lineas.some(({producto}) => producto.precio === null);
  const total = lineas.reduce((suma, {cantidad, producto}) => suma + (producto.precio ?? 0) * cantidad, 0);

  const mensaje = useMemo(() => {
    if (!revision) return '';
    const productos = lineas.map(({cantidad, producto}) => {
      const codigo = producto.codigoFabricante || t('sinCodigo');
      const precio = producto.precio === null ? t('precioPendiente') : colones(producto.precio * cantidad);
      return `• ${cantidad} × ${traducir(producto.nombre, idioma)}\n  ${t('codigoFabricante')}: ${codigo}\n  ${t('subtotal')}: ${precio}`;
    }).join('\n');
    const datos = [
      t('mensajeSaludo'),
      '',
      `${t('nombre')}: ${revision.nombre}`,
      `${t('telefono')}: ${revision.telefono}`,
      revision.correo ? `${t('correo')}: ${revision.correo}` : '',
      `${t('modalidad')}: ${t(revision.modalidad)}`,
      revision.modalidad === 'entrega' ? `${t('destino')}: ${revision.destino}` : '',
      revision.notas ? `${t('notas')}: ${revision.notas}` : '',
      '',
      t('seleccion'),
      productos,
      '',
      `${t('totalEstimado')}: ${tienePrecioPendiente ? t('precioPendiente') : colones(total)}`,
      t('mensajeConfirmacion')
    ];
    return datos.filter(Boolean).join('\n');
  }, [idioma, lineas, revision, t, tienePrecioPendiente, total]);

  function revisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    setRevision({
      nombre: String(formulario.get('nombre') ?? '').trim(),
      telefono: String(formulario.get('telefono') ?? '').trim(),
      correo: String(formulario.get('correo') ?? '').trim(),
      modalidad,
      destino: modalidad === 'entrega' ? String(formulario.get('destino') ?? '').trim() : '',
      notas: String(formulario.get('notas') ?? '').trim()
    });
  }

  if (revision) return <section className="pedido-revision" aria-labelledby="pedido-revision-titulo">
    <span className="pedido-paso">{t('paso2')}</span>
    <h3 id="pedido-revision-titulo">{t('revisionTitulo')}</h3>
    <p>{t('revisionDescripcion')}</p>
    <dl className="pedido-datos">
      <div><dt>{t('nombre')}</dt><dd>{revision.nombre}</dd></div>
      <div><dt>{t('telefono')}</dt><dd>{revision.telefono}</dd></div>
      {revision.correo && <div><dt>{t('correo')}</dt><dd>{revision.correo}</dd></div>}
      <div><dt>{t('modalidad')}</dt><dd>{t(revision.modalidad)}</dd></div>
      {revision.destino && <div><dt>{t('destino')}</dt><dd>{revision.destino}</dd></div>}
      {revision.notas && <div><dt>{t('notas')}</dt><dd>{revision.notas}</dd></div>}
    </dl>
    <div className="pedido-seleccion">
      <h4>{t('seleccion')}</h4>
      <ul>{lineas.map(({cantidad, producto}) => <li key={producto.id}>
        <div><strong>{cantidad} × {traducir(producto.nombre, idioma)}</strong><span>{t('codigoFabricante')}: {producto.codigoFabricante || t('sinCodigo')}</span></div>
        <strong>{producto.precio === null ? t('precioPendiente') : colones(producto.precio * cantidad)}</strong>
      </li>)}</ul>
      <div className="pedido-total"><span>{t('totalEstimado')}</span><strong>{tienePrecioPendiente ? t('precioPendiente') : colones(total)}</strong></div>
    </div>
    <p className="pedido-confirmacion"><Check size={17}/><span>{t('confirmacion')}</span></p>
    <a className="boton boton-azul pedido-enviar" href={enlaceWhatsApp(mensaje)} target="_blank" rel="noopener noreferrer" title={`${t('enviarWhatsapp')}. ${n('nuevaPestana')}`}>
      {t('enviarWhatsapp')}<ArrowUpRight size={18}/><span className="sr-only">({n('nuevaPestana')})</span>
    </a>
    <button className="pedido-volver" type="button" onClick={() => setRevision(null)}><ArrowLeft size={16}/>{t('editar')}</button>
    <p className="pedido-nota-envio">{t('notaEnvio')}</p>
  </section>;

  return <section className="pedido-formulario" aria-labelledby="pedido-formulario-titulo">
    <button className="pedido-volver" type="button" onClick={regresar}><ArrowLeft size={16}/>{t('volverCarrito')}</button>
    <span className="pedido-paso">{t('paso1')}</span>
    <h3 id="pedido-formulario-titulo">{t('titulo')}</h3>
    <p>{t('descripcion')}</p>
    <form onSubmit={revisar}>
      <label>{t('nombre')}<input name="nombre" autoComplete="name" required maxLength={120}/></label>
      <label>{t('telefono')}<input name="telefono" type="tel" autoComplete="tel" inputMode="tel" required maxLength={30}/></label>
      <label className="pedido-ancho">{t('correoOpcional')}<input name="correo" type="email" autoComplete="email" maxLength={160}/></label>
      <fieldset className="pedido-ancho">
        <legend>{t('modalidad')}</legend>
        <label className="pedido-opcion"><input type="radio" name="modalidad" value="retiro" checked={modalidad === 'retiro'} onChange={() => setModalidad('retiro')}/><span><strong>{t('retiro')}</strong><small>{t('retiroDetalle')}</small></span></label>
        <label className="pedido-opcion"><input type="radio" name="modalidad" value="entrega" checked={modalidad === 'entrega'} onChange={() => setModalidad('entrega')}/><span><strong>{t('entrega')}</strong><small>{t('entregaDetalle')}</small></span></label>
      </fieldset>
      {modalidad === 'entrega' && <label className="pedido-ancho">{t('destino')}<textarea name="destino" required maxLength={350} rows={3} placeholder={t('destinoEjemplo')}/></label>}
      <label className="pedido-ancho">{t('notasOpcional')}<textarea name="notas" maxLength={600} rows={3} placeholder={t('notasEjemplo')}/></label>
      <label className="pedido-consentimiento pedido-ancho"><input name="consentimiento" type="checkbox" required/><span>{t('consentimiento')}</span></label>
      <button className="boton boton-azul pedido-revisar pedido-ancho" type="submit">{t('revisar')}<ArrowUpRight size={18}/></button>
    </form>
  </section>;
}
