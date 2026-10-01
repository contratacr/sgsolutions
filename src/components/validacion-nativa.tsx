'use client';

import {useEffect} from 'react';
import {useTranslations} from 'next-intl';

type Campo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function esCampo(elemento: EventTarget | null): elemento is Campo {
  return elemento instanceof HTMLInputElement || elemento instanceof HTMLSelectElement || elemento instanceof HTMLTextAreaElement;
}

export function ValidacionNativa() {
  const t = useTranslations('Validacion');

  useEffect(() => {
    function limpiar(evento: Event) {
      if (!esCampo(evento.target)) return;
      evento.target.setCustomValidity('');
      evento.target.removeAttribute('aria-invalid');
      delete evento.target.dataset.validacionNativa;
    }

    function invalidar(evento: Event) {
      if (!esCampo(evento.target)) return;
      const campo = evento.target;
      campo.setCustomValidity('');
      const error = campo.validity;
      let mensaje = t('invalido');
      if (error.valueMissing) mensaje = campo instanceof HTMLInputElement && campo.type === 'checkbox'
        ? t('casilla')
        : campo instanceof HTMLSelectElement ? t('seleccion') : t('obligatorio');
      else if (error.typeMismatch) mensaje = campo instanceof HTMLInputElement && campo.type === 'email' ? t('correo') : t('formato');
      else if (error.tooShort && !(campo instanceof HTMLSelectElement)) mensaje = t('minimo', {cantidad: campo.minLength});
      else if (error.tooLong && !(campo instanceof HTMLSelectElement)) mensaje = t('maximo', {cantidad: campo.maxLength});
      else if (error.rangeUnderflow || error.rangeOverflow || error.stepMismatch || error.badInput) mensaje = t('numero');
      else if (error.patternMismatch) mensaje = t('formato');
      campo.setCustomValidity(mensaje);
      campo.setAttribute('aria-invalid', 'true');
      campo.dataset.validacionNativa = 'true';
    }

    document.addEventListener('invalid', invalidar, true);
    document.addEventListener('input', limpiar, true);
    document.addEventListener('change', limpiar, true);
    return () => {
      document.removeEventListener('invalid', invalidar, true);
      document.removeEventListener('input', limpiar, true);
      document.removeEventListener('change', limpiar, true);
      document.querySelectorAll<Campo>('[data-validacion-nativa="true"]').forEach(campo => {
        campo.setCustomValidity('');
        campo.removeAttribute('aria-invalid');
        delete campo.dataset.validacionNativa;
      });
    };
  }, [t]);

  return null;
}
