#!/usr/bin/env node
/* Banco de la MARCHA de Arena Nevada: hace correr al jugador en linea recta a varias
   velocidades (andar / correr, con DEX 0, 15 y 30) y mide paso a paso de simulacion:

     pasos/s     dos por cada vuelta de la fase del paso, por segundo de juego
     sube        lo mas que se levanta una bota, en cm
     patina      mientras la bota va mas lenta que el cuerpo (apoyando): su velocidad sobre
                 el suelo / la del cuerpo (0 = clavada, 1 = va con el cuerpo como en patines)
     penetra     lo mas hondo que entra la bota en la caja interior del torso (la del
                 ragdoll, que ya esta 2-3 cm por dentro de la malla), en cm
     separa      lo mas que se separan las dos botas en el eje de la marcha, en m

   y saca una tira de fotos de perfil y de 3/4 de medio segundo de cada carrera.

     node herramientas/banco/marcha.js [html] [carpeta]      (crudo/banco/marcha)
   Las fotos son del render crudo (sin HUD), con una camara propia pegada al jugador. */
'use strict';
const fs = require('fs'), path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const HTML = path.resolve(process.argv[2] || 'juegos-pc/ArenaNevada.html');
const DIR = path.resolve(process.argv[3] || 'crudo/banco/marcha');
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const CASOS = [
  { n: 'andar DEX 0', dex: 0, correr: false, fotos: true }, { n: 'correr DEX 0', dex: 0, correr: true, fotos: true },
  { n: 'andar DEX 30', dex: 30, correr: false }, { n: 'correr DEX 15', dex: 15, correr: true },
  { n: 'correr DEX 30', dex: 30, correr: true, fotos: true }
];
const DUR = 2.2, CALIENTA = 0.35;          // segundos de juego: lo que dura y lo que se descarta al arrancar

/* Se instala en la pagina: graba cada paso de simulacion despues de Game.paso. */
const INSTALAR = `(() => {
  if (window.__M) return true;
  const H = Chars.H, v = new THREE.Vector3(), inv = new THREE.Matrix4();
  const CAJA = { hx: 0.26, y0: -0.07, y1: 0.80, hz: 0.235, z: 0.004 };       // ragdoll.js
  const BOTA = { c: [0, -0.0935, 0.022], h: [0.09, 0.0775, 0.1575] };        // ragdoll.js / chars.js
  const muestras = [];
  for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) for (const k of [-1, 0, 1])
    muestras.push([BOTA.c[0] + i * BOTA.h[0], BOTA.c[1] + j * BOTA.h[1], BOTA.c[2] + k * BOTA.h[2]]);
  const cam = new THREE.PerspectiveCamera(30, 2, 0.1, 60);
  const M = window.__M = { grabar: false, filas: [], fotos: [], fotoCada: 0, fotoHasta: 0, n: 0 };
  function foto(A) {
    const r = Game.ren, c = r.domElement, sal = [];
    cam.aspect = c.width / c.height; cam.updateProjectionMatrix();
    for (const vista of ['perfil', 'tres']) {
      if (vista === 'perfil') cam.position.set(A.x, 0.85, A.z + 3.4);
      else cam.position.set(A.x + 2.2, 1.35, A.z + 2.6);
      cam.lookAt(A.x, 0.72, A.z);
      r.setRenderTarget(null); r.render(Game.escena, cam);
      sal.push(c.toDataURL('image/jpeg', 0.82));
    }
    return sal;
  }
  const paso = Game.paso;
  Game.paso = function (dt) {
    paso.apply(this, arguments);
    if (!M.grabar) return;
    const A = Game.jugador, hs = A.cuerpo.huesos;
    A.grupo.updateMatrixWorld(true);
    inv.copy(hs[H.CUERPO].matrixWorld).invert();
    let pen = 0;
    const pies = [];
    for (const id of [H.PIE_I, H.PIE_D]) {
      v.set(BOTA.c[0], BOTA.c[1], BOTA.c[2]).applyMatrix4(hs[id].matrixWorld);
      pies.push([v.x, v.y, v.z]);
      for (const m of muestras) {
        v.set(m[0], m[1], m[2]).applyMatrix4(hs[id].matrixWorld).applyMatrix4(inv);
        const dx = CAJA.hx - Math.abs(v.x), dy = Math.min(v.y - CAJA.y0, CAJA.y1 - v.y),
              dz = CAJA.hz - Math.abs(v.z - CAJA.z);
        if (dx > 0 && dy > 0 && dz > 0) pen = Math.max(pen, Math.min(dx, dy, dz));
      }
    }
    v.setFromMatrixPosition(hs[H.CUERPO].matrixWorld);
    M.filas.push({ t: Game.tiempo, x: A.x, z: A.z, vel: Math.hypot(A.vx, A.vz || 0), pies, pen,
                   cuerpoY: v.y, fase: A.anim.fase });
    M.n++;
    if (M.fotoCada && M.n % M.fotoCada === 0 && M.fotos.length < M.fotoHasta && Game.tiempo - M.filas[0].t >= 0.5) M.fotos.push(foto(A));
  };
  return true;
})()`;

