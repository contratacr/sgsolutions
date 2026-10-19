/** Every administrative page/action/API must authorize before touching its arguments or data. */
import ts from 'typescript';import {readdir,readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
async function archivos(dir){const out=[];for(const f of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+f.name;if(f.isDirectory())out.push(...await archivos(p));else if(/\.tsx?$/.test(p))out.push(p);}return out;}
let total=0;
for(const path of [...await archivos('src/app/panel'),...await archivos('src/app/api/panel')]){
 const source=await readFile(path,'utf8'),page=path.endsWith('/page.tsx'),action=/^["']use server["'];/.test(source.trimStart()),api=path.endsWith('/route.ts');if(!page&&!action&&!api)continue;
 const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 for(const n of ast.statements){if(!ts.isFunctionDeclaration(n)||!n.body||!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;if(page&&!n.modifiers.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword))continue;
 const first=n.body.statements[0]?.getText(ast)??'';assert.ok(api?first.includes("leerAccesoPanel()!=='administrador'")&&first.includes('status:403'):first==='await exigirAdminMfa();',`${path}: ${n.name?.text} necesita autorización como primera instrucción`);total++;
 }
}
const local=await readFile('src/lib/admin-local.ts','utf8');assert.ok(local.includes("process.env.NODE_ENV!=='development'"));assert.ok(local.includes("process.env.SG_ENTORNO==='produccion'"));
console.log(`MFA: ${total} entradas administrativas protegidas; excepción local limitada a desarrollo.`);
