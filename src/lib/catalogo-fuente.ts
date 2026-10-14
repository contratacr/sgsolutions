/** Public snapshots retain the Eurocomp code; private records also retain API stock. */
export function esProductoEurocomp(p:{id:string;codigoEurocomp?:string;eurocomp?:{codigo:string}}) {
 return Boolean(p.id.startsWith('eurocomp-') && (p.eurocomp?.codigo?.trim() || p.codigoEurocomp?.trim()));
}
