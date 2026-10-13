import PedidoManual from '@/app/finalizar-compra/pedido/page';
import {datosEnlacePedido} from '@/lib/enlace-pedido';
export {generateMetadata} from '@/app/finalizar-compra/pedido/page';

export default async function Pedido({params, searchParams}: {
  params: Promise<{token: string}>;
  searchParams: Promise<{comprobante?: string}>;
}) {
  const {token} = await params;
  const {comprobante} = await searchParams;
  const datos = datosEnlacePedido(new URL('/pedido/' + encodeURIComponent(token), 'https://sgsolutionscr.com'));
  return <PedidoManual searchParams={Promise.resolve({...datos, comprobante})}/>;
}
