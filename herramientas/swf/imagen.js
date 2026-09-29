#!/usr/bin/env node
/* Cuentas con imagenes en el Chromium del contenedor (no hay PIL): medir la caja de lo opaco y
   componer capas sobre una base, exportando a webp o png.

     node herramientas/swf/imagen.js medir a.png b.webp ...
     node herramientas/swf/imagen.js componer trabajos.json
       [{ "base": "vacia.webp", "capas": [{ "img": "mascara.png", "x": 10, "y": 20, "w": 100, "h": 80 }],
          "salida": "x.webp", "calidad": 0.9 }]   (w/h opcionales: escalan la capa) */
'use strict';
const fs = require('fs'), path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const dataUrl = (f) => 'data:image/' + (path.extname(f).slice(1) === 'webp' ? 'webp' : 'png') + ';base64,' + fs.readFileSync(f).toString('base64');

(async () => {
  const [modo, ...args] = process.argv.slice(2);
  const nav = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const pg = await nav.newPage();
  await pg.setContent('<canvas id="c"></canvas>');
  if (modo === 'medir') {
    for (const f of args) {
      const r = await pg.evaluate(async (u) => {
        const im = new Image(); im.src = u; await im.decode();
        const c = document.getElementById('c'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++)
          if (d[(y * c.width + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        return { w: im.width, h: im.height, opaco: [x0, y0, x1, y1] };
      }, dataUrl(f));
      console.log(f, JSON.stringify(r));
    }
  } else if (modo === 'componer') {
    const trabajos = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    for (const t of trabajos) {
      const u = await pg.evaluate(async ({ base, capas, tipo, calidad }) => {
        const carga = async (s) => { const im = new Image(); im.src = s; await im.decode(); return im; };
        const b = await carga(base), c = document.getElementById('c');
        c.width = b.width; c.height = b.height;
        const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(b, 0, 0);
        for (const k of capas) { const im = await carga(k.img); g.drawImage(im, k.x, k.y, k.w || im.width, k.h || im.height); }
        return c.toDataURL(tipo, calidad);
      }, { base: dataUrl(t.base), capas: t.capas.map((k) => ({ ...k, img: dataUrl(k.img) })),
           tipo: t.salida.endsWith('.webp') ? 'image/webp' : 'image/png', calidad: t.calidad || 0.9 });
      fs.writeFileSync(t.salida, Buffer.from(u.split(',')[1], 'base64'));
      console.log(t.salida, fs.statSync(t.salida).size);
    }
  }
  await nav.close();
})().catch((e) => { console.error('IMAGEN ROTA:', e); process.exit(1); });
