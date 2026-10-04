#!/usr/bin/env node
/* DETECTOR DE TRAZOS: cada prenda puesta en un grunt quieto, desde muchas vistas, y en cada vista se
   buscan los defectos de tinta que se ven a ojo, con numeros:
     suelta     tinta visible sin ningun contorno al lado: ni una superficie mas cerca a menos del
                ancho de la linea ni un salto de profundidad (rayitas, puntos, cascos que asoman)
     despegada  tinta junto a un contorno pero separada de el por algo que no es negro (la linea
                doble: una franja de tela entre el borde y la tinta)
     hueco      borde de la silueta contra el fondo sin tinta (silueta cortada)
     fino       rasgo de 1-2 px distinto de sus dos vecinos (grietas, astillas, puntitos)
   Se renderiza tres veces por vista: con tinta, sin tinta y la profundidad real (sin los
   adelantos del shader); la tinta es lo que oscurece la primera respecto de la segunda.

     node herramientas/banco/trazos.js ids cat carpeta [vistas] [y0] [D]
       ids: lista separada por comas; cat: hat | mask | mouth | shirt | traje. Cada vista se compara
       con el muñeco pelado: cuenta solo lo marcado cerca de la prenda que el pelado no marca ya
       vistas "az:el,..." (por defecto 12 azimuts x elevaciones -10, 15 y 45); y0 1.33, D 2.3
     S=900 (lado del render), FOV=30, SINMANOS=1 (sin manos), R=30 (radio en px para buscar el
     contorno de una tinta: tiene que ser MAYOR que el grosor aparente de la linea, ~16-20 px a D=2,3 y
     ~11 px a D=3,0; con R=14 la tinta gruesa de un sombrero salia 'suelta' sin serlo), UMBRAL=0.015
     (m: salto de profundidad que es contorno)
   Deja carpeta/<id>.json con cada defecto y carpeta/<id>.png con los recortes marcados en rojo. */
