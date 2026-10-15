const messages = {
  es: {page: 'SG Solutions · Desarrollo móvil', language: 'Idioma', environment: 'Entorno de desarrollo', title: 'SG Solutions en su móvil', description: 'La base de la aplicación está lista para integrar la tienda, su cuenta y sus pedidos.', status: 'Esta versión de pruebas no está conectada a servicios externos ni permite realizar compras.'},
  en: {page: 'SG Solutions · Mobile development', language: 'Language', environment: 'Development environment', title: 'SG Solutions on your phone', description: 'The application foundation is ready to integrate the store, your account and your orders.', status: 'This test version is not connected to external services and does not allow purchases.'}
};
function setLanguage(language) {
  const selected = language === 'en' ? 'en' : 'es';
  const text = messages[selected];
  document.documentElement.lang = selected;
  document.title = text.page;
  document.querySelector('nav').setAttribute('aria-label', text.language);
  for (const id of ['environment', 'title', 'description', 'status']) document.getElementById(id).textContent = text[id];
  for (const button of document.querySelectorAll('[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === selected));
  try { localStorage.setItem('sg-idioma', selected); } catch { /* Language remains available when storage is disabled. */ }
}
let initial = 'es';
try { initial = localStorage.getItem('sg-idioma') || initial; } catch { /* Spanish is the default. */ }
setLanguage(initial);
for (const button of document.querySelectorAll('[data-language]')) button.addEventListener('click', () => setLanguage(button.dataset.language));
