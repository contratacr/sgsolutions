// Exercises a production Worker build against LOCAL Supabase. No production credentials.
import { createServer } from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, cp, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { chromium, webkit } from "@playwright/test";
import {
  esquemaCatalogo,
  publicarCatalogo,
  calcularPrecio,
} from "../../src/lib/catalogo-modelo.ts";
const root = process.cwd(),
  appPort = 3118,
  mockPort = 3119,
  base = `http://127.0.0.1:${appPort}`,
  mock = `http://127.0.0.1:${mockPort}`;
const config = JSON.parse(
  await readFile(
    process.env.TEST_SUPABASE_CONFIG ?? ".privado/qa-local/conexion.json",
    "utf8",
  ),
);
assert.equal(
  config.API_URL,
  "http://127.0.0.1:54321",
  "Only local Supabase is permitted.",
);
assert.ok(
  config.SERVICE_ROLE_KEY && config.ANON_KEY,
  "Local Supabase keys are required.",
);
const db = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const original = {};
for (const tabla of ["catalogo_privado", "catalogo_publico"]) {
  const r = await db.from(tabla).select("*").eq("id", 1).maybeSingle();
  assert.ifError(r.error);
  original[tabla] = r.data;
}
const initial = JSON.parse(
    await readFile("src/lib/catalogo-inicial.json", "utf8"),
  ),
  price = calcularPrecio(10, initial.ajustes);
const catalog = esquemaCatalogo.parse({
  ...initial,
  gestion: "manual",
  productos: [
    {
      ...initial.productos[0],
      id: "qa-compra-worker",
      codigoFabricante: "QA-ONLY",
      codigoEurocomp: "QA-ONLY",
      eurocomp: {
        codigo: "QA-ONLY",
        stock: 48,
        costo: 10,
        moneda: "USD",
        actualizado: new Date().toISOString(),
      },
      proveedor: undefined,
      estadoIntcomex: undefined,
      codigoIntcomex: undefined,
      publicado: true,
      precioManual: price,
      costoUsd: 10,
      revisionPrecio: false,
    },
  ],
});
let stock = 48,
  cost = 10,
  emailFailure = false,
  approved = true;
const mails = [],
  operations = [],
  orders = [],
  checks = [],
  cards = [],
  objects = [];
const services = createServer(async (req, res) => {
  let data = Buffer.alloc(0);
  for await (const x of req) data = Buffer.concat([data, x]);
  const u = new URL(req.url, mock);
  const send = (v, status = 200) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(v));
  };
  if (u.pathname === "/eurocomp") {
    const body = data.toString();
    assert.ok(
      !/wsc_send_|orden|preventa/.test(body),
      "Supplier writes are forbidden.",
    );
    operations.push("read");
    res.writeHead(200, { "content-type": "text/xml" });
    res.end(
      `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:t="urn:server"><s:Body><result>0</result><item xsi:type="t:items_Row"><codigo>QA-ONLY</codigo><precio>${cost}</precio><currency_code>USD</currency_code><stock>${stock}</stock></item></s:Body></s:Envelope>`,
    );
    return;
  }
  if (u.pathname === "/brevo") {
    if (emailFailure) return send({ error: "simulated" }, 503);
    mails.push(JSON.parse(data));
    return send({ messageId: "qa-" + mails.length }, 201);
  }
  if (u.pathname === "/tilopay/login") return send({ access_token: "fake" });
  if (u.pathname === "/tilopay/processPayment")
    return send({
      type: "100",
      url: "https://secure.tilopay.com/prueba-simulada",
    });
  if (u.pathname === "/tilopay/consult") {
    const id = JSON.parse(data).orderNumber;
    const r = await db
      .from("pedidos_tilopay")
      .select("total")
      .eq("id", id)
      .single();
    return send({
      type: "200",
      response: [
        {
          orderNumber: id,
          amount: String(r.data.total),
          currency: "CRC",
          environment: "Test",
          code: approved ? "1" : "2",
          id_tilopay: "fake-transaction",
        },
      ],
    });
  }
  send({ error: "Unexpected mock operation" }, 404);
});
await mkdir(path.join(root, ".privado"), { recursive: true });
const work = await mkdtemp(path.join(root, ".privado", "compra-ci-"));
let worker, build, browser;
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([k]) =>
      !/^(SUPABASE|NEXT_PUBLIC_SUPABASE|CUENTAS_|EUROCOMP_|BREVO_|TILOPAY_|PEDIDOS_|SG_|CLOUDFLARE_|CF_)/.test(
        k,
      ),
  ),
);
const claveLocal = config.SERVICE_ROLE_KEY;
const vars = {
  SG_ENTORNO: "local",
  SG_PRUEBAS_INTEGRACION: "1",
  SG_ADMIN_LOCAL: "0",
  SG_QA_LOCAL: "0",
  SG_SERVICIOS_PRUEBA_ORIGEN: mock,
  SUPABASE_URL: config.API_URL,
  SUPABASE_SERVICE_ROLE_KEY: claveLocal,
  NEXT_PUBLIC_SUPABASE_URL: config.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: config.ANON_KEY,
  CUENTAS_SUPABASE_URL: config.API_URL,
  CUENTAS_SUPABASE_ANON_KEY: config.ANON_KEY,
  PEDIDOS_MANUALES_ACTIVOS: "1",
  PEDIDOS_ENLACE_SECRET: randomBytes(32).toString("hex"),
  PEDIDOS_ORIGEN_PUBLICO: base,
  EUROCOMP_WEB_SERVICE_ID: "0",
  EUROCOMP_PASSWORD: "fake",
  EUROCOMP_API_KEY: "",
  BREVO_API_KEY: "fake",
  BREVO_REMITENTE: "qa@example.invalid",
  TILOPAY_MODO: "pruebas",
  TILOPAY_API_USER: "fake",
  TILOPAY_API_PASSWORD: "fake",
  TILOPAY_API_KEY: "fake",
  TILOPAY_PRUEBA_VERIFICADA_EN: new Date().toISOString(),
  TILOPAY_RETORNO_URL: "http://127.0.0.1:3107/api/pagos/tilopay/resultado",
};
const run = (args) =>
  new Promise((resolve, reject) => {
    build = spawn(process.execPath, args, {
      cwd: work,
      env: { ...env, ...vars, SG_PRUEBAS_INTEGRACION: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    build.stdout.on("data", (x) => (log += x));
    build.stderr.on("data", (x) => (log += x));
    build.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              "Worker build failed: " +
                log
                  .replaceAll(config.SERVICE_ROLE_KEY, "[local-key]")
                  .slice(-2000),
            ),
          ),
    );
  });
