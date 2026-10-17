import {defineConfig,devices} from '@playwright/test';
import base from './playwright.checkout-ui.config';
const servidor=Array.isArray(base.webServer)?base.webServer[0]:base.webServer;
export default defineConfig({...base,
 testMatch:['contadores-navegacion.spec.ts','seguridad-tienda.spec.ts','avisos-compra.spec.ts','filtros-confirmacion.spec.ts','favoritos-diseno.spec.ts','soluciones-empresariales.spec.ts',
  'checkout-pasos.spec.ts','checkout-ingreso.spec.ts','express-envio.spec.ts',
  'identificacion-tipos.spec.ts','telefono.spec.ts','validacion-espaciado.spec.ts',
  'disponibilidad-prueba.spec.ts','pedidos-propuesta.spec.ts',
  'fondos-blancos.spec.ts','inicio-navbar.spec.ts','correos-diseno.spec.ts','plantillas-correo.spec.ts',
  'producto-acciones.spec.ts','catalogo-acciones-estables.spec.ts','catalogo-integridad.spec.ts','marcas-nombres.spec.ts','imagenes-productos.spec.ts','orden-catalogo.spec.ts',
  'recomendaciones.spec.ts','catalogo-estabilidad.spec.ts','busqueda-catalogo.spec.ts','filtro-precio.spec.ts','precio-limites.spec.ts',
  'modales-layout.spec.ts','galeria-casos.spec.ts','filtros-scroll.spec.ts','filtros-responsive.spec.ts','filtros-jerarquia.spec.ts','favoritos-sin-saltos.spec.ts','empresa-acceso.spec.ts','disponibilidad-whatsapp.spec.ts',
  'regresion-diseno.spec.ts','carrito-altura.spec.ts','carrito-persistencia.spec.ts',
 ],
 use:{...base.use,trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[...base.projects!,{name:'safari-desktop',testMatch:['catalogo-acciones-estables.spec.ts','regresion-diseno.spec.ts','carrito-persistencia.spec.ts','catalogo-estabilidad.spec.ts'],use:{...devices['Desktop Safari']}}],
 webServer:{...servidor!,env:{...servidor!.env,SG_ADMIN_LOCAL:'1',TILOPAY_API_USER:'',TILOPAY_API_PASSWORD:'',TILOPAY_API_KEY:'',BREVO_API_KEY:''}},
});
