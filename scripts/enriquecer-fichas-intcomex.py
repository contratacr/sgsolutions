import json,re,html,urllib.request,concurrent.futures
from pathlib import Path
fichas={'GY51S61915':636921,'GY51S61921':636923,'GXD1Q65145':636910,'GY50Z18991':547712,'ZG38C05190':636924,'83TD0039GJ':638520,'21R2S4EB00':642868,'83TD003AGJ':638521,'21QL006DFJ':627485,'82XM016KGJ':636376,'82XM016JGJ':636368,'13GN0049FJ':642525,'21Q6005RFJ':627486,'82XQ014LGJ':647201,'12RQ003HFJ':636631,'12RQ003JFJ':636627,'4X40T84059':399073}
def read(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=20).read().decode('utf-8')
def clean(s):return html.unescape(re.sub('<[^>]+>','',s)).strip()
def ficha(item):
 mpn,id=item
 try:
  if not id:
   resultado=read('https://store.intcomex.com/es-XCR/Products/ByKeyword?term='+urllib.parse.quote(mpn))
   for bloque in re.split(r'<div id="row_\d+"',resultado)[1:]:
    if re.search(r'MPN:</span>.*?<span[^>]*>'+re.escape(mpn)+r'</span>',bloque,re.S):
     encontrado=re.search(r'/Product/Detail/(\d+)',bloque)
     if encontrado:id=int(encontrado[1]);break
   if not id:return mpn,[],None
  langs={}
  for l in ['es','en']:
   h=read(f'https://store.intcomex.com/{l}-XCR/Product/Detail/{id}')
   if mpn not in h:return mpn,[],None
   section=h.split('id="tabs-2"')[-1].split('id="tabs-6"')[0]
   pairs=re.findall(r'<div class="col-xs-4[^>]*>(.*?)</div>\s*<div class="col-xs-8[^>]*>(.*?)</div>',section,re.S)
   langs[l]=[(clean(a),clean(b)) for a,b in pairs]
  specs=[{'nombre':{'es':a,'en':langs['en'][i][0]},'valor':{'es':b,'en':langs['en'][i][1]}} for i,(a,b) in enumerate(langs['es']) if i<len(langs['en']) and a and b and langs['en'][i][0] and langs['en'][i][1]]
  tag=re.search(r'<img[^>]*ws_images_style[^>]*>',h);src=re.search(r'src="([^"]+)"',tag[0])[1] if tag else None
  return mpn,specs,urllib.parse.urljoin('https://store.intcomex.com',html.unescape(src)) if src and 'noimage' not in src else None
 except Exception:return mpn,[],None
productos=json.loads(Path('src/lib/catalogo-base.json').read_text())['productos']
for producto in productos:
 if producto['codigoFabricante']:fichas.setdefault(producto['codigoFabricante'],None)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:results=list(ex.map(ficha,fichas.items()))
for f in ['catalogo-base','catalogo-inicial']:
 p=Path('src/lib/'+f+'.json');d=json.loads(p.read_text())
 for mpn,specs,image in results:
  for product in d['productos']:
   if product['codigoFabricante']==mpn:
    if specs:product['especificaciones']=specs
    if image and 'sin-imagen' in product['imagen']:product['imagen']=image
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print({'fichas_enriquecidas':sum(bool(s) for _,s,_ in results),'imagenes_encontradas':sum(bool(im) for _,_,im in results)})