let ipSequence = 0;
const post = (route, body) =>
  fetch(base + route, {
    method: "POST",
    headers: {
      origin: base,
      "content-type": "application/json",
      "cf-connecting-ip": `192.0.2.${++ipSequence}`,
    },
    body: JSON.stringify(body),
  });
const verify = async () => {
  const r = await post("/api/compra/verificar", {
    idioma: "es",
    articulos: [{ id: "qa-compra-worker", cantidad: 1, precio: price }],
  });
  const body = await r.json();
  if (body.id) checks.push(body.id);
  return { r, body };
};
const payload = (v, method = "sinpe") => ({
  asesoria: v.id,
  acceso: v.token,
  idioma: "es",
  metodo: method,
  articulos: [{ id: "qa-compra-worker", cantidad: 1 }],
  datos: {
    nombre: "QA",
    apellidos: "Worker",
    correo: "qa-worker@example.invalid",
    telefono: "+50688883333",
    modalidad: "retiro",
    factura: "tiquete",
    consentimiento: "on",
  },
});
async function order(v, method) {
  const r = await post("/api/pedidos/manual", payload(v, method));
  const d = await r.json();
  if (d.url) {
    const id = new URL(d.url, base).searchParams.get("pedido");
    orders.push(id);
  }
  return { r, d };
}
try {
  console.log("Preparing isolated build and local database.");
  for (const name of execFileSync("git", [
    "ls-files",
    "-co",
    "--exclude-standard",
    "-z",
  ])
    .toString()
    .split("\0")
    .filter(Boolean)) {
    if (name.startsWith(".privado/")) continue;
    await cp(path.join(root, name), path.join(work, name), { recursive: true });
  }
  await cp(path.join(root, "node_modules"), path.join(work, "node_modules"), {
    recursive: true,
    verbatimSymlinks: true,
  });
  const pkg = JSON.parse(
    await readFile(path.join(work, "package.json"), "utf8"),
  );
  pkg.scripts.build = "next build --webpack";
  await writeFile(path.join(work, "package.json"), JSON.stringify(pkg));
  await writeFile(
    path.join(work, ".env.production"),
    Object.entries(vars)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join("\n"),
    { mode: 0o600 },
  );
  for (const [tabla, contenido] of [
    ["catalogo_privado", catalog],
    ["catalogo_publico", publicarCatalogo(catalog)],
  ]) {
    const r = await db.from(tabla).upsert({ id: 1, contenido });
    assert.ifError(r.error);
  }
  await new Promise((r) => services.listen(mockPort, "127.0.0.1", r));
  await run(["node_modules/@opennextjs/cloudflare/dist/cli/index.js", "build"]);
  // Loopback fixtures require omitting strictly-public fetch ONLY in this isolated test config.
  await writeFile(
    path.join(work, "wrangler.testing.json"),
    JSON.stringify({
      name: "sg-prueba-compra",
      main: ".open-next/worker.js",
      compatibility_date: "2026-09-09",
      compatibility_flags: ["nodejs_compat"],
      assets: { directory: ".open-next/assets", binding: "ASSETS" },
      services: [
        { binding: "WORKER_SELF_REFERENCE", service: "sg-prueba-compra" },
      ],
      vars,
    }),
  );
  worker = spawn(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "dev",
      "--local",
      "--config",
      "wrangler.testing.json",
      "--port",
      String(appPort),
      "--ip",
      "127.0.0.1",
    ],
    { cwd: work, env, stdio: "ignore" },
  );
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(base + "/api/catalogo")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, "Compiled Worker did not start.");
  console.log(
    "Testing stock, prices, real database writes, duplicate submits and receipt storage.",
  );
  stock = 14;
  assert.equal((await verify()).r.status, 409);
  stock = 48;
  cost = 20;
  assert.equal((await verify()).r.status, 409);
  cost = 10;
  for (const method of ["sinpe", "transferencia"]) {
    const v = (await verify()).body;
    const attempts = await Promise.all([order(v, method), order(v, method)]);
    assert.deepEqual(attempts.map((x) => x.r.status).sort(), [201, 403]);
    const d = attempts.find((x) => x.r.status === 201).d;
    const url = new URL(d.url, base),
      id = url.searchParams.get("pedido");
    const f = new FormData();
    f.set("pedido", id);
    f.set("acceso", url.searchParams.get("acceso"));
    f.set(
      "archivo",
      new Blob(["%PDF-1.7\n" + "0".repeat(200)], { type: "application/pdf" }),
      "qa.pdf",
    );
    assert.equal(
      (
        await fetch(base + "/api/pedidos/manual/comprobante", {
          method: "POST",
          headers: { origin: base },
          body: f,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + "/api/pedidos/manual/comprobante", {
          method: "POST",
          headers: { origin: base },
          body: f,
        })
      ).status,
      409,
    );
    const r = await db
      .from("pedidos_manuales")
      .select("estado,total_cobrar,comprobante_path")
      .eq("id", id)
      .single();
    assert.ifError(r.error);
    assert.equal(r.data.estado, "comprobante_recibido");
    assert.equal(Number(r.data.total_cobrar), price);
    objects.push(r.data.comprobante_path);
  }
  emailFailure = true;
  const v = (await verify()).body;
  assert.equal((await order(v)).r.status, 201);
  emailFailure = false;
  const vc = (await verify()).body;
  const data = payload(vc).datos;
  const card = await post("/api/pagos/tilopay/iniciar", {
    asesoria: vc.id,
    acceso: vc.token,
    idioma: "es",
    articulos: [{ id: "qa-compra-worker", cantidad: 1 }],
    ...data,
    consentimiento: true,
    datos: data,
  });
  assert.equal(card.status, 200);
  const created = await db
    .from("pedidos_tilopay")
    .select("id")
    .eq("cliente->>correo", "qa-worker@example.invalid");
  cards.push(...created.data.map((x) => x.id));
  assert.ok(cards.length);
  const callback = await fetch(
    base +
      "/api/pagos/tilopay/resultado?returnData=" +
      encodeURIComponent(btoa(cards[0])),
    { redirect: "manual" },
  );
  assert.equal(callback.status, 302);
  const paid = await db
    .from("pedidos_tilopay")
    .select("estado,entorno")
    .eq("id", cards[0])
    .single();
  assert.equal(paid.data.estado, "pagado");
  assert.equal(paid.data.entorno, "pruebas");
  const mailCount = mails.length;
  await fetch(
    base +
      "/api/pagos/tilopay/resultado?returnData=" +
      encodeURIComponent(btoa(cards[0])),
    { redirect: "manual" },
  );
  assert.equal(
    mails.length,
    mailCount,
    "Duplicate callbacks must not send duplicate payment emails.",
  );
  approved = false;
  const declinedVerification = (await verify()).body;
  const declined = await post("/api/pagos/tilopay/iniciar", {
    asesoria: declinedVerification.id,
    acceso: declinedVerification.token,
    idioma: "es",
    articulos: [{ id: "qa-compra-worker", cantidad: 1 }],
    ...data,
    consentimiento: true,
    datos: data,
  });
  assert.equal(declined.status, 200);
  const cardRows = await db
    .from("pedidos_tilopay")
    .select("id")
    .eq("cliente->>correo", "qa-worker@example.invalid");
  const declinedId = cardRows.data.find((x) => !cards.includes(x.id)).id;
  cards.push(declinedId);
  await fetch(
    base +
      "/api/pagos/tilopay/resultado?returnData=" +
      encodeURIComponent(btoa(declinedId)),
    { redirect: "manual" },
  );
  assert.equal(
    (
      await db
        .from("pedidos_tilopay")
        .select("estado")
        .eq("id", declinedId)
        .single()
    ).data.estado,
    "rechazado",
  );
  approved = true;
  for (const engine of [chromium, webkit]) {
    browser = await engine.launch();
    for (const lang of ["es", "en"])
      for (const width of [390, 1440]) {
        const ctx = await browser.newContext({
          viewport: { width, height: 844 },
          extraHTTPHeaders: { "cf-connecting-ip": `192.0.2.${++ipSequence}` },
        });
        await ctx.addCookies([
          { name: "sg-idioma", value: lang, domain: "127.0.0.1", path: "/" },
        ]);
        const p = await ctx.newPage();
        await p.goto(base + "/tienda");
        await p.locator(".shop-producto button").first().click();
        await p.goto(base + "/finalizar-compra");
        const form = p.locator("main form");
        for (const [k, v] of Object.entries({
          nombre: "QA",
          apellidos: "Browser",
          correo: "qa-browser@example.invalid",
          telefono: "+50688883333",
        }))
          await form.locator(`[name=${k}]`).fill(v);
        await form.locator("[name=consentimiento]").check();
        await form
          .locator("input[type=file]")
          .setInputFiles({
            name: "qa.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from("%PDF-1.7\n" + "0".repeat(200)),
          });
        await form.locator("button[type=submit]").click();
        await p
          .getByRole("button", {
            name: lang === "es" ? "Completar pedido" : "Complete order",
            exact: true,
          })
          .click();
        await p.waitForURL(/\/finalizar-compra\/pedido\?/);
        const id = new URL(p.url()).searchParams.get("pedido");
        orders.push(id);
        const row = await db
          .from("pedidos_manuales")
          .select("estado,comprobante_path")
          .eq("id", id)
          .single();
        assert.equal(row.data.estado, "comprobante_recibido");
        objects.push(row.data.comprobante_path);
        assert.equal(await p.locator("html").getAttribute("lang"), lang);
        await ctx.close();
      }
    await browser.close();
    browser = null;
  }
  assert.ok(operations.length > 0 && mails.length > 0);
  await mkdir(".privado/evidencias", { recursive: true });
  await writeFile(
    ".privado/evidencias/compras-worker.json",
    JSON.stringify({
      workerCompilado: true,
      baseLocal: true,
      pedidos: orders.length,
      tarjetasSimuladas: cards.length,
      correosSimulados: mails.length,
      cobrosReales: 0,
      comprasEurocomp: 0,
    }),
  );
  console.log(
    "PASS: compiled Worker, real local Supabase, SINPE, transfer, receipts, duplicate submits, simulated card/callback, Chrome/WebKit and ES/EN.",
  );
} finally {
  if (browser) await browser.close();
  worker?.kill("SIGTERM");
  build?.kill("SIGTERM");
  await new Promise((r) => services.close(r));
  if (objects.length)
    await db.storage.from("comprobantes-pedidos").remove(objects);
  if (orders.length)
    await db.from("pedidos_manuales").delete().in("id", orders);
  if (cards.length) await db.from("pedidos_tilopay").delete().in("id", cards);
  if (checks.length)
    await db.from("solicitudes_asesoria").delete().in("id", checks);
  // Browser-created verifications are also tagged through this unique QA product.
  const own = await db.from("solicitudes_asesoria").select("id,articulos");
  const ids = (own.data ?? [])
    .filter((x) =>
      x.articulos.some((a) => a.producto?.id === "qa-compra-worker"),
    )
    .map((x) => x.id);
  if (ids.length) await db.from("solicitudes_asesoria").delete().in("id", ids);
  for (const tabla of Object.keys(original)) {
    if (original[tabla]) await db.from(tabla).upsert(original[tabla]);
    else await db.from(tabla).delete().eq("id", 1);
  }
  await rm(work, { recursive: true, force: true });
}
