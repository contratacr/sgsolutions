import Pagina from '@/app/vista-previa/compra/[token]/page';
export {generateMetadata} from '@/app/vista-previa/compra/[token]/page';
export default async function CompraCorta({params}:{params:Promise<{codigo:string}>}){const {codigo}=await params;return Pagina({params:Promise.resolve({token:codigo})});}
