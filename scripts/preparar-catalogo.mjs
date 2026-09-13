import fs from 'node:fs';
const destino='src/lib/catalogo-inicial.json';
if(!fs.existsSync(destino))fs.copyFileSync('src/lib/catalogo-base.json',destino);
