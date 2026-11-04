/** Reuses the isolated payment matrix with a newly created, discounted manual product. */
process.env.SG_TEST_PRODUCTO_MANUAL='1';
await import('./retiro-pago.mts');