'use strict';
const fs = require('fs'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const [idsA, cat, dir, vistasA, y0A, dA] = process.argv.slice(2);
const ids = idsA.split(','), DIR = path.resolve(dir || 'crudo/banco/trazos');
const VISTAS = vistasA ? vistasA.split(',').map((s) => s.split(':').map(Number))
  : [].concat(...[-10, 15, 45].map((el) => Array.from({ length: 12 }, (_, i) => [i * 30, el])));
const Y0 = +(y0A || 1.33), D = +(dA || 2.3);
const S = +(process.env.S || 900), FOV = +(process.env.FOV || 30), SM = !!process.env.SINMANOS;
const R = +(process.env.R || 30), TAU = +(process.env.UMBRAL || 0.015);

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const nav = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const pg = await nav.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
  pg.on('pageerror', (e) => console.log('ERR', e.message));
  await pg.goto('file://' + path.resolve('juegos-pc/ArenaNevada.html'), { waitUntil: 'load' });
  await pg.waitForFunction('window.Game && Game.ren && window.Prendas');
  await pg.evaluate(() => { try { localStorage.clear(); } catch (e) {} __ir('nueva'); });
  await pg.waitForFunction('Game.enMarcha && Game.tiempo > 0.5', null, { polling: 250 });
  const r = await pg.evaluate(async ({ ids, cat, VISTAS, Y0, D, S, FOV, SM, R, TAU }) => {
    Game.pausa = true;
    const ren = Game.ren, N = S * S;
    // un grunt por prenda, y uno sin nada: lo que ya marca el muñeco pelado no es de la prenda
    const hacer = (id) => {
      const at = {}; if (id !== '-') at[cat] = id;
      const t = Actor.crear({ tipo: Chars.vestido('grunt', at), arma: 'puños', x: 0, z: 0, mirando: 1 });
      t.sinTope = true; t.guion = true; t.rumbo = t.rumboObj = Math.PI / 2;
      for (let i = 0; i < 40; i++) Actor.actualizar(t, 1 / 60, i / 60);
      if (SM && t.cuerpo && t.cuerpo.piel) { const bs = t.cuerpo.piel.skeleton.bones; for (const i of Chars.MANOS_I.concat(Chars.MANOS_D)) if (bs[i]) bs[i].scale.setScalar(1e-4); }
      const tintas = [], vidrios = [];
      t.grupo.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        if (o.material === Art.mats.contornoPiel || o.material.side === THREE.BackSide) tintas.push(o);
        else if (o.material.userData && o.material.userData.vidrio) vidrios.push(o);
      });
      return { id, t, tintas, vidrios };
    };
    const base = hacer('-'), figs = ids.filter((id) => id !== '-').map(hacer);
    // la misma pose que el pelado, hueso por hueso (la respiracion tiene fase propia por muñeco, y un
    // pixel de corrimiento marcaba la tinta de la cabeza entera)
    const bb = base.t.cuerpo.piel.skeleton.bones;
    for (const F of figs) {
      const fb = F.t.cuerpo.piel.skeleton.bones;
      F.t.grupo.position.copy(base.t.grupo.position); F.t.grupo.quaternion.copy(base.t.grupo.quaternion); F.t.grupo.scale.copy(base.t.grupo.scale);
      for (let i = 0; i < Math.min(bb.length, fb.length); i++) { fb[i].position.copy(bb[i].position); fb[i].quaternion.copy(bb[i].quaternion); fb[i].scale.copy(bb[i].scale); }
      F.t.grupo.updateMatrixWorld(true);
    }
    base.t.grupo.updateMatrixWorld(true);
    const esc = new THREE.Scene();
    const rtC = new THREE.WebGLRenderTarget(S, S, { depthBuffer: true, colorSpace: THREE.SRGBColorSpace });
    const rtD = new THREE.WebGLRenderTarget(S, S, { depthBuffer: true });
    const matD = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    const leer = (rt) => { const b = new Uint8Array(N * 4); ren.readRenderTargetPixels(rt, 0, 0, S, S, b); return b; };
    const cam = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
    const mpx = 2 * D * Math.tan(FOV * Math.PI / 360) / S;
    const lum = (b, i) => 0.299 * b[i * 4] + 0.587 * b[i * 4 + 1] + 0.114 * b[i * 4 + 2];
    const OFS = [];
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d2 = dx * dx + dy * dy; if (d2 > 0 && d2 <= R * R) OFS.push([dx, dy, d2]); }
    OFS.sort((a, b) => a[2] - b[2]);
    const NOM = [null, 'suelta', 'despegada', 'hueco', 'fino'];
    // las tres pasadas de una figura y sus marcas: 1 suelta, 2 despegada, 3 hueco, 4 fino
    function analizar(F) {
      esc.add(F.t.grupo);
      const pasada = (rt, fondo, conTinta, conVidrio, over) => {
        for (const o of F.tintas) o.visible = conTinta;
        for (const o of F.vidrios) o.visible = conVidrio;
        esc.overrideMaterial = over || null;
        ren.setRenderTarget(rt); ren.setClearColor(fondo, 1); ren.clear(true, true, false); ren.render(esc, cam);
        esc.overrideMaterial = null; for (const o of F.tintas) o.visible = true; for (const o of F.vidrios) o.visible = true;
        return leer(rt);
      };
      const cA = pasada(rtC, 0x8a8a8a, true, true), cB = pasada(rtC, 0x8a8a8a, false, true), cD = pasada(rtD, 0xffffff, false, true, matD);      // el vidrio cuenta en la profundidad: es parte de la figura (si no, sus bordes salian como 'hueco')
      ren.setRenderTarget(null); esc.remove(F.t.grupo);
      const LA = new Float32Array(N), LB = new Float32Array(N), Z = new Float32Array(N);
      const n = 0.05, f = 60;
      for (let i = 0; i < N; i++) {
        LA[i] = lum(cA, i); LB[i] = lum(cB, i);
        const d = (cD[i * 4] / 255) / (256 * 256 * 256) + (cD[i * 4 + 1] / 255) / (256 * 256) + (cD[i * 4 + 2] / 255) / 256 + cD[i * 4 + 3] / 255;
        Z[i] = d >= 0.99999 ? Infinity : 2 * n * f / (f + n - (2 * d - 1) * (f - n));
      }
      const oscuro = (i) => LA[i] < 45;
      const salto = new Uint8Array(N);
      for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
        const i = y * S + x, z = Z[i];
        for (const j of [i - 1, i + 1, i - S, i + S]) { const w = Z[j]; if (w !== z && (!isFinite(w) || !isFinite(z) || Math.abs(w - z) > TAU)) { salto[i] = 1; break; } }
      }
      const cerca = new Uint8Array(N);
      for (let y = 2; y < S - 2; y++) for (let x = 2; x < S - 2; x++) {
        let s = 0; for (let dy = -2; dy <= 2 && !s; dy++) for (let dx = -2; dx <= 2; dx++) if (salto[(y + dy) * S + x + dx]) { s = 1; break; }
        cerca[y * S + x] = s;
      }
      const marca = new Uint8Array(N);
      for (let y = R; y < S - R; y++) for (let x = R; x < S - R; x++) {
        const i = y * S + x;
        if (!(LA[i] < 45 && LB[i] > LA[i] + 30) || cerca[i]) continue;
        const z = Z[i];
        let q = null;
        for (const [dx, dy] of OFS) { const j = (y + dy) * S + x + dx; if (Z[j] < z - TAU) { q = [dx, dy]; break; } }
        if (!q) { marca[i] = 1; continue; }
        const L = Math.max(Math.abs(q[0]), Math.abs(q[1]));
        for (let k = 1; k < L; k++) {
          const j = (y + Math.round(q[1] * k / L)) * S + x + Math.round(q[0] * k / L);
          if (!oscuro(j)) { marca[i] = 2; break; }
        }
      }
      for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
        const i = y * S + x;
        if (isFinite(Z[i]) || oscuro(i)) continue;
        if (isFinite(Z[i - 1]) || isFinite(Z[i + 1]) || isFinite(Z[i - S]) || isFinite(Z[i + S])) marca[i] = 3;
      }
      for (let y = 2; y < S - 2; y++) for (let x = 2; x < S - 2; x++) {
        const i = y * S + x;
        if (marca[i] || !isFinite(Z[i])) continue;
        const v = LA[i];
        for (const d of [2, S * 2]) {
          const a = LA[i - d], b = LA[i + d];
          if (Math.abs(a - b) < 12 && Math.abs(v - a) > 40 && Math.abs(v - b) > 40) { marca[i] = 4; break; }
        }
      }
      const tinta = new Uint8Array(N);
      for (let i = 0; i < N; i++) tinta[i] = LA[i] < 45 && LB[i] > LA[i] + 30 ? 1 : 0;
      return { cA, LB, Z, marca, tinta };
    }
    const res = {}; for (const F of figs) res[F.id] = { vistas: [], recortes: [] };
    for (const [az, el] of VISTAS) {
      const A = az * Math.PI / 180, E = el * Math.PI / 180;
      cam.position.set(Math.sin(A) * Math.cos(E) * D, Y0 + Math.sin(E) * D, Math.cos(A) * Math.cos(E) * D); cam.lookAt(0, Y0, 0);
      cam.updateMatrixWorld(true);
      const b0 = analizar(base);
      for (const F of figs) {
        const a = analizar(F), marca = a.marca;
        // solo cuenta lo que esta cerca de la prenda (donde la figura cambia respecto del muñeco pelado)
        // y lo que el muñeco pelado no marca ya a 1 px
        const cambia = new Uint8Array(N);
        for (let i = 0; i < N; i++) if (Math.abs(a.LB[i] - b0.LB[i]) > 6 || (a.Z[i] !== b0.Z[i] && !(Math.abs(a.Z[i] - b0.Z[i]) < 0.001))) cambia[i] = 1;
        const zona = new Uint8Array(N);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          if (!cambia[y * S + x]) continue;
          for (let dy = -R; dy <= R; dy += 2) for (let dx = -R; dx <= R; dx += 2) { const X = x + dx, Yv = y + dy; if (X >= 0 && Yv >= 0 && X < S && Yv < S) zona[Yv * S + X] = 1; }
        }
        for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
          const i = y * S + x;
          if (!marca[i]) continue;
          if (!zona[i]) { marca[i] = 0; continue; }
          // lo que el pelado ya marca, o tinta que el pelado ya tiene ahi (la de la cabeza, que va adelantada
          // por encima de todo: no es de la prenda)
          let ya = false;
          for (let dy = -1; dy <= 1 && !ya; dy++) for (let dx = -1; dx <= 1; dx++) {
            const j = i + dy * S + dx;
            if (b0.marca[j] === marca[i] || (marca[i] <= 2 && b0.tinta[j])) { ya = true; break; }
          }
          if (ya) marca[i] = 0;
        }
        const vis = new Uint8Array(N), grupos = [];
        for (let i = 0; i < N; i++) {
          if (!marca[i] || vis[i]) continue;
          const tipo = marca[i], pila = [i]; vis[i] = 1; let n2 = 0, x0 = S, y0 = S, x1 = 0, y1 = 0;
          while (pila.length) {
            const k = pila.pop(); n2++; const kx = k % S, ky = (k / S) | 0;
            if (kx < x0) x0 = kx; if (kx > x1) x1 = kx; if (ky < y0) y0 = ky; if (ky > y1) y1 = ky;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const j = k + dy * S + dx;
              if (j >= 0 && j < N && !vis[j] && marca[j] === tipo) { vis[j] = 1; pila.push(j); }
            }
          }
          grupos.push({ tipo, n: n2, x0, y0: S - 1 - y1, x1, y1: S - 1 - y0 });
        }
        // un grupo de 1-2 px es ruido de rasterizado
        const serios = grupos.filter((g) => g.n >= (g.tipo >= 3 ? 3 : 2));
        const cuenta = { suelta: 0, despegada: 0, hueco: 0, fino: 0 };
        for (const g of serios) cuenta[NOM[g.tipo]] += g.n;
        res[F.id].vistas.push({ az, el, ...cuenta, grupos: serios.length });
        serios.sort((p, q) => q.n - p.n);
        for (const g of serios.slice(0, 3)) {
          const cx = (g.x0 + g.x1) >> 1, cy = (g.y0 + g.y1) >> 1, H = 60, cA = a.cA;
          const c = document.createElement('canvas'); c.width = c.height = 2 * H; const gx = c.getContext('2d'), im = gx.createImageData(2 * H, 2 * H);
          for (let yy = 0; yy < 2 * H; yy++) for (let xx = 0; xx < 2 * H; xx++) {
            const X = cx - H + xx, Yv = cy - H + yy; if (X < 0 || Yv < 0 || X >= S || Yv >= S) continue;
            const i = (S - 1 - Yv) * S + X, o = (yy * 2 * H + xx) * 4, m = marca[i] === g.tipo;
            im.data[o] = m ? 255 : cA[i * 4]; im.data[o + 1] = m ? 0 : cA[i * 4 + 1]; im.data[o + 2] = m ? 0 : cA[i * 4 + 2]; im.data[o + 3] = 255;
          }
          gx.putImageData(im, 0, 0);
          res[F.id].recortes.push({ et: az + '/' + el + ' ' + NOM[g.tipo] + ' ' + g.n, url: c.toDataURL('image/png') });
        }
      }
    }
    rtC.dispose(); rtD.dispose(); matD.dispose();
    return { res, mpx };
  }, { ids, cat, VISTAS, Y0, D, S, FOV, SM, R, TAU });
  for (const id of Object.keys(r.res)) {
    const q = r.res[id], tot = { suelta: 0, despegada: 0, hueco: 0, fino: 0 };
    for (const v of q.vistas) for (const k in tot) tot[k] += v[k];
    fs.writeFileSync(path.join(DIR, id + '.json'), JSON.stringify({ id, mm_por_px: +(r.mpx * 1000).toFixed(2), total: tot, vistas: q.vistas }, null, 1));
    if (q.recortes.length) {
      const hp = await nav.newPage({ viewport: { width: 1500, height: 400 } });
      await hp.setContent('<style>body{margin:0;background:#111;color:#ff0;font:12px monospace;display:flex;flex-wrap:wrap;gap:4px;padding:4px}' +
        'figure{margin:0}img{width:240px;height:240px;image-rendering:pixelated;display:block}</style>' +
        q.recortes.slice(0, 60).map((c) => `<figure><img src="${c.url}"><figcaption>${c.et}</figcaption></figure>`).join(''));
      await hp.screenshot({ path: path.join(DIR, id + '.png'), fullPage: true }); await hp.close();
    }
    console.log(id, JSON.stringify(tot));
  }
  await nav.close();
})().catch((e) => { console.error('BANCO ROTO:', e); process.exit(1); });
