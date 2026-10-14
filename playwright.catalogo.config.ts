import {defineConfig} from '@playwright/test';

// Pure catalogue regressions: no server, accounts or external services.
export default defineConfig({
 testDir:'./tests',
 testMatch:['catalogo-rendimiento.spec.ts','catalogo-fuente.spec.ts','eurocomp-tienda.spec.ts','rutas-productos.spec.ts'],
 grepInvert:/ficha, enlace anterior, idioma y carrito|tienda, cantidad y carrito/,
 workers:1,
 reporter:'list',
});
