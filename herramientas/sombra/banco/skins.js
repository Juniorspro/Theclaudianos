// los siete ninjas de la tienda, uno al lado del otro, ampliados
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox']});
  const p = await (await b.newContext({viewport:{width:412, height:892}})).newPage(); await p.goto('file:///tmp/ui/sombra_b.html'); await p.waitForTimeout(1200);
  const url = await p.evaluate(() => { const {lienzo, mezcla, dibujarNinja} = __S.arte, E = __S.EFECTOS.atardecer, S = 8, cw = 150, ch = 30, [c, g] = lienzo(cw, ch);
    for(let i = 0; i < ch; i++){ g.fillStyle = mezcla(E.cielo, i/ch); g.fillRect(0, i, cw, 1); } g.fillStyle = E.torre; g.fillRect(0, 22, cw, 8); g.fillStyle = E.luzBorde; g.fillRect(0, 22, cw, 1);
    Object.values(__S.NINJAS).forEach((N, i) => { const x = 14 + i*20, y = 18; dibujarNinja(g, x, y, 'pie', 1, 0, E, {bufanda:[0, 1, 2, 3, 4, 5].map(k => ({x:x - 1 - k*2, y:y - 3 + Math.sin(k)*0.8})), colBuf:N.colBuf, accesorio:N.accesorio, colOjo:N.colOjo, colHoja:N.colHoja}); });
    const [c2, g2] = lienzo(cw*S, ch*S); g2.drawImage(c, 0, 0, cw*S, ch*S); return c2.toDataURL(); });
  require('fs').writeFileSync('/tmp/ui/sombra/skins.png', Buffer.from(url.split(',')[1], 'base64')); await b.close(); })();
