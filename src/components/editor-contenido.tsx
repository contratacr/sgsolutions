"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { Contenido } from "@/lib/contenido-modelo";
import { guardarContenido } from "@/app/panel/contenido/acciones";
type Texto = { es: string; en: string };
export function EditorContenido({
  inicial,
  revisionInicial,
  textos,
}: {
  inicial: Contenido;
  revisionInicial: number;
  textos: Record<string, Texto>;
}) {
  const [datos, setDatos] = useState(inicial),
    [revision, setRevision] = useState(revisionInicial),
    [tab, setTab] = useState("casos"),
    [busqueda, setBusqueda] = useState(""),
    [estado, setEstado] = useState(""),
    [ocupado, iniciar] = useTransition();
  const t = useTranslations("AdminContenido"),
    a = useTranslations("AdminCatalogo"),
    router = useRouter();
  function bilingue(titulo: string, valor: Texto, cambiar: (v: Texto) => void) {
    return (["es", "en"] as const).map((l) => (
      <label key={l}>
        {titulo} ({l.toUpperCase()})
        <textarea
          maxLength={4000}
          value={valor[l]}
          onChange={(e) => cambiar({ ...valor, [l]: e.target.value })}
        />
      </label>
    ));
  }
  function caso(i: number, cambio: Partial<Contenido["casos"][number]>) {
    setDatos((d) => ({
      ...d,
      casos: d.casos.map((c, j) => (i === j ? { ...c, ...cambio } : c)),
    }));
  }
  function guardar() {
    iniciar(async () => {
      try {
        const r = await guardarContenido(datos, revision);
        if (r.error) setEstado(r.error);
        else {
          setRevision(r.revision!);
          setEstado("guardado");
          router.refresh();
        }
      } catch {
        setEstado("error");
      }
    });
  }
  return (
    <div className="admin-editor">
      <p>{t("descripcion")}</p>
      <div className="admin-tabs">
        {["casos", "textos", "pagos"].map((k) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {t(k)}
          </button>
        ))}
      </div>
      <fieldset disabled={ocupado} style={{ border: 0, padding: 0 }}>
        {tab === "casos" && (
          <>
            <button
              className="boton boton-contorno"
              onClick={() =>
                setDatos((d) => ({
                  ...d,
                  casos: [
                    ...d.casos,
                    {
                      id: `caso-${crypto.randomUUID().slice(0, 8)}`,
                      publicado: false,
                      cliente: "",
                      categoria: { es: "", en: "" },
                      titulo: { es: "", en: "" },
                      descripcion: { es: "", en: "" },
                      solucion: { es: "", en: "" },
                      fotos: [],
                    },
                  ],
                }))
              }
            >
              {t("nuevo")}
            </button>
            {datos.casos.map((c, i) => (
              <details key={c.id} className="admin-item">
                <summary>{c.cliente || t("nuevo")}</summary>
                <label>
                  {t("cliente")}
                  <input
                    value={c.cliente}
                    onChange={(e) => caso(i, { cliente: e.target.value })}
                  />
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={c.publicado}
                    onChange={(e) => caso(i, { publicado: e.target.checked })}
                  />
                  {a("publicado")}
                </label>
                <div className="admin-fields">
                  {(
                    ["categoria", "titulo", "descripcion", "solucion"] as const
                  ).map((k) => (
                    <div key={k}>
                      {bilingue(t(k), c[k], (v) => caso(i, { [k]: v }))}
                    </div>
                  ))}
                </div>
                {c.fotos.map((f, j) => (
                  <div className="admin-item" key={j}>
                    <label>
                      {t("imagen")}
                      <input
                        value={f.src}
                        onChange={(e) =>
                          caso(i, {
                            fotos: c.fotos.map((x, k) =>
                              k === j ? { ...x, src: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <div className="admin-fields">
                      {bilingue(t("alt"), f.alt, (v) =>
                        caso(i, {
                          fotos: c.fotos.map((x, k) =>
                            k === j ? { ...x, alt: v } : x,
                          ),
                        }),
                      )}
                      {bilingue(t("caption"), f.caption, (v) =>
                        caso(i, {
                          fotos: c.fotos.map((x, k) =>
                            k === j ? { ...x, caption: v } : x,
                          ),
                        }),
                      )}
                    </div>
                    <button
                      onClick={() =>
                        caso(i, { fotos: c.fotos.filter((_, k) => k !== j) })
                      }
                    >
                      {a("quitar")}
                    </button>
                  </div>
                ))}
                <button
                  className="boton boton-contorno"
                  onClick={() =>
                    caso(i, {
                      fotos: [
                        ...c.fotos,
                        {
                          src: "",
                          alt: { es: "", en: "" },
                          caption: { es: "", en: "" },
                        },
                      ],
                    })
                  }
                >
                  {t("nuevaFoto")}
                </button>
                <button
                  className="boton boton-contorno"
                  onClick={() =>
                    setDatos((d) => ({
                      ...d,
                      casos: d.casos.filter((_, j) => j !== i),
                    }))
                  }
                >
                  {a("quitar")}
                </button>
              </details>
            ))}
          </>
        )}
        {tab === "textos" && (
          <>
            <label>
              {t("buscar")}
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </label>
            {Object.entries(textos)
              .filter(([k, v]) =>
                `${k} ${v.es} ${v.en}`
                  .toLowerCase()
                  .includes(busqueda.toLowerCase()),
              )
              .slice(0, 30)
              .map(([k, v]) => (
                <details key={k} className="admin-item">
                  <summary>{k}</summary>
                  <div className="admin-fields">
                    {bilingue(k, datos.textos[k] ?? v, (valor) =>
                      setDatos((d) => ({
                        ...d,
                        textos: { ...d.textos, [k]: valor },
                      })),
                    )}
                  </div>
                </details>
              ))}
          </>
        )}
        {tab === "pagos" && (
          <div className="admin-fields">
            {(["titular", "sinpe"] as const).map((k) => (
              <label key={k}>
                {t(k)}
                <input
                  value={datos.pagos[k]}
                  onChange={(e) =>
                    setDatos((d) => ({
                      ...d,
                      pagos: { ...d.pagos, [k]: e.target.value },
                    }))
                  }
                />
              </label>
            ))}
            {datos.pagos.cuentas.map((c, i) => (
              <div className="admin-item" key={i}>
                {(["banco", "iban"] as const).map((k) => (
                  <label key={k}>
                    {t(k)}
                    <input
                      value={c[k]}
                      onChange={(e) =>
                        setDatos((d) => ({
                          ...d,
                          pagos: {
                            ...d.pagos,
                            cuentas: d.pagos.cuentas.map((x, j) =>
                              j === i ? { ...x, [k]: e.target.value } : x,
                            ),
                          },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </fieldset>
      <div className="admin-actions">
        <button
          className="boton boton-azul"
          disabled={ocupado}
          onClick={guardar}
        >
          {a(ocupado ? "guardando" : "guardar")}
        </button>
        <span role="status">{estado ? a(estado) : a("notaGuardar")}</span>
      </div>
    </div>
  );
}
