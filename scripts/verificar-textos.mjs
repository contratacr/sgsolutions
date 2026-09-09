import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const fallos = [];
const atributos = new Set(['alt', 'title', 'placeholder', 'aria-label', 'aria-description']);
function recorrer(carpeta) {
  for (const archivo of fs.readdirSync(carpeta, {withFileTypes: true})) {
    const ruta = path.join(carpeta, archivo.name);
    if (archivo.isDirectory()) recorrer(ruta);
    else if (ruta.endsWith('.tsx')) analizar(ruta);
  }
}
function analizar(ruta) {
  const fuente = ts.createSourceFile(ruta, fs.readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const registrar = nodo => fallos.push(`${ruta}:${fuente.getLineAndCharacterOfPosition(nodo.getStart()).line + 1}: texto fuera del catálogo`);
  function visible(nodo) {
    if ((ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) && /\p{L}/u.test(nodo.text)) registrar(nodo);
    else if (ts.isConditionalExpression(nodo)) { visible(nodo.whenTrue); visible(nodo.whenFalse); }
    else if (ts.isBinaryExpression(nodo)) visible(nodo.right);
  }
  function visitar(nodo) {
    if (ts.isJsxText(nodo) && /\p{L}/u.test(nodo.getText())) registrar(nodo);
    if (ts.isJsxExpression(nodo) && nodo.expression && !ts.isJsxAttribute(nodo.parent)) visible(nodo.expression);
    if (ts.isJsxAttribute(nodo) && atributos.has(nodo.name.getText()) && nodo.initializer && ts.isStringLiteral(nodo.initializer) && nodo.initializer.text.trim()) registrar(nodo);
    ts.forEachChild(nodo, visitar);
  }
  visitar(fuente);
}
function aplanar(objeto, prefijo = '') {
  return Object.entries(objeto).flatMap(([k,v]) => typeof v === 'string' ? [[prefijo+k,v]] : aplanar(v, `${prefijo+k}.`));
}
const es = Object.fromEntries(aplanar(JSON.parse(fs.readFileSync('messages/es.json','utf8'))));
const en = Object.fromEntries(aplanar(JSON.parse(fs.readFileSync('messages/en.json','utf8'))));
for (const clave of new Set([...Object.keys(es), ...Object.keys(en)])) {
  if (!es[clave] || !en[clave]) fallos.push(`Traducción faltante: ${clave}`);
  else {
    const parametros = texto => [...texto.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
    if (parametros(es[clave]) !== parametros(en[clave])) fallos.push(`Parámetros distintos: ${clave}`);
  }
}
recorrer('src');
if (fallos.length) { console.error(fallos.join('\n')); process.exit(1); }
console.log(`Textos verificados: ${Object.keys(es).length} claves completas en español e inglés.`);
