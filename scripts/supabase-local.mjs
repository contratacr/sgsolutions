import { spawnSync } from 'node:child_process';
if (!['start','stop'].includes(process.argv[2])) throw new Error('OPERACION_LOCAL_NO_PERMITIDA');
const docker = spawnSync('docker', ['info'], {encoding: 'utf8'});
if (docker.error || docker.status !== 0) {
  console.error('Supabase local no iniciado: falta Docker compatible instalado y en ejecución. No se intentó conectar a producción.');
  process.exit(1);
}
const resultado = spawnSync('npx', ['supabase', process.argv[2]], {encoding: 'utf8', maxBuffer: 10 * 1024 * 1024});
if (resultado.status !== 0) {
  console.error('La operación de Supabase local falló. Revisar Docker y configuración local; salida con credenciales omitida.');
  process.exit(1);
}
console.log(process.argv[2] === 'start' ? 'Supabase local iniciado. Abrir Studio local para administrar usuarios de prueba.' : 'Supabase local detenido.');
