// dibuja al ninja en todas sus poses y a cada enemigo en cada estado, sobre tres paletas, ampliado ×6
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, deviceScaleFactor:1})).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(1500);
  const url = await p.evaluate(() => { const {lienzo, mezcla, dibujarNinja, dibujarEnemigo} = __S.arte, EFECTOS = __S.EFECTOS; const S = 6, efs = ['atardecer', 'noche', 'fuego', 'tinta'], cw = 300, ch = 58;
    const [c, g] = lienzo(cw, ch*efs.length);
    efs.forEach((k, fi) => { const E = EFECTOS[k], y0 = fi*ch;
      for(let i = 0; i < ch; i++){ g.fillStyle = mezcla(E.cielo, i/ch); g.fillRect(0, y0 + i, cw, 1); }
      g.fillStyle = E.torre; g.fillRect(0, y0 + 40, cw, 18); g.fillStyle = E.luzBorde; g.fillRect(0, y0 + 40, cw, 1);
      g.fillStyle = E.torre; g.fillRect(150, y0, 12, 40);
      const buf = (x, y) => [0, 1, 2, 3, 4, 5].map(i => ({x:x - 1 - i*2, y:y - 3 + Math.sin(i)*0.8}));
      const t = 1.3; let x = 10;
      for(const pose of ['pie', 'apunta', 'salto', 'bola']){ dibujarNinja(g, x, y0 + 36, pose, 1, 0, E, {bufanda:buf(x, y0 + 36), colBuf:'#e8384a'}); x += 16; }
      dibujarNinja(g, x, y0 + 30, 'salto', 1, 0.6, E, {bufanda:buf(x, y0 + 30), colBuf:'#e8384a'}); x += 14;
      dibujarNinja(g, 146, y0 + 26, 'pared', -1, 0, E, {bufanda:buf(146, y0 + 26), colBuf:'#e8384a'});
      dibujarNinja(g, 128, y0 + 36, 'pie', 1, 0, E, {bufanda:buf(128, y0 + 36), colBuf:'#5ae0ff', accesorio:'sombrero'});
      x = 172;
      const en = [{t:'tirador', carga:0}, {t:'tirador', carga:0.5, apunta:-0.4}, {t:'samurai'}, {t:'samurai', carga:0.2}, {t:'samurai', corta:0.2}, {t:'shuriken'}, {t:'shuriken', carga:0.2}];
      for(const e of en){ dibujarEnemigo(g, Object.assign({x, y:y0 + 40, dir:1, fase:0}, e), E, t); x += 14; }
      dibujarEnemigo(g, {t:'cometa', x:x + 4, y:y0 + 30, dir:1, fase:0}, E, t); });
    const [c2, g2] = lienzo(cw*S, ch*efs.length*S); g2.drawImage(c, 0, 0, cw*S, ch*efs.length*S); return c2.toDataURL(); });
  require('fs').writeFileSync('/tmp/ui/sombra/' + (process.argv[2] || 'vitrina') + '.png', Buffer.from(url.split(',')[1], 'base64'));
  console.log(errs.length ? errs : 'sin errores'); await b.close(); })();
