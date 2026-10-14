import {defineConfig} from '@playwright/test';
import base from './playwright.checkout-ui.config';
export default defineConfig({...base,testMatch:['producto-acciones.spec.ts','galeria-casos.spec.ts','telefono.spec.ts','modales-layout.spec.ts','vista-previa-cierre.spec.ts','filtros-scroll.spec.ts','contacto-carrito-mejoras.spec.ts','eurocomp-tienda.spec.ts']});
