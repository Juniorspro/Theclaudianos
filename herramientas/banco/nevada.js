#!/usr/bin/env node
/* Banco de Arena Nevada: abre el HTML armado en chromium headless como un celular
   en vertical (412x892, toque), saca capturas del menu y de la partida, y mide.

     node herramientas/banco/nevada.js [html] [carpeta]
       html     juegos-pc/ArenaNevada.html
       carpeta  crudo/banco/nevada   (fuera de git)
     DPR=2  SEG=8   (segundos de JUEGO que corre la partida antes de la ultima foto)
   ANCHO=446      (ancho de cada foto en la hoja; 892 = tamano real de la pantalla acostada)

   Las fotos salen giradas: el juego gira #escenario 90 grados en vertical. La hoja de
   contacto (hoja.png) las endereza. Los cuadros por segundo de aca no dicen nada de un
   telefono (swiftshader dibuja por procesador): valen errores, pedidos, llamadas y fotos. */
'use strict';
const fs = require('fs'), path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const HTML = path.resolve(process.argv[2] || 'juegos-pc/ArenaNevada.html');
const DIR = path.resolve(process.argv[3] || 'crudo/banco/nevada');
const DPR = +(process.env.DPR || 2), SEG = +(process.env.SEG || 8);
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/* Cuenta cuadros y deja medir llamadas y triangulos de TODAS las pasadas del cuadro. */
const SONDA = `
  window.__B = { cuadros: 0, info: null };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => raf((t) => { window.__B.cuadros++; f(t); });
`;
const ENGANCHAR = `(() => {
  if (!window.Game || !Game.ren || Game.__banco) return !!(window.Game && Game.__banco);
  const dib = Game.dibujar, info = Game.ren.info;
  info.autoReset = false;
  Game.dibujar = function () {
    info.reset(); dib.apply(this, arguments);
    __B.info = { llamadas: info.render.calls, triangulos: info.render.triangles,
                 geometrias: info.memory.geometries, texturas: info.memory.textures };
  };
  Game.__banco = true;
  return true;
})()`;
const ESTADO = `({
  cuadros: __B.cuadros, info: __B.info,
  enMarcha: !!(window.Game && Game.enMarcha), tiempo: window.Game ? +(Game.tiempo || 0).toFixed(2) : null,
  pantalla: (document.querySelector('.pantalla.ver') || {}).id || null,
  heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
  lienzo: (() => { const c = document.getElementById('lienzo'); return c ? c.width + 'x' + c.height : null; })()
})`;

async function esperar(pg, cond, ms) {
  try { await pg.waitForFunction(cond, null, { timeout: ms, polling: 250 }); return true; }
  catch (e) { return false; }
}

async function medirTramo(pg, segundosPared) {
  const a = await pg.evaluate(ESTADO), t0 = Date.now();
  await pg.waitForTimeout(segundosPared * 1000);
  const b = await pg.evaluate(ESTADO), dt = (Date.now() - t0) / 1000;
  return { ...b, cuadrosPorSeg: +((b.cuadros - a.cuadros) / dt).toFixed(2),
           juegoPorSeg: b.tiempo != null && a.tiempo != null ? +((b.tiempo - a.tiempo) / dt).toFixed(3) : null };
}

async function hoja(nav, fotos, W = +(process.env.ANCHO || 446)) {
  const H = Math.round(W * 412 / 892), L = (W - H) / 2;
  const celdas = fotos.map(([n, f]) => {
    const b64 = fs.readFileSync(f).toString('base64');
    return `<figure><div class="m"><img src="data:image/png;base64,${b64}"></div><figcaption>${n}</figcaption></figure>`;
  }).join('');
  const pg = await nav.newPage({ viewport: { width: Math.max(1360, W + 16), height: 400 }, deviceScaleFactor: 1 });
  await pg.setContent(`<style>
    body{margin:0;background:#111;color:#ddd;font:14px monospace;display:flex;flex-wrap:wrap;gap:8px;padding:8px}
    figure{margin:0} .m{width:${W}px;height:${H}px;overflow:hidden;position:relative;background:#000}
    .m img{width:${H}px;height:${W}px;position:absolute;left:${L}px;top:${-L}px;transform:rotate(-90deg)}
  </style>${celdas}`);
  const salida = path.join(DIR, 'hoja.png');
  await pg.screenshot({ path: salida, fullPage: true });
  await pg.close();
  return salida;
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const nav = await pw.chromium.launch({ executablePath: CHROME, args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await nav.newContext({ viewport: { width: 412, height: 892 }, hasTouch: true,
                                     isMobile: true, deviceScaleFactor: DPR });
  await ctx.addInitScript(SONDA);
  const pg = await ctx.newPage();
  const errores = [], avisos = [], afuera = [];
  pg.on('pageerror', (e) => errores.push(String(e.message || e).slice(0, 300)));
  pg.on('console', (m) => {
    if (m.type() === 'error') errores.push(m.text().slice(0, 300));
    else if (m.type() === 'warning') avisos.push(m.text().slice(0, 200));
  });
  pg.on('request', (r) => { if (!/^(file|data|blob|about):/.test(r.url())) afuera.push(r.url().slice(0, 120)); });

  const fotos = [], r = { html: path.relative(process.cwd(), HTML), dpr: DPR };
  const foto = async (n) => { const f = path.join(DIR, n + '.png'); await pg.screenshot({ path: f }); fotos.push([n, f]); };

  const t0 = Date.now();
  await pg.goto('file://' + HTML, { waitUntil: 'load', timeout: 120000 });
  r.cargaSeg = +((Date.now() - t0) / 1000).toFixed(1);
  r.arranco = await esperar(pg, ENGANCHAR, 60000);
  r.menu = await medirTramo(pg, 4);
  await foto('1_menu');

  await pg.evaluate(() => __ir('nueva'));
  r.entro = await esperar(pg, 'window.Game && Game.enMarcha && Game.tiempo > 1.5', 120000);
  await foto('2_partida');
  r.partida = await medirTramo(pg, 4);
  r.llego = await esperar(pg, `Game.tiempo >= ${SEG}`, 240000);
  r.partidaFin = await pg.evaluate(ESTADO);
  await foto('3_partida_' + SEG + 's');

  r.errores = errores; r.avisos = [...new Set(avisos)].slice(0, 12); r.pedidosAfuera = afuera;
  r.hoja = path.relative(process.cwd(), await hoja(nav, fotos));
  await nav.close();
  console.log(JSON.stringify(r, null, 1));
})().catch((e) => { console.error('BANCO ROTO:', e); process.exit(1); });
