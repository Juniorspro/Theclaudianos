#!/usr/bin/env node
/* Banco de la ROPA de Arena Nevada: pone cada prenda en un grunt quieto y lo fotografia desde
   cuatro lados (frente, tres cuartos, perfil y espalda) con el render del juego, mas la vista de
   la camara de la arena. Sirve para mirar los modelos 3D contra la referencia del SWF.

     node herramientas/banco/prendas.js [ids|cat] [html] [carpeta]
       ids: lista separada por comas (hat1,shades1,...) o una categoria (hat, mask, mouth, shirt, traje)
       por defecto, toda la ropa modelada

   Deja una hoja por cada 8 prendas (hoja_N.png) y un JSON con los triangulos de cada una. */
'use strict';
const fs = require('fs'), path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const QUE = process.argv[2] || '';
const HTML = path.resolve(process.argv[3] || 'juegos-pc/ArenaNevada.html');
const DIR = path.resolve(process.argv[4] || 'crudo/banco/prendas');
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const nav = await pw.chromium.launch({ executablePath: CHROME, args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const pg = await nav.newPage({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 1 });
  const errores = [];
  pg.on('pageerror', (e) => errores.push(String(e.message || e).slice(0, 300)));
  pg.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 300)); });
  await pg.goto('file://' + HTML, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForFunction('window.Game && Game.ren && window.Prendas', null, { timeout: 60000 });
  await pg.evaluate(() => { try { localStorage.clear(); } catch (e) {} __ir('nueva'); });
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 0.5', null, { timeout: 120000, polling: 250 });

  const ids = await pg.evaluate((q) => {
    const todos = Object.keys(Prendas.CAT).filter((id) => Prendas.modelada(id));
    if (!q) return todos;
    if (['hat', 'mask', 'mouth', 'shirt', 'traje'].indexOf(q) >= 0) return todos.filter((id) => Prendas.CAT[id].cat === q);
    return q.split(',');
  }, QUE);

  const fotos = [], datos = {};
  for (const id of ids) {
    const r = await pg.evaluate((id) => {
      Game.pausa = true;
      const c = Prendas.CAT[id], at = {}; at[c.cat] = id;
      const tipo = Chars.vestido('grunt', at);
      const t0 = performance.now();
      const geo = Chars.geoDe(tipo);
      const ms = performance.now() - t0;
      const t = Actor.crear({ tipo: tipo, arma: 'puños', x: 0, z: 0, mirando: 1 });
      t.sinTope = true; t.guion = true;
      t.rumbo = t.rumboObj = Math.PI / 2;           // mirando a +z (la camara de frente)
      for (let i = 0; i < 40; i++) Actor.actualizar(t, 1 / 60, i / 60);
      const esc = new THREE.Scene(); esc.background = new THREE.Color(0x8a8a8a);
      esc.add(t.grupo);
      const ren = Game.ren, W = 300, H = 300;
      const rt = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true, colorSpace: THREE.SRGBColorSpace });
      const cabeza = c.cat !== 'shirt' && c.cat !== 'traje';
      const yM = cabeza ? ({ hat: 1.55, mask: 1.42, mouth: 1.25 }[c.cat] || 1.5) : 0.78, dist = cabeza ? 2.5 : 3.2, fov = 30;
      const vistas = [[0, 12], [40, 12], [90, 12], [150, 12], [70, 26]];
      const cvs = document.createElement('canvas'); cvs.width = W * vistas.length; cvs.height = H;
      const g2 = cvs.getContext('2d');
      vistas.forEach(([az, el], k) => {
        const a = az * Math.PI / 180, e = el * Math.PI / 180;
        const cam = new THREE.PerspectiveCamera(fov, 1, 0.05, 40);
        cam.position.set(Math.sin(a) * Math.cos(e) * dist, yM + Math.sin(e) * dist, Math.cos(a) * Math.cos(e) * dist);
        cam.lookAt(0, yM, 0);
        ren.setRenderTarget(rt); ren.setClearColor(0x8a8a8a, 1); ren.clear(true, true, false);
        ren.render(esc, cam);
        const buf = new Uint8Array(W * H * 4);
        ren.readRenderTargetPixels(rt, 0, 0, W, H, buf);
        const img = g2.createImageData(W, H);
        for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
        g2.putImageData(img, k * W, 0);
      });
      ren.setRenderTarget(null);
      rt.dispose();
      esc.remove(t.grupo);
      return { png: cvs.toDataURL('image/png'), tris: geo.tris, ms: Math.round(ms * 10) / 10, nombre: c.nombre };
    }, id);
    const f = path.join(DIR, id + '.png');
    fs.writeFileSync(f, Buffer.from(r.png.split(',')[1], 'base64'));
    fotos.push([id, r.nombre, f]);
    datos[id] = { tris: r.tris, ms: r.ms };
  }

  // hojas de a 8 prendas
  const hp = await nav.newPage({ viewport: { width: 1520, height: 400 } });
  const hojas = [];
  for (let i = 0; i < fotos.length; i += 8) {
    const filas = fotos.slice(i, i + 8).map(([id, n, f]) =>
      `<div class="f"><b>${id}<br><small>${n}</small></b><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"></div>`).join('');
    await hp.setContent(`<style>body{margin:0;background:#222;color:#ddd;font:13px monospace}.f{display:flex;align-items:center;gap:6px;padding:2px}
      b{width:110px;font-weight:400}img{height:240px}</style>${filas}`);
    const h = path.join(DIR, `hoja_${hojas.length + 1}.png`);
    await hp.screenshot({ path: h, fullPage: true });
    hojas.push(path.relative(process.cwd(), h));
  }
  await nav.close();
  console.log(JSON.stringify({ n: fotos.length, datos, errores, hojas }, null, 1));
})().catch((e) => { console.error('BANCO ROTO:', e); process.exit(1); });
