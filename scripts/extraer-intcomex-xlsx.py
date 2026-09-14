"""Extrae el XLSX de WebStore a JSON privado para la carga inicial, sin modificarlo."""
import sys, json, re
from pathlib import Path
import openpyxl
if len(sys.argv) != 4:
    raise SystemExit('Uso: python extraer-intcomex-xlsx.py entrada.xlsx .privado/salida.json USD|CRC')
currency=sys.argv[3]
if currency not in ('USD','CRC'):raise SystemExit('Indique la moneda de la exportación: USD o CRC')
sheet = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True).active
rows = list(sheet.values)
if rows[1][:8] != ('Categoría','Nombre','Marca','Precio','Disponibilidad','No. de Parte','SKU','Atributos'):
    raise SystemExit('Encabezados no reconocidos; no se importó el archivo.')
categories = {'Portátiles':'computo','Computadores de Mesa':'computo','Todo-en-Uno':'computo','Tableta':'computo','2-en-1':'computo','Monitores':'componentes','Ratones':'accesorios','Mochilas':'accesorios','Accesorios para Portátiles':'accesorios','Combos de Teclado y Ratón':'accesorios','Auriculares':'accesorios','Auriculares y Manos Libres':'accesorios','Seguridad':'accesorios','Teclados y Teclados de Números':'accesorios','Tabletas Digitales':'accesorios','Accesorios para Computadores de Mesa':'accesorios','Accesorios':'accesorios'}
# Traducción literal de los términos presentes en la exportación inicial.
to_en={'Mochila para transporte de portátil':'Laptop backpack','Bloqueo de cable de seguridad':'Security cable lock','diestro y zurdo':'ambidextrous','3 botones':'3 buttons','Ratón':'Mouse','óptico':'optical','cableado':'wired','negro con toques rojos':'black with red accents','Mochila de transporte':'Carrying backpack','Gráficos integrados':'Integrated graphics','Gráficos Intel Arc':'Intel Arc graphics','1 año de garantía':'1-year warranty','3 años de garantía':'3-year warranty','Adaptador de corriente':'Power adapter','Capacidad del disco duro':'Hard Drive Capacity','Estación de conexión':'Docking station','Estados Unidos':'United States','con un adaptador USB-C adicional de 135W':'with an additional 135W USB-C adapter','Abrazadera de montaje de sistema':'System mounting bracket','Ordenador portátil':'Notebook','Pantalla táctil':'Touchscreen','Sistema de realidad virtual':'Virtual reality system','blanco luz de luna':'moonlight white','negro azabache':'raven black','portátil':'portable','vatios':'watts','Español':'Spanish','Maletín':'Carrying case','Azul':'Blue','Negro':'Black','negro':'black','para ':'for '}
to_es={'Keyboard and mouse set':'Teclado y ratón','Keyboard and mouse pad':'Teclado y alfombrilla de ratón','Carrying backpack':'Mochila de transporte','Digital pen':'Lápiz digital','Integrated graphics':'Gráficos integrados','Hard Drive Capacity':'Capacidad de almacenamiento','Small form factor':'Formato compacto','Ergonomic Design':'Diseño ergonómico','All black':'Negro','3-year warranty':'3 años de garantía','1-year warranty':'1 año de garantía','Earphones':'Audífonos','Earbuds':'Audífonos','Wireless':'Inalámbrico','Wired':'Con cable','Mouse':'Ratón','Keyboard':'Teclado','Notebook':'Portátil','Spanish':'Español','White':'Blanco','Gray':'Gris','Touch':'Táctil','or Later':'o posterior'}
def translate(value,terms):
    for a,b in terms.items():value=value.replace(a,b)
    return value
out=[]
for row in rows[2:]:
    cat,name,brand,price,stock,mpn,sku,attributes=row[:8]
    if cat not in categories: raise SystemExit('Categoría no mapeada: '+str(cat))
    if not isinstance(price,(float,int)) or price<=0:raise SystemExit('Precio inválido en la exportación')
    stock_text=str(stock or '').strip()
    if re.fullmatch(r'\d+',stock_text):quantity=int(stock_text);exact=True
    elif stock_text=='Más de 20':quantity=21;exact=False
    else:quantity=None;exact=False
    category=categories[cat]
    if re.search(r'\b(gaming|gamer|legion|victus|predator|rog|LOQ)\b',name,re.I):category='gaming'
    out.append(dict(sku=str(sku),mpn=str(mpn or ''),marca=brand,nombreEs=translate(name,to_es),nombreEn=translate(name,to_en),categoria=category,costo=price,moneda=currency,stock=quantity,stockExacto=exact,tipo='Physical',imagen=''))
p=Path(sys.argv[2]);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,ensure_ascii=False,indent=2));p.chmod(0o600)
print(json.dumps({'filas':len(out),'skuUnicos':len({x['sku'] for x in out}),'sinImagen':len(out)}))
