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

// Ondas originales de SG: una superficie GPU, sin modelos ni texturas remotas.
const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uArea;
  uniform vec2 uPointer;
  void main() {
    vec2 p = vUv;
    p += uPointer * vec2(.035, .025);
    vec3 color = vec3(0.0);
    float t = uTime * .16;
    for (int i = 0; i < 7; i++) {
      float n = float(i);
      float curve = .26 + .16 * sin(p.x * 5.0 - .5 + t + n * .12)
        + .13 * sin(p.x * 2.8 + t * .6) + n * .024;
      float d = abs(p.y - curve);
      float edge = exp(-d * (170.0 + n * 12.0));
      float glow = exp(-d * 22.0) * .10;
      vec3 blue = mix(vec3(.20,.39,.58), vec3(.52,.73,.89), n / 7.0);
      color += blue * (edge * .38 + glow);
    }
    float orangeCurve = .29 + .20 * sin(p.x * 4.5 + .65 + t * .75 + uArea * .12);
    float orangeD = abs(p.y - orangeCurve);
    color += vec3(.94,.35,.16) * (exp(-orangeD * 220.0) * .9 + exp(-orangeD * 32.0) * .15);
    float halo = exp(-length((p - vec2(.49,.53)) * vec2(2.0,2.8)) * 3.0);
    color += vec3(.15,.32,.48) * halo * .38;
    float fade = smoothstep(0.0,.15,p.x) * (1.0 - smoothstep(.84,1.0,p.x))
      * smoothstep(0.0,.12,p.y) * (1.0 - smoothstep(.84,1.0,p.y));
    gl_FragColor = vec4(color * fade, fade);
  }
`;

export default function Escena3D({activo, punteroRef, invalidarRef, alCargar, alFallar}: Props) {
  const elemento = useRef<HTMLDivElement>(null);
  const seleccion = useRef(activo);
  useEffect(() => { seleccion.current = activo; invalidarRef.current(); }, [activo, invalidarRef]);
  useEffect(() => {
    const nodo = elemento.current;
    if (!nodo) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({alpha: true, antialias: false, powerPreference: 'low-power'}); }
    catch { alFallar(); return; }
    let destruido = false;
    let cuadro = 0;
    let anterior = 0;
    let transcurrido = 0;
    let listo = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    renderer.setClearColor(0x000000, 0);
    nodo.appendChild(renderer.domElement);
    const escena = new THREE.Scene();
    const camara = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const geometria = new THREE.PlaneGeometry(2,2);
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {uTime: {value: 0}, uArea: {value: seleccion.current}, uPointer: {value: new THREE.Vector2()}},
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader
    });
    renderer.debug.onShaderError = () => { alFallar(); };
    escena.add(new THREE.Mesh(geometria,material));
    function dibujar(tiempo: number) {
      if (destruido) return;
      cuadro = requestAnimationFrame(dibujar);
      if (tiempo - anterior < 1000/30) return;
      const delta = Math.min((tiempo-anterior)/1000,.08);
      anterior = tiempo;
      transcurrido += delta;
      material.uniforms.uTime.value = transcurrido;
      material.uniforms.uArea.value = THREE.MathUtils.damp(material.uniforms.uArea.value,seleccion.current,3,delta);
      const p = material.uniforms.uPointer.value as THREE.Vector2;
      p.x = THREE.MathUtils.damp(p.x,punteroRef.current[0],4,delta);
      p.y = THREE.MathUtils.damp(p.y,punteroRef.current[1],4,delta);
      renderer.render(escena,camara);
      if (!listo) { listo = true; alCargar(); }
    }
    function dimensionar() {
      if (destruido) return;
      renderer.setSize(nodo!.clientWidth,nodo!.clientHeight);
    }
    const observador = new ResizeObserver(dimensionar); observador.observe(nodo); dimensionar();
    cuadro = requestAnimationFrame(dibujar);
    const perderContexto = (evento: Event) => { evento.preventDefault(); alFallar(); };
    renderer.domElement.addEventListener('webglcontextlost',perderContexto);
    return () => {
      destruido = true; cancelAnimationFrame(cuadro); observador.disconnect(); invalidarRef.current = () => {};
      renderer.domElement.removeEventListener('webglcontextlost',perderContexto);
      geometria.dispose(); material.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [punteroRef,invalidarRef,alCargar,alFallar]);
  return <div className="escena-canvas" ref={elemento}/>;
}
