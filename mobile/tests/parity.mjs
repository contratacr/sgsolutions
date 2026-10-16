import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../src/app/', import.meta.url));
async function pages(directory) {
  const result = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await pages(full));
    else if (/^page\.(tsx?|jsx?)$/.test(entry.name)) {
      const relative = path.relative(root, directory).split(path.sep);
      result.push('/' + relative.filter(part => part && !part.startsWith('(') && !part.startsWith('@')).join('/'));
    }
  }
  return result;
}
const inventory = JSON.parse(await readFile(new URL('../paridad.json', import.meta.url), 'utf8'));
assert.equal(inventory.version, 1);
const ids = inventory.sections.map(section => section.id);
assert.equal(new Set(ids).size, ids.length, 'Identificadores duplicados');
const registered = inventory.sections.flatMap(section => {
  assert.ok(section.name && section.scope, `Alcance incompleto: ${section.id}`);
  assert.ok(['customer', 'administrator', 'development'].includes(section.audience));
  assert.ok(['pending', 'in-progress', 'verified'].includes(section.status));
  assert.ok(Array.isArray(section.evidence));
  if (section.status === 'verified') assert.ok(section.evidence.length, `Falta evidencia: ${section.id}`);
  return section.routes;
});
assert.equal(new Set(registered).size, registered.length, 'Rutas duplicadas en inventario');
assert.deepEqual(registered.sort(), (await pages(root)).sort(), 'Actualizar paridad.json: hay páginas sin registrar o rutas obsoletas');
console.log(`Inventario completo: ${registered.length} rutas, ${ids.length} secciones. La cobertura de inventario no acredita paridad funcional.`);
