import Compra from '@/app/finalizar-compra/page';
import {leerEnlaceCompra} from '@/lib/asesorias';
export {generateMetadata} from '@/app/finalizar-compra/page';

export default async function CompraPrivada({params}:{params:Promise<{acceso:string}>}){
 const {acceso}=await params;
 const solicitud=await leerEnlaceCompra(acceso);
 return <Compra searchParams={Promise.resolve({asesoria:solicitud?.id??'invalido',acceso:solicitud?.token??''})}/>;
}
