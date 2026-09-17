"use client";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
type Props = {
  activo: number;
  punteroRef: RefObject<[number, number]>;
  invalidarRef: RefObject<() => void>;
  alCargar: () => void;
  alFallar: () => void;
};
// Composición original: órbitas de conectividad, materiales metálicos y nodos luminosos.
export default function Escena3D({
  activo,
  punteroRef,
  invalidarRef,
  alCargar,
  alFallar,
}: Props) {
  const elemento = useRef<HTMLDivElement>(null),
    seleccion = useRef(activo);
  useEffect(() => {
    seleccion.current = activo;
  }, [activo]);
  useEffect(() => {
    const nodo = elemento.current;
    if (!nodo) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      alFallar();
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    nodo.appendChild(renderer.domElement);
    const escena = new THREE.Scene(),
      camara = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camara.position.set(0, 0, 9);
    escena.add(new THREE.AmbientLight(0xbad9ff, 2.2));
    const luz = new THREE.DirectionalLight(0xffffff, 5);
    luz.position.set(3, 5, 4);
    escena.add(luz);
    const acento = new THREE.PointLight(0xff6d30, 70);
    acento.position.set(-2, -1, 3);
    escena.add(acento);
    const azul = new THREE.PointLight(0x479aff, 90);
    azul.position.set(3, 1, 1);
    escena.add(azul);
    const grupo = new THREE.Group();
    grupo.position.set(2.0, 0.35, 0);
    escena.add(grupo);
    const metal = new THREE.MeshStandardMaterial({
      color: 0x86b3df,
      metalness: 0.78,
      roughness: 0.2,
    });
    const naranja = new THREE.MeshStandardMaterial({
      color: 0xff7a3c,
      metalness: 0.55,
      roughness: 0.23,
      emissive: 0x9b320a,
      emissiveIntensity: 0.3,
    });
    const blanco = new THREE.MeshStandardMaterial({
      color: 0xe5f3ff,
      metalness: 0.5,
      roughness: 0.25,
    });
    const geometrias: THREE.BufferGeometry[] = [];
    const orbita = new THREE.TorusGeometry(1.45, 0.065, 12, 100);
    geometrias.push(orbita);
    for (let i = 0; i < 3; i++) {
      const aro = new THREE.Mesh(orbita, i === 1 ? naranja : metal);
      aro.rotation.set(0.6 + i * 0.75, 0.35 + i * 0.65, 0.2);
      grupo.add(aro);
    }
    const nucleoGeo = new THREE.IcosahedronGeometry(0.56, 1);
    geometrias.push(nucleoGeo);
    const nucleo = new THREE.Mesh(nucleoGeo, blanco);
    grupo.add(nucleo);
    const nodoGeo = new THREE.SphereGeometry(0.11, 16, 12);
    geometrias.push(nodoGeo);
    const nodos = Array.from({ length: 9 }, (_, i) => {
      const esfera = new THREE.Mesh(nodoGeo, i % 3 === 0 ? naranja : blanco);
      grupo.add(esfera);
      return esfera;
    });
    let frame = 0,
      antes = 0,
      listo = false;
    function dibujar(t: number) {
      frame = requestAnimationFrame(dibujar);
      if (t - antes < 1000 / 30) return;
      antes = t;
      const tiempo = t * 0.00015;
      grupo.rotation.y = tiempo * 0.4 + punteroRef.current[0] * 0.2;
      grupo.rotation.x = Math.sin(tiempo) * 0.13 + punteroRef.current[1] * 0.12;
      grupo.rotation.z = -0.2;
      nucleo.rotation.set(tiempo, tiempo * 0.7, 0);
      nodos.forEach((n, i) => {
        const a = tiempo + (i * Math.PI * 2) / 9;
        n.position.set(
          Math.cos(a) * 1.45,
          Math.sin(a) * 1.45,
          Math.sin(a * 2 + i) * 0.65,
        );
      });
      acento.intensity = 60 + seleccion.current * 15;
      renderer.render(escena, camara);
      if (!listo) {
        listo = true;
        alCargar();
      }
    }
    function dimensionar() {
      renderer.setSize(nodo!.clientWidth, nodo!.clientHeight);
      camara.aspect = nodo!.clientWidth / Math.max(nodo!.clientHeight, 1);
      camara.updateProjectionMatrix();
    }
    const obs = new ResizeObserver(dimensionar);
    obs.observe(nodo);
    dimensionar();
    frame = requestAnimationFrame(dibujar);
    const perder = (e: Event) => {
      e.preventDefault();
      alFallar();
    };
    renderer.domElement.addEventListener("webglcontextlost", perder);
    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
      invalidarRef.current = () => {};
      renderer.domElement.removeEventListener("webglcontextlost", perder);
      geometrias.forEach((g) => g.dispose());
      [metal, naranja, blanco].forEach((m) => m.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [punteroRef, invalidarRef, alCargar, alFallar]);
  return <div className="escena-canvas" ref={elemento} />;
}
