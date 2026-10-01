'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function SubirComprobante({ pedido, acceso }: { pedido: string; acceso: string }) {
  const t = useTranslations('PedidoManual');
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [estado, setEstado] = useState('');
  async function enviar() {
    if (!archivo || ocupado) return;
    setOcupado(true); setEstado('');
    const form = new FormData();
    form.set('pedido', pedido); form.set('acceso', acceso); form.set('archivo', archivo);
    try {
      const respuesta = await fetch('/api/pedidos/manual/comprobante', { method: 'POST', body: form });
      const datos = await respuesta.json();
      if (!respuesta.ok) { setEstado(datos.error === 'archivo_invalido' ? 'archivoInvalido' : 'error'); return; }
      setEstado('recibido'); router.refresh();
    } catch { setEstado('error'); }
    finally { setOcupado(false); }
  }
  return <div className="pedido-comprobante">
    <label>{t('adjuntar')}<input type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => setArchivo(e.target.files?.[0] ?? null)} /></label>
    <p>{t('formato')}</p>
    <button type="button" className="boton boton-azul" disabled={!archivo || ocupado} onClick={enviar}>{t(ocupado ? 'enviando' : 'enviar')}</button>
    {estado && <p role={estado === 'recibido' ? 'status' : 'alert'}>{t(estado)}</p>}
  </div>;
}
