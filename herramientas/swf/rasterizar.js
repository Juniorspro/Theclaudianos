#!/usr/bin/env node
/* Rasteriza SVGs (los de herramientas/swf/svg.py) con el Chromium del contenedor, con fondo
   transparente. Un trabajo por linea en el JSON de entrada:

     node herramientas/swf/rasterizar.js trabajos.json
     [{ "svg": "a.svg", "png": "a.png", "escala": 2, "caja": [x0, y0, x1, y1] }, ...]

   Sin 'caja', recorta a lo dibujado (getBBox). Imprime la caja usada de cada uno. */
'use strict';
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

(async () => {
  const trabajos = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const nav = await pw.chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
                                         args: ['--no-sandbox'] });
  const pg = await nav.newPage({ deviceScaleFactor: 1 });
  const salida = [];
  for (const t of trabajos) {
    const svg = fs.readFileSync(t.svg, 'utf8');
    await pg.setContent('<!doctype html><html><body style="margin:0;background:transparent">' + svg + '</body></html>');
    const caja = await pg.evaluate(({ caja, escala }) => {
      const s = document.querySelector('svg');
      let c = caja;
      if (!c) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        while (s.childNodes.length) { const n = s.firstChild; if (n.tagName === 'defs') { s.removeChild(n); s.__defs = n; continue; } g.appendChild(n); }
        if (s.__defs) s.appendChild(s.__defs);
        s.appendChild(g);
        s.setAttribute('viewBox', '-2000 -2000 4000 4000'); s.setAttribute('width', 4000); s.setAttribute('height', 4000);
        const b = g.getBBox();
        c = [Math.floor(b.x) - 1, Math.floor(b.y) - 1, Math.ceil(b.x + b.width) + 1, Math.ceil(b.y + b.height) + 1];
      }
      s.setAttribute('viewBox', `${c[0]} ${c[1]} ${c[2] - c[0]} ${c[3] - c[1]}`);
      s.setAttribute('width', Math.round((c[2] - c[0]) * escala)); s.setAttribute('height', Math.round((c[3] - c[1]) * escala));
      s.style.display = 'block';
      return c;
    }, { caja: t.caja || null, escala: t.escala || 1 });
    const w = Math.round((caja[2] - caja[0]) * (t.escala || 1)), h = Math.round((caja[3] - caja[1]) * (t.escala || 1));
    await pg.setViewportSize({ width: Math.max(1, w), height: Math.max(1, h) });
    await pg.locator('svg').screenshot({ path: t.png, omitBackground: true });
    salida.push({ png: t.png, caja, w, h });
  }
  await nav.close();
  console.log(JSON.stringify(salida));
})().catch((e) => { console.error('RASTER ROTO:', e); process.exit(1); });
