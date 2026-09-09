'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';

type Props = {
  activo: number;
  punteroRef: RefObject<[number, number]>;
  invalidarRef: RefObject<() => void>;
  alCargar: () => void;
  alFallar: () => void;
};

// Three.js directo evita acoplar el renderizador a otra versión de React.
export default function Escena3D({activo, punteroRef, invalidarRef, alCargar, alFallar}: Props) {
  const elemento = useRef<HTMLDivElement>(null);
  const seleccion = useRef(activo);
  useEffect(() => { seleccion.current = activo; invalidarRef.current(); }, [activo, invalidarRef]);
  useEffect(() => {
    const nodo = elemento.current;
    if (!nodo) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'}); }
    catch { alFallar(); return; }
    let destruido = false;
    let cuadro = 0;
    let anterior = 0;
    const escena = new THREE.Scene();
    const camara = new THREE.OrthographicCamera(-4,4,2.5,-2.5,.1,30);
    camara.position.set(4.5,4.4,6);
    camara.lookAt(0,0,0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    nodo.appendChild(renderer.domElement);
    const grupo = new THREE.Group();
    grupo.rotation.y = -.2;
    escena.add(grupo, new THREE.AmbientLight('#ffffff',1.8));
    const luz = new THREE.DirectionalLight('#c9e3ff',3);
    luz.position.set(2,5,3); escena.add(luz);
    const rebote = new THREE.DirectionalLight('#628fbd',2);
    rebote.position.set(-3,1,-2); escena.add(rebote);
    const geometrias: THREE.BufferGeometry[] = [];
    const materiales: THREE.Material[] = [];
    function material(color: string, metalness = .5) {
      const mat = new THREE.MeshStandardMaterial({color, metalness, roughness: .32});
      materiales.push(mat); return mat;
    }
    function malla(geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number,number,number]) {
      geometrias.push(geo); const mesh = new THREE.Mesh(geo,mat); mesh.position.set(...pos); grupo.add(mesh); return mesh;
    }
    function caja(tamano: [number,number,number], pos: [number,number,number], mat: THREE.Material) { return malla(new THREE.BoxGeometry(...tamano),mat,pos); }
    const azul = material('#2f4e73');
    const oscuro = material('#152b42',.6);
    const plata = material('#91afcb',.75);
    const naranja = material('#f05a28',.2);
    caja([2.65,.12,2.65],[0,-.52,0],oscuro);
    caja([2.4,.1,2.4],[0,-.31,0],plata);
    caja([2,.3,2],[0,-.08,0],azul);
    caja([1.4,.04,1.4],[0,.09,0],naranja);
    caja([1.3,.07,1.3],[0,.14,0],oscuro);
    for (let i=0;i<8;i++) {
      caja([.07,.08,.18],[-.84+i*.24,-.05,1.1],plata);
      caja([.18,.08,.07],[1.1,-.05,-.84+i*.24],plata);
    }
    const orbital = new THREE.MeshBasicMaterial({color: '#426480', transparent: true, opacity: .7});
    const brillo = new THREE.MeshBasicMaterial({color: '#f05a28'});
    materiales.push(orbital,brillo);
    malla(new THREE.TorusGeometry(2.13,.009,6,100),orbital,[0,-.4,0]).rotation.x = -Math.PI/2;
    const arco = malla(new THREE.TorusGeometry(2.13,.022,6,40,1.4),brillo,[0,-.38,0]);
    arco.rotation.x = -Math.PI/2;
    const modulos = [
      caja([.54,.54,.54],[-2,.1,.55],azul),
      caja([.4,.4,.4],[1.45,.62,-1.5],naranja),
      caja([.44,.44,.44],[1.65,-.05,1.6],azul)
    ];
    for (const posicion of [[-1.6,-.3,-1.5],[.1,-.3,2.13],[2.1,-.3,-.25]] as [number,number,number][]) malla(new THREE.SphereGeometry(.045,12,8),brillo,posicion);
    function dibujar(tiempo: number) {
      cuadro = 0;
      if (destruido) return;
      const delta = Math.min((tiempo-anterior)/1000,.05); anterior = tiempo;
      const x = punteroRef.current[1]*.12;
      const y = -.2 + punteroRef.current[0]*.4 + seleccion.current*.14;
      grupo.rotation.x = THREE.MathUtils.damp(grupo.rotation.x,x,5,delta);
      grupo.rotation.y = THREE.MathUtils.damp(grupo.rotation.y,y,5,delta);
      arco.rotation.z = THREE.MathUtils.damp(arco.rotation.z,seleccion.current*.65,5,delta);
      modulos[0].material = seleccion.current === 1 ? naranja : azul;
      modulos[1].material = seleccion.current === 0 ? naranja : azul;
      modulos[2].material = seleccion.current === 2 ? naranja : azul;
      renderer.render(escena,camara);
      if (Math.abs(grupo.rotation.x-x)+Math.abs(grupo.rotation.y-y)+Math.abs(arco.rotation.z-seleccion.current*.65) > .001) programar();
    }
    function programar() { if (!cuadro && !destruido) cuadro = requestAnimationFrame(dibujar); }
    invalidarRef.current = programar;
    function dimensionar() {
      if (!nodo || destruido) return;
      const ancho = nodo.clientWidth, alto = nodo.clientHeight;
      camara.left = -ancho/184; camara.right = ancho/184;
      camara.top = alto/184; camara.bottom = -alto/184;
      camara.updateProjectionMatrix(); renderer.setSize(ancho,alto); programar();
    }
    const observador = new ResizeObserver(dimensionar); observador.observe(nodo); dimensionar();
    const textura = new THREE.TextureLoader().load('/imagenes/logo-blanco.png', () => {
      if (destruido) return;
      textura.colorSpace = THREE.SRGBColorSpace;
      const matLogo = new THREE.MeshBasicMaterial({map: textura, transparent: true, depthWrite: false}); materiales.push(matLogo);
      malla(new THREE.PlaneGeometry(1.04,.437),matLogo,[0,.179,0]).rotation.x = -Math.PI/2;
      programar(); alCargar();
    }, undefined, () => { if (!destruido) alFallar(); });
    const perderContexto = (evento: Event) => { evento.preventDefault(); alFallar(); };
    renderer.domElement.addEventListener('webglcontextlost',perderContexto);
    return () => {
      destruido = true; cancelAnimationFrame(cuadro); observador.disconnect(); invalidarRef.current = () => {};
      renderer.domElement.removeEventListener('webglcontextlost',perderContexto);
      for (const geo of geometrias) geo.dispose();
      for (const mat of materiales) mat.dispose();
      textura.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [punteroRef,invalidarRef,alCargar,alFallar]);
  return <div className="escena-canvas" ref={elemento}/>;
}
