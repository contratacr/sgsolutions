// Variante ligera de la misma foto del panel. Si se cambia, se respeta la nueva URL.
const soporteOriginal='https://xkfiawkixcyzpfdwccxz.supabase.co/storage/v1/object/public/imagenes-admin/9b073e47-d613-4aa4-929a-85de2ac2eb8f.webp';
export function imagenInicio(src:string){return src===soporteOriginal?'/imagenes/inicio-soporte-9b073e47.webp':src;}
