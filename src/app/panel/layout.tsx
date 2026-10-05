import {NavegacionPanel} from '@/components/navegacion-panel';
export default async function DisenoPanel({children}:{children:React.ReactNode}){
 return <div className="panel-diseno"><NavegacionPanel/>{children}</div>;
}
