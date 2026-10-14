/** Public snapshots retain the Eurocomp code; private records also retain API stock. */
export function esProductoEurocomp(p:{id:string;codigoEurocomp?:string;eurocomp?:{codigo:string}}) {
 return Boolean(p.eurocomp?.codigo?.trim() || (p.id.startsWith('eurocomp-') && p.codigoEurocomp?.trim()));
}
