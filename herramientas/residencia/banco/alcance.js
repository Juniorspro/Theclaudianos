// ¿se llega caminando a todo? grilla de 0,15 m con el radio del jugador, las puertas abiertas y la escalera como puente
const {chromium} = require('/tmp/ui/node_modules/playwright');
(async () => { const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']});
  const p = await (await b.newContext({viewport:{width:412, height:892}, locale:'es-AR'})).newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message)); await p.goto('file:///tmp/ui/res/r.html'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const R = __R; R.nuevaPartida('normal'); document.getElementById('menu').innerHTML = '';
    /* todas las puertas abiertas (la colisión de la hoja sigue a la puerta) */
    for(const id in R.MUNDO.puertas){ const q = R.MUNDO.puertas[id]; q.meta = 1; q.llave = false; } R.paso(1/60, 120);
    const P = 0.15, X0 = -32, Z0 = -32, N = Math.round(64/P), libre = [new Uint8Array(N*N), new Uint8Array(N*N)], vis = [new Uint8Array(N*N), new Uint8Array(N*N)];
    const casa = (x, z) => x > -7.1 && x < 7.1 && z > -5.1 && z < 5.1;
    for(let pi = 0; pi < 2; pi++) for(let i = 0; i < N; i++) for(let j = 0; j < N; j++){ const x = X0 + i*P, z = Z0 + j*P; if(pi === 1 && !casa(x, z)) continue;
      const [rx, rz] = R.resolver(x, z, pi, 0.3); if(Math.hypot(rx - x, rz - z) < 0.01) libre[pi][i*N + j] = 1; }
    const celda = (x, z) => [Math.round((x - X0)/P), Math.round((z - Z0)/P)];
    /* la escalera: se camina por el medio, cada tramo con las colisiones del piso que le toca */
    let escOk = true; for(let z = -3.75; z <= 2.05; z += 0.05){ const y = z < -3.2 ? 0 : z > 1.6 ? 3.2 : (z + 3.2)/4.8*3.2, pi = y > 1.6 ? 1 : 0; const [rx, rz] = R.resolver(1.4, z, pi, 0.3); if(Math.hypot(rx - 1.4, rz - z) > 0.02){ escOk = false; break; } }
    const cola = []; const [si, sj] = celda(0.25, -15.2); cola.push([0, si, sj]); vis[0][si*N + sj] = 1;
    const [ai, aj] = celda(1.4, -3.75), [bi, bj] = celda(1.4, 2.05);
    while(cola.length){ const [pi, i, j] = cola.pop();
      for(let di = -1; di <= 1; di++) for(let dj = -1; dj <= 1; dj++){ const a = i + di, c = j + dj; if(a < 0 || c < 0 || a >= N || c >= N) continue; const k = a*N + c; if(!libre[pi][k] || vis[pi][k]) continue; vis[pi][k] = 1; cola.push([pi, a, c]); }
      if(escOk && pi === 0 && Math.abs(i - ai) <= 1 && Math.abs(j - aj) <= 1 && !vis[1][bi*N + bj]){ vis[1][bi*N + bj] = 1; cola.push([1, bi, bj]); }
      if(escOk && pi === 1 && Math.abs(i - bi) <= 1 && Math.abs(j - bj) <= 1 && !vis[0][ai*N + aj]){ vis[0][ai*N + aj] = 1; cola.push([0, ai, aj]); } }
    /* cada cosa: ¿hay una celda alcanzada a menos de 1,6 m desde la que se la elige? */
    const out = []; for(const o of R.MUNDO.interactivos){ const pi = o.piso !== undefined ? o.piso : (o.pos[1] > 3 ? 1 : 0); let mejor = 99;
      const [ci, cj] = celda(o.pos[0], o.pos[2]); for(let i = ci - 12; i <= ci + 12; i++) for(let j = cj - 12; j <= cj + 12; j++){ if(i < 0 || j < 0 || i >= N || j >= N || !vis[pi][i*N + j]) continue; const d = Math.hypot(X0 + i*P - o.pos[0], Z0 + j*P - o.pos[2]); if(d < mejor) mejor = d; }
      out.push([o.id, pi, +mejor.toFixed(2)]); }
    const lejos = out.filter(o => o[2] > Math.min(1.6, 1.9)); let n0 = 0, n1 = 0; for(let k = 0; k < N*N; k++){ n0 += vis[0][k]; n1 += vis[1][k]; }
    return {escOk, alcanzadas:[n0, n1], lejos, err:R.ERRORES.slice(0, 3)}; });
  console.log(JSON.stringify(r)); console.log(errs.slice(0, 3).join('\n') || 'sin errores de consola'); await b.close(); })();