/* Las cuentas, tambien en la pagina: devuelve el resumen de una carrera. */
const MEDIR = `((calienta) => {
  const F = __M.filas.filter((f) => f.t - __M.filas[0].t >= calienta);
  const dur = F[F.length - 1].t - F[0].t, dt = (F[F.length - 1].t - F[0].t) / (F.length - 1);
  const vel = F.reduce((s, f) => s + f.vel, 0) / F.length;
  let vueltas = 0, sumaPat = 0, nPat = 0, pen = 0, separa = 0, subeMax = 0;
  const dirX = Math.sign(F[F.length - 1].x - F[0].x) || 1;
  /* la cadencia, por las vueltas de la fase del animador (un ciclo = dos pasos) */
  for (let i = 1; i < F.length; i++) vueltas += ((F[i].fase - F[i - 1].fase) % 1 + 1) % 1;
  /* apoyado: la bota va MAS LENTO que el cuerpo (retrocede respecto a el). Por la altura no
     vale: una bota que vuela a ras del suelo hacia delante no esta apoyada. */
  for (let p = 0; p < 2; p++) {
    const ys = F.map((f) => f.pies[p][1]);
    subeMax = Math.max(subeMax, Math.max(...ys) - Math.min(...ys));
    for (let i = 1; i < F.length; i++) {
      const a = F[i - 1].pies[p], b = F[i].pies[p], dt_ = F[i].t - F[i - 1].t;
      const vPie = ((b[0] - a[0]) * dirX) / dt_, vCuerpo = ((F[i].x - F[i - 1].x) * dirX) / dt_;
      if (vPie < vCuerpo * 0.98) { sumaPat += Math.max(0, vPie) / vCuerpo; nPat++; }
    }
  }
  for (const f of F) {
    pen = Math.max(pen, f.pen);
    separa = Math.max(separa, Math.abs((f.pies[0][0] - f.pies[1][0]) * dirX));
  }
  const pasosS = 2 * vueltas / dur;
  return { vel: +vel.toFixed(2), pasosS: +pasosS.toFixed(2), patina: nPat ? +(sumaPat / nPat).toFixed(2) : null,
           subeCm: +(subeMax * 100).toFixed(1), penetraCm: +(pen * 100).toFixed(1), separaM: +separa.toFixed(3), muestras: F.length, dur: +dur.toFixed(2),
           botaCuerpoY: +(Math.max(...F.map((f) => f.cuerpoY)) - Math.min(...F.map((f) => f.cuerpoY))).toFixed(3) };
})`;

async function hoja(nav, filas, salida) {
  const html = filas.map(([n, fotos]) => `<h3>${n}</h3><div class="f">${fotos.map((u) => `<div class="c"><img src="${u}"></div>`).join('')}</div>`).join('');
  const pg = await nav.newPage({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 1 });
  await pg.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:14px monospace;padding:6px}
    h3{margin:6px 0 2px} .f{display:flex;gap:3px} .c{width:170px;height:190px;overflow:hidden;position:relative;background:#000}
    .c img{position:absolute;height:190px;left:50%;top:0;transform:translateX(-50%)}</style>${html}`);
  await pg.screenshot({ path: salida, fullPage: true });
  await pg.close();
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const nav = await pw.chromium.launch({ executablePath: CHROME, args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 412, height: 892 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  const errores = [];
  pg.on('pageerror', (e) => errores.push(String(e.message || e).slice(0, 300)));
  pg.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 300)); });
  await pg.goto('file://' + HTML, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForFunction('window.Game && Game.ren', null, { timeout: 60000 });
  await pg.evaluate(() => __ir('nueva'));
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 2.5 && !Game.jugador.salFondo', null, { timeout: 180000, polling: 250 });
  await pg.evaluate(INSTALAR);

  const res = {}, tiras = [];
  for (const c of CASOS) {
    await pg.evaluate((c) => {
      const A = Game.jugador;
      A.modSpeed = 1 + c.dex / 45;
      A.x = c.dex >= 15 && c.correr ? -21 : -18; A.vx = 0; A.vz = 0; A.z = Arena.PLANO;
      Input.modoTactil = false; Input.teclas = Object.create(null);
      Input.teclas.d = true; if (c.correr) Input.teclas.shift = true;
      __M.filas = []; __M.fotos = []; __M.n = 0;
      __M.fotoCada = c.fotos ? 3 : 0; __M.fotoHasta = c.fotos ? 9 : 0;      // 9 fotos cada 3 pasos (0,45 s), pasado medio segundo
      __M.grabar = true;
    }, c);
    await pg.waitForFunction(`__M.filas.length && Game.tiempo - __M.filas[0].t >= ${DUR}`, null, { timeout: 240000, polling: 200 });
    await pg.evaluate(() => { __M.grabar = false; Input.teclas = Object.create(null); });
    res[c.n] = await pg.evaluate(`${MEDIR}(${CALIENTA})`);
    if (c.fotos) {
      const fotos = await pg.evaluate(() => __M.fotos);
      tiras.push([c.n + ' — perfil', fotos.map((f) => f[0])], [c.n + ' — 3/4', fotos.map((f) => f[1])]);
    }
    console.error(c.n, JSON.stringify(res[c.n]));
  }
  await hoja(nav, tiras, path.join(DIR, 'hoja.png'));
  await nav.close();
  console.log(JSON.stringify({ html: path.relative(process.cwd(), HTML), casos: res, errores,
                               hoja: path.relative(process.cwd(), path.join(DIR, 'hoja.png')) }, null, 1));
})().catch((e) => { console.error('BANCO ROTO:', e); process.exit(1); });
