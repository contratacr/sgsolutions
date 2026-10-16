const copy = {
  es: ['No se pudo conectar', 'La vista de desarrollo necesita el servidor local activo. Vuelva a abrir la app cuando esté disponible.', 'Sus datos no se han eliminado.'],
  en: ['Unable to connect', 'The development preview needs the local server running. Reopen the app when it is available.', 'Your data has not been deleted.'],
};
function language(locale) {
  document.documentElement.lang = locale;
  ['title', 'description', 'note'].forEach((id, index) => {document.getElementById(id).textContent = copy[locale][index];});
  document.title = `${copy[locale][0]} | SG Solutions`;
  document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === locale)));
  try {localStorage.setItem('sg-preview-language', locale);} catch { /* Offline recovery remains usable without storage. */ }
}
document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => language(button.dataset.lang)));
let preferred = navigator.language.startsWith('es') ? 'es' : 'en';
try {preferred = localStorage.getItem('sg-preview-language') || preferred;} catch { /* Use device language. */ }
language(preferred === 'en' ? 'en' : 'es');
