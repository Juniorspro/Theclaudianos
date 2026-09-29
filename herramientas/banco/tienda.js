#!/usr/bin/env node
/* Banco de la TIENDA de Arena Nevada: abre la tienda con plata, recorre las pestañas de ropa,
   compra, pone y saca prendas, cierra, mira al jugador vestido de cerca y recarga la partida para
   ver que la ropa vuelve puesta.

     node herramientas/banco/tienda.js [html] [carpeta]      (crudo/banco/tienda)
   Deja fotos (giradas como el juego: la hoja las endereza) y un JSON con cada paso. */
'use strict';
const fs = require('fs'), path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const HTML = path.resolve(process.argv[2] || 'juegos-pc/ArenaNevada.html');
const DIR = path.resolve(process.argv[3] || 'crudo/banco/tienda');
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const nav = await pw.chromium.launch({ executablePath: CHROME, args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 412, height: 892 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  const errores = [], pasos = [], fotos = [];
  pg.on('pageerror', (e) => errores.push(String(e.message || e).slice(0, 300)));
  pg.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 300)); });
  const foto = async (n) => { const f = path.join(DIR, n + '.png'); await pg.screenshot({ path: f }); fotos.push([n, f]); };
  const estado = () => pg.evaluate(() => ({
    tipo: Game.jugador.tipo, dinero: Game.olas.dinero, ropa: JSON.parse(JSON.stringify(Progreso.ficha.ropa)),
    boton: (document.getElementById('tdComprar') || {}).textContent || null,
    baldosas: [...document.querySelectorAll('#tdLista .bald')].map((b) => b.dataset.id || '-').join(','),
    abierta: Tienda.abierta
  }));
  const paso = async (n, f) => { if (f) await pg.evaluate(f); await pg.waitForTimeout(400); const e = await estado(); pasos.push([n, e]); return e; };
  const toca = (sel) => `(() => { const b = document.querySelector('${sel}'); if (!b) throw new Error('no esta ${sel}'); b.click(); })()`;

  await pg.goto('file://' + HTML, { waitUntil: 'load', timeout: 120000 });
  await pg.waitForFunction('window.Game && Game.ren', null, { timeout: 60000 });
  await pg.evaluate(() => { try { localStorage.clear(); } catch (e) {} __ir('nueva'); });
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 1', null, { timeout: 120000, polling: 250 });

  // Tienda.paso la cierra si el jugador no esta en el mostrador de la armeria: aca se la deja abierta
  await paso('abrir con $10000', () => { Tienda.paso = () => {}; Game.olas.dinero = 10000; Tienda.abrir(); });
  await foto('1_tienda');
  await paso('pestaña MASCARAS', toca('[data-cat="4"]'));
  await foto('2_mascaras');
  await paso('elegir ATP Mask', toca('[data-id="agent2_mask"]'));
  await foto('3_atp_prueba');
  await paso('comprar ATP (pide ARMOR 1)', toca('#tdComprar'));
  await paso('elegir Agent Shades', toca('[data-id="agent1_mask"]'));
  await paso('comprar Agent Shades', toca('#tdComprar'));
  await foto('4_shades_puestas');
  await paso('pestaña ROPA', toca('[data-cat="6"]'));
  await paso('elegir traje Mk1', toca('[data-id="agent2"]'));
  await foto('5_mk1_prueba');
  await paso('comprar traje Mk1', toca('#tdComprar'));
  await foto('6_mk1_puesto');
  await paso('sacar traje Mk1', toca('#tdComprar'));
  await paso('poner traje Mk1', toca('#tdComprar'));
  await paso('cerrar', () => Tienda.cerrar());

  /* el jugador vestido, de cerca, con el render del juego */
  const cerca = await pg.evaluate(() => {
    const A = Game.jugador, r = Game.ren, c = r.domElement, cam = new THREE.PerspectiveCamera(26, c.width / c.height, 0.1, 60);
    const sal = [];
    for (const [dx, dz, y] of [[0, 3.2, 1.0], [2.0, 2.6, 1.3]]) {
      cam.position.set(A.x + dx, y, A.z + dz); cam.lookAt(A.x, 0.85, A.z);
      A.grupo.updateMatrixWorld(true); r.setRenderTarget(null); r.render(Game.escena, cam);
      sal.push(c.toDataURL('image/jpeg', 0.85));
    }
    return sal;
  });
  cerca.forEach((u, i) => { const f = path.join(DIR, `7_cerca_${i}.jpg`); fs.writeFileSync(f, Buffer.from(u.split(',')[1], 'base64')); });

  /* recargar y continuar: la ropa tiene que volver puesta */
  await pg.reload({ waitUntil: 'load' });
  await pg.waitForFunction('window.Game && Game.ren', null, { timeout: 60000 });
  await pg.evaluate(() => __ir('continuar'));
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 0.5', null, { timeout: 120000, polling: 250 });
  pasos.push(['recargar y continuar', await pg.evaluate(() => ({ tipo: Game.jugador.tipo, ropa: Progreso.ficha.ropa }))]);

  /* hoja: las fotos de pantalla, enderezadas */
  const celdas = fotos.map(([n, f]) => `<figure><div class="m"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"></div><figcaption>${n}</figcaption></figure>`).join('') +
    cerca.map((u, i) => `<figure><img class="c" src="${u}"><figcaption>jugador ${i ? '3/4' : 'perfil'}</figcaption></figure>`).join('');
  const hp = await nav.newPage({ viewport: { width: 1400, height: 400 } });
  await hp.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:13px monospace;display:flex;flex-wrap:wrap;gap:6px;padding:6px}
    figure{margin:0} .m{width:446px;height:206px;overflow:hidden;position:relative;background:#000}
    .m img{width:206px;height:446px;position:absolute;left:120px;top:-120px;transform:rotate(-90deg)} img.c{height:206px}</style>${celdas}`);
  await hp.screenshot({ path: path.join(DIR, 'hoja.png'), fullPage: true });
  await nav.close();
  console.log(JSON.stringify({ pasos, errores, hoja: path.relative(process.cwd(), path.join(DIR, 'hoja.png')) }, null, 1));
})().catch((e) => { console.error('BANCO ROTO:', e); process.exit(1); });
