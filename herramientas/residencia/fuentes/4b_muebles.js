/* ================================================================ los muebles, cuarto por cuarto
   Cada mueble se arma en su espacio propio (el frente mira a +z, el centro en 0,0, y desde el piso) y se gira de a
   cuartos de vuelta: rot 0 mira a +z, 1 a +x, 2 a −z, 3 a −x. Todo va fundido por material (cajas y cilindros), con
   su colisión y su sombra difusa en el piso. Regla del orden: nada alto delante de una ventana, nada en el barrido de
   una puerta, y el lugar donde se para el jugador para clavar tablas queda libre (lo mide banco/orden.js). */
const TELE_POS = {x:-4.5, y:0.97, z:-0.38, pantalla:-0.561};
/* un cilindro fundido (patas redondas, platos, perillas); eje vertical salvo que se pida girarlo */
function cil(mat, x, y, z, rt, h, col, o){ o = o || {}; const g = new THREE.CylinderGeometry(rt, o.rb !== undefined ? o.rb : rt, h, o.seg || 10), m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0)), new THREE.Vector3(1, 1, 1)); agregar(mat, g, m, col, o); g.dispose(); }
/* girar las partes de un mueble de a cuartos de vuelta alrededor de su centro */
function rotarPartes(partes, rot){ rot = ((rot % 4) + 4) % 4; if(!rot) return partes;
  return partes.map(p => { const [mat, px, py, pz, pw, ph, pd, col, o0] = p, o = Object.assign({}, o0 || {});
    let x = px, z = pz, w = pw, d = pd;
    if(rot === 1){ x = pz; z = -px; w = pd; d = pw; } else if(rot === 2){ x = -px; z = -pz; } else { x = -pz; z = px; w = pd; d = pw; }
    if(o.cil){ o.ry = (o.ry || 0) + rot*Math.PI/2; if(rot % 2 && (o.rx || o.rz)){ const a = o.rx || 0, b = o.rz || 0; o.rx = rot === 1 ? b : -b; o.rz = rot === 1 ? -a : a; } }
    else if(rot % 2 && (o.rx || o.rz)){ const a = o.rx || 0, b = o.rz || 0; o.rx = rot === 1 ? -b : b; o.rz = rot === 1 ? a : -a; }
    return [mat, x, py, z, w, ph, d, col, o]; }); }
/* un mueble girado: w y d son del mueble en su espacio propio */
function mueblR(piso, x, z, rot, w, d, partes, sinCol){ const r = ((rot % 4) + 4) % 4; mueble(piso, x, z, r % 2 ? d : w, r % 2 ? w : d, rotarPartes(partes, r), sinCol); }

/* ---------------------------------------------------------------- recetas de muebles (espacio propio) */
const MAD = 0x6a3a1c, MAD2 = 0x8a5a2a, MAD3 = 0xa8743e, OSC = 0x3e2410, BLANCO = 0xeeeae2;
function pSillon(w, col){ const d = 0.9, n = w > 1.6 ? 3 : w > 1.1 ? 2 : 1, cw = (w - 0.36)/n, P = [];
  P.push(['tela', 0, 0.24, 0, w, 0.3, d, tono16(col, 0.82)]);
  for(const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(['madera', sx*(w/2 - 0.08), 0.045, sz*(d/2 - 0.08), 0.07, 0.09, 0.07, OSC]);
  for(let i = 0; i < n; i++){ const x = -w/2 + 0.18 + cw*(i + 0.5); P.push(['tela', x, 0.46, 0.08, cw - 0.025, 0.15, d - 0.26, col]); P.push(['tela', x, 0.73, -d/2 + 0.26, cw - 0.03, 0.4, 0.16, col, {rx:-0.12}]); }
  P.push(['tela', 0, 0.66, -d/2 + 0.11, w - 0.02, 0.62, 0.22, tono16(col, 0.88)]);
  for(const s of [-1, 1]) P.push(['tela', s*(w/2 - 0.09), 0.4, 0.02, 0.18, 0.5, d - 0.02, tono16(col, 0.9)], ['tela', s*(w/2 - 0.09), 0.66, 0.02, 0.2, 0.06, d, tono16(col, 0.95)]);
  return P; }
function pMesaRatona(){ const P = [['madera', 0, 0.42, 0, 1.1, 0.05, 0.6, MAD2], ['madera', 0, 0.13, 0, 1.0, 0.03, 0.5, MAD]];
  for(const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(['madera', sx*0.5, 0.2, sz*0.25, 0.05, 0.4, 0.05, MAD]);
  P.push(['plastico', -0.25, 0.46, 0.05, 0.26, 0.04, 0.19, 0x8a2020], ['plastico', -0.24, 0.49, 0.06, 0.24, 0.02, 0.17, 0x2a4a8a], ['plastico', 0.2, 0.455, -0.08, 0.05, 0.02, 0.16, 0x151515]);
  P.push(['plastico', 0.32, 0.485, 0.1, 0.07, 0.08, 0.07, BLANCO]); return P; }
function pMuebleTV(w){ const h = 0.58, d = 0.48, P = [['madera', 0, h/2 + 0.03, 0, w, h - 0.06, d, MAD], ['madera', 0, h - 0.015, 0, w + 0.02, 0.03, d + 0.02, OSC], ['madera', 0, 0.015, 0, w - 0.06, 0.03, d - 0.06, OSC]];
  for(const s of [-1, 1]){ P.push(['madera', s*w/4, h/2, d/2 + 0.006, w/2 - 0.06, h - 0.18, 0.012, MAD2], ['metal', s*0.08, h/2, d/2 + 0.02, 0.02, 0.1, 0.02, 0xd0b060]); }
  P.push(['plastico', 0.45*w/2, h - 0.1, d/2 - 0.1, 0.36, 0.08, 0.02, 0x111111]); return P; }
/* biblioteca con libros de colores */
function pBiblio(w, h, seed){ const d = 0.32, P = [['madera', -w/2 + 0.015, h/2, 0, 0.03, h, d, MAD], ['madera', w/2 - 0.015, h/2, 0, 0.03, h, d, MAD], ['madera', 0, h - 0.015, 0, w, 0.03, d, MAD], ['madera', 0, 0.04, 0, w, 0.08, d, MAD], ['madera', 0, h/2, -d/2 + 0.01, w - 0.04, h, 0.02, OSC]];
  const r = mulberry(seed), col = [0x8a2020, 0x2a4a8a, 0x2a6a3a, 0xc8a040, 0x5a2a6a, 0xd8d0c0, 0x1a1a1a, 0xa04a1a], nb = 4;
  for(let i = 1; i < nb; i++) P.push(['madera', 0, 0.08 + (h - 0.1)*i/nb, 0, w - 0.05, 0.025, d - 0.02, MAD]);
  for(let i = 0; i < nb; i++){ const y0 = 0.08 + (h - 0.1)*i/nb + 0.013; let x = -w/2 + 0.04;
    while(x < w/2 - 0.1){ const bw = 0.025 + r()*0.04, bh = 0.16 + r()*0.12; if(r() < 0.12){ x += 0.06; continue; }
      P.push(['plastico', x + bw/2, y0 + bh/2, 0.02, bw - 0.004, bh, d - 0.1, col[Math.floor(r()*col.length)]]); x += bw; } }
  return P; }
function pLampara(){ return [['metal', 0, 0.015, 0, 0.3, 0.03, 0.3, 0x2a2a2e], ['metal', 0, 0.78, 0, 0.03, 1.5, 0.03, 0x3a3a3e], ['tela', 0, 1.62, 0, 0.4, 0.3, 0.4, 0xe8dcc0], ['tela', 0, 1.78, 0, 0.3, 0.02, 0.3, 0xd8ccb0]]; }
function pMesita(h, col){ const P = [['madera', 0, h - 0.02, 0, 0.5, 0.04, 0.42, col || MAD2], ['madera', 0, h - 0.13, 0.0, 0.44, 0.16, 0.38, col || MAD2], ['madera', 0, h - 0.13, 0.195, 0.4, 0.12, 0.012, tono16(col || MAD2, 0.85)], ['metal', 0, h - 0.13, 0.21, 0.06, 0.02, 0.02, 0xd0b060]];
  for(const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(['madera', sx*0.22, (h - 0.2)/2, sz*0.17, 0.04, h - 0.2, 0.04, col || MAD2]); return P; }
function pSilla(col){ const P = [['madera', 0, 0.46, 0, 0.44, 0.05, 0.44, col], ['madera', 0, 0.76, -0.2, 0.42, 0.06, 0.04, col], ['madera', 0, 0.62, -0.2, 0.34, 0.03, 0.03, col], ['tela', 0, 0.5, 0.01, 0.38, 0.03, 0.38, 0x8a2a2a]];
  for(const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(['madera', sx*0.19, 0.22, sz*0.19, 0.04, 0.44, 0.04, col]);
  for(const s of [-1, 1]) P.push(['madera', s*0.19, 0.64, -0.2, 0.04, 0.36, 0.04, col]); return P; }
function pMesa(w, d, h, col){ const P = [['madera', 0, h - 0.025, 0, w, 0.05, d, col], ['madera', 0, h - 0.09, 0, w - 0.16, 0.08, d - 0.16, tono16(col, 0.85)]];
  for(const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(['madera', sx*(w/2 - 0.08), (h - 0.05)/2, sz*(d/2 - 0.08), 0.06, h - 0.05, 0.06, tono16(col, 0.8)]); return P; }
/* bajo mesada de cocina: frente de puertas con manijas, mesada de granito y zócalo hundido */
function pBajoMesada(w, conCajon){ const d = 0.62, h = 0.9, P = [['plastico', 0, h/2 + 0.05, -0.02, w, h - 0.1, d - 0.04, 0xe6e2d6], ['plastico', 0, 0.05, -0.06, w, 0.1, d - 0.12, 0x2a2a2a], ['plastico', 0, h + 0.02, 0, w + 0.02, 0.04, d + 0.02, 0x3c3c42]];
  const n = Math.max(1, Math.round(w/0.5)), pw = w/n;
  for(let i = 0; i < n; i++){ const x = -w/2 + pw*(i + 0.5);
    if(conCajon){ P.push(['plastico', x, h - 0.1, d/2 - 0.015, pw - 0.03, 0.14, 0.02, 0xf0ece2], ['metal', x, h - 0.1, d/2 + 0.004, 0.16, 0.018, 0.02, 0x9a9aa0]); }
    P.push(['plastico', x, conCajon ? 0.43 : 0.5, d/2 - 0.015, pw - 0.03, conCajon ? 0.56 : 0.72, 0.02, 0xf0ece2], ['metal', x + pw*0.3, conCajon ? 0.6 : 0.7, d/2 + 0.004, 0.018, 0.14, 0.02, 0x9a9aa0]); }
  return P; }
function pAlacena(w){ const d = 0.34, h = 0.7, P = [['plastico', 0, h/2, 0, w, h, d, 0xe6e2d6]], n = Math.max(1, Math.round(w/0.5)), pw = w/n;
  for(let i = 0; i < n; i++){ const x = -w/2 + pw*(i + 0.5); P.push(['plastico', x, h/2, d/2 + 0.008, pw - 0.03, h - 0.04, 0.016, 0xf0ece2], ['metal', x - pw*0.3, 0.08, d/2 + 0.022, 0.018, 0.12, 0.018, 0x9a9aa0]); }
  return P; }
function pCocinaGas(){ const w = 0.7, d = 0.62, P = [['metal', 0, 0.46, -0.01, w, 0.88, d - 0.02, 0xe8e8ea], ['metal', 0, 0.91, 0, w, 0.03, d, 0x2a2a2e], ['metal', 0, 0.42, d/2, w - 0.08, 0.5, 0.02, 0xdcdce0], ['plastico', 0, 0.44, d/2 + 0.012, w - 0.22, 0.28, 0.01, 0x14161a],
    ['metal', 0, 0.72, d/2 + 0.02, w - 0.14, 0.03, 0.03, 0x9a9aa0], ['metal', 0, 1.02, -d/2 + 0.05, w, 0.2, 0.04, 0xe8e8ea]];
  for(const [sx, sz, r] of [[-1, -1, 0.09], [1, -1, 0.07], [-1, 1, 0.07], [1, 1, 0.09]]) P.push(['metal', sx*0.16, 0.935, sz*0.14, r*2, 0.02, r*2, 0x111114], ['metal', sx*0.16, 0.95, sz*0.14, r*1.2, 0.012, 0.03, 0x3a3a3e]);
  for(let i = 0; i < 4; i++) P.push(['plastico', -0.24 + i*0.16, 0.8, d/2 + 0.025, 0.05, 0.05, 0.03, 0x1a1a1a]);
  return P; }
function pHeladera(){ const w = 0.8, d = 0.78, h = 1.9, P = [['plastico', 0, h/2, 0, w, h, d, 0xf2f2f4], ['plastico', 0, 1.32, d/2 + 0.002, w - 0.02, 0.012, 0.01, 0xb8b8bc],
    ['metal', w/2 - 0.1, 1.58, d/2 + 0.035, 0.035, 0.36, 0.035, 0xa0a0a6], ['metal', w/2 - 0.1, 0.92, d/2 + 0.035, 0.035, 0.5, 0.035, 0xa0a0a6], ['plastico', 0, 0.03, d/2 - 0.02, w - 0.06, 0.06, 0.02, 0x2a2a2a],
    ['plastico', -0.18, 1.12, d/2 + 0.006, 0.12, 0.16, 0.004, 0xf0e8a0], ['plastico', 0.05, 1.18, d/2 + 0.006, 0.08, 0.08, 0.006, 0xd83030]];
  return P; }
function pCama(w, L, col, alto){ const P = [['madera', 0, 0.2, 0, w, 0.22, L, MAD], ['plastico', 0, 0.4, 0.02, w - 0.06, 0.2, L - 0.1, 0xf4f0e8],
    ['tela', 0, 0.515, L*0.14, w + 0.02, 0.05, L*0.7, col], ['tela', -w/2 - 0.005, 0.38, L*0.14, 0.02, 0.26, L*0.7, tono16(col, 0.9)], ['tela', w/2 + 0.005, 0.38, L*0.14, 0.02, 0.26, L*0.7, tono16(col, 0.9)], ['tela', 0, 0.52, -L*0.21, w - 0.08, 0.03, 0.16, 0xf4f0e8]];
  const np = w > 1.1 ? 2 : 1; for(let i = 0; i < np; i++) P.push(['tela', np > 1 ? (i ? 1 : -1)*w/4 : 0, 0.56, -L/2 + 0.26, np > 1 ? w/2 - 0.1 : w - 0.2, 0.12, 0.3, 0xffffff]);
  P.push(['madera', 0, (alto || 1.0)/2 + 0.02, -L/2 + 0.04, w + 0.06, alto || 1.0, 0.08, OSC], ['madera', 0, (alto || 1.0)*0.62, -L/2 + 0.085, w - 0.1, (alto || 1.0)*0.5, 0.02, MAD2]);
  P.push(['madera', 0, 0.32, L/2 - 0.03, w + 0.06, 0.5, 0.06, OSC]);
  for(const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.push(['madera', sx*(w/2 - 0.02), 0.05, sz*(L/2 - 0.05), 0.08, 0.1, 0.08, OSC]);
  return P; }
function pVelador(){ return [['metal', 0, 0.015, 0, 0.16, 0.03, 0.16, 0x8a7a50], ['metal', 0, 0.16, 0, 0.03, 0.26, 0.03, 0x8a7a50], ['tela', 0, 0.36, 0, 0.26, 0.2, 0.26, 0xefe2c2]]; }
function pComoda(w){ const d = 0.5, h = 0.92, P = [['madera', 0, h/2, 0, w, h, d, MAD], ['madera', 0, h + 0.015, 0, w + 0.04, 0.03, d + 0.03, OSC]];
  for(let i = 0; i < 3; i++){ const y = 0.17 + i*0.26; P.push(['madera', 0, y, d/2 + 0.006, w - 0.08, 0.22, 0.014, MAD2]); for(const s of [-1, 1]) P.push(['metal', s*w*0.25, y, d/2 + 0.02, 0.07, 0.02, 0.02, 0xd0b060]); }
  return P; }
/* el baño */
function pInodoro(){ return [['plastico', 0, 0.2, 0.04, 0.36, 0.4, 0.46, 0xf6f6f6], ['plastico', 0, 0.42, 0.06, 0.42, 0.05, 0.5, 0xffffff], ['plastico', 0, 0.62, -0.2, 0.42, 0.42, 0.18, 0xf4f4f4], ['plastico', 0, 0.84, -0.2, 0.44, 0.03, 0.2, 0xffffff], ['metal', 0.14, 0.78, -0.1, 0.05, 0.02, 0.03, 0xb0b0b8]]; }
function pLavatorio(){ return [['plastico', 0, 0.36, -0.12, 0.16, 0.72, 0.16, 0xf6f6f6], ['plastico', 0, 0.8, 0, 0.56, 0.16, 0.44, 0xffffff], ['plastico', 0, 0.87, 0.02, 0.44, 0.02, 0.3, 0xd8dde2],
  ['metal', 0, 0.95, -0.16, 0.04, 0.14, 0.04, 0xb8b8c0], ['metal', 0, 1.01, -0.1, 0.04, 0.03, 0.14, 0xb8b8c0], ['metal', -0.1, 0.92, -0.17, 0.05, 0.04, 0.04, 0xb8b8c0], ['metal', 0.1, 0.92, -0.17, 0.05, 0.04, 0.04, 0xb8b8c0]]; }
function pBanera(L){ const w = 0.78, P = [['plastico', 0, 0.28, 0, L, 0.56, w, 0xf6f6f6], ['plastico', 0, 0.565, 0, L - 0.14, 0.012, w - 0.16, 0xb8c8d0], ['plastico', 0, 0.58, 0, L, 0.04, w, 0xffffff],
  ['metal', -L/2 + 0.08, 0.7, 0, 0.04, 0.2, 0.04, 0xb8b8c0], ['metal', -L/2 + 0.14, 0.78, 0, 0.12, 0.04, 0.04, 0xb8b8c0], ['metal', 0, 2.05, w/2 - 0.02, L, 0.025, 0.025, 0xb8b8c0]];
  for(let i = 0; i < 5; i++) P.push(['tela', L/2 - 0.1 - i*0.08, 1.4, w/2 - 0.02, 0.07, 1.3, 0.02 + (i % 2)*0.02, i % 2 ? 0x6a9ab8 : 0x7aaac8]);
  return P; }
function pLavarropas(){ return [['plastico', 0, 0.43, 0, 0.6, 0.86, 0.6, 0xf2f2f2], ['plastico', 0, 0.8, 0.301, 0.58, 0.1, 0.01, 0xd8d8dc], ['plastico', -0.18, 0.8, 0.31, 0.06, 0.05, 0.02, 0x3a3a3e], ['plastico', 0.18, 0.8, 0.31, 0.12, 0.04, 0.012, 0x40a0d0]]; }
/* un mueble viejo tapado con una sábana (el depósito): la sábana cae hasta el piso con pliegues */
function pTapado(w, h, d, seed){ const r = mulberry(seed), P = [['tela', 0, h/2, 0, w, h, d, 0xe4e0d6], ['tela', 0, h + 0.02, 0, w - 0.1, 0.05, d - 0.1, 0xeeeae2]];
  for(let i = 0; i < 6; i++){ const s = i % 2 ? 1 : -1, t = (r() - 0.5)*0.8; P.push(['tela', (i < 3 ? t*w : s*(w/2 + 0.01)), h*0.45, (i < 3 ? s*(d/2 + 0.01) : t*d), i < 3 ? 0.08 : 0.03, h*0.9, i < 3 ? 0.03 : 0.08, 0xd8d4ca]); }
  return P; }

/* ---------------------------------------------------------------- cuadros: un atlas con cuatro pinturas y una malla sola */
const CUADROS = [];
function pintarCuadros(){ const W = 512, H = 256, [c, g] = lienzo(W, H);
  /* 0: el campo al atardecer */ let gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#e8a060'); gr.addColorStop(1, '#f4d8a0'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#e86030'; g.beginPath(); g.arc(90, 70, 14, 0, 7); g.fill(); g.fillStyle = '#4a7a3a'; g.beginPath(); g.moveTo(0, 100); g.quadraticCurveTo(50, 70, 128, 95); g.lineTo(128, 128); g.lineTo(0, 128); g.fill();
  g.fillStyle = '#2a4a22'; g.fillRect(28, 72, 6, 30); g.beginPath(); g.arc(31, 66, 14, 0, 7); g.fill();
  /* 1: la familia, con las caras tachadas */ g.fillStyle = '#6a5a4a'; g.fillRect(128, 0, 128, 128); g.fillStyle = '#8a7a64'; g.fillRect(132, 4, 120, 120);
  for(const [x, h, col] of [[152, 60, '#3a3a6a'], [180, 70, '#6a2a2a'], [208, 44, '#2a5a3a'], [230, 40, '#8a6a2a']]){ g.fillStyle = col; g.fillRect(x - 10, 124 - h, 20, h); g.fillStyle = '#e8c8a0'; g.beginPath(); g.arc(x, 118 - h, 9, 0, 7); g.fill();
    g.strokeStyle = '#1a0a0a'; g.lineWidth = 3; g.beginPath(); for(let k = 0; k < 4; k++){ g.moveTo(x - 9, 112 - h + k*3); g.lineTo(x + 9, 110 - h + k*4); } g.stroke(); }
  /* 2: un florero */ g.fillStyle = '#2a3a4a'; g.fillRect(256, 0, 128, 128); g.fillStyle = '#c8b890'; g.beginPath(); g.moveTo(305, 124); g.lineTo(300, 90); g.lineTo(335, 90); g.lineTo(330, 124); g.fill();
  for(const [x, y, col] of [[300, 60, '#d83040'], [320, 48, '#f0c040'], [340, 62, '#e05080'], [312, 72, '#f08030'], [332, 76, '#d83040']]){ g.strokeStyle = '#3a6a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(318, 90); g.lineTo(x, y); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); }
  /* 3: el mar con un barco */ gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#6aa0d8'); gr.addColorStop(1, '#c8e0f0'); g.fillStyle = gr; g.fillRect(384, 0, 128, 70);
  g.fillStyle = '#2a5a8a'; g.fillRect(384, 70, 128, 58); g.fillStyle = '#5a3a1a'; g.beginPath(); g.moveTo(420, 78); g.lineTo(470, 78); g.lineTo(462, 88); g.lineTo(428, 88); g.fill(); g.fillStyle = '#f4f0e0'; g.beginPath(); g.moveTo(445, 30); g.lineTo(445, 76); g.lineTo(470, 76); g.fill();
  /* la segunda fila: un retrato viejo y un paisaje de noche */ g.fillStyle = '#3a2a1a'; g.fillRect(0, 128, 128, 128); g.fillStyle = '#d8b890'; g.beginPath(); g.ellipse(64, 180, 26, 34, 0, 0, 7); g.fill(); g.fillStyle = '#2a1a0a'; g.fillRect(34, 214, 60, 42);
  g.fillStyle = '#1a1010'; g.beginPath(); g.arc(54, 176, 4, 0, 7); g.arc(74, 176, 4, 0, 7); g.fill();
  gr = g.createLinearGradient(0, 128, 0, 256); gr.addColorStop(0, '#0a1030'); gr.addColorStop(1, '#2a3a5a'); g.fillStyle = gr; g.fillRect(128, 128, 128, 128); g.fillStyle = '#f0f0d0'; g.beginPath(); g.arc(220, 160, 10, 0, 7); g.fill();
  g.fillStyle = '#0a0a14'; g.fillRect(150, 200, 30, 56); g.beginPath(); g.moveTo(145, 200); g.lineTo(165, 180); g.lineTo(185, 200); g.fill(); g.fillStyle = '#f0c040'; g.fillRect(160, 215, 8, 8);
  ruido(g, W, H, 8, 41); return texDe(c); }
/* un cuadro colgado: marco de madera y la pintura del atlas (0..5); eje 'x' = pared que corre en x (mira ±z) */
function cuadro(piso, eje, f, c, y, esc, nro, haciaNeg){ const s = esc || 1, lado = haciaNeg ? -1 : 1, o = lado*0.12, y0 = alturaPiso(piso);
  if(eje === 'z'){ caja('madera', f + o, y0 + y, c, 0.04, 0.72*s, 0.92*s, 0x4a2a12, {fuera:0}); } else { caja('madera', c, y0 + y, f + o, 0.92*s, 0.72*s, 0.04, 0x4a2a12, {fuera:0}); }
  CUADROS.push({piso, eje, x:eje === 'z' ? f + o + lado*0.021 : c, z:eje === 'z' ? c : f + o + lado*0.021, y:y0 + y, w:0.78*s, h:0.58*s, nro:nro || 0, lado}); }
function mallaCuadros(){ if(!CUADROS.length) return null; const pos = [], uv = [], nor = [], fue = [];
  for(const q of CUADROS){ const u0 = (q.nro % 4)*0.25, v0 = q.nro < 4 ? 0.5 : 0, hw = q.w/2, hh = q.h/2;
    const P = q.eje === 'z' ? [[q.x, q.y - hh, q.z - hw*q.lado], [q.x, q.y - hh, q.z + hw*q.lado], [q.x, q.y + hh, q.z + hw*q.lado], [q.x, q.y + hh, q.z - hw*q.lado]]
                            : [[q.x - hw*q.lado, q.y - hh, q.z], [q.x + hw*q.lado, q.y - hh, q.z], [q.x + hw*q.lado, q.y + hh, q.z], [q.x - hw*q.lado, q.y + hh, q.z]];
    const U = [[u0 + 0.004, v0 + 0.01], [u0 + 0.246, v0 + 0.01], [u0 + 0.246, v0 + 0.49], [u0 + 0.004, v0 + 0.49]], n = q.eje === 'z' ? [q.lado, 0, 0] : [0, 0, q.lado];
    for(const k of [0, 1, 2, 0, 2, 3]){ pos.push(...P[k]); uv.push(...U[k]); nor.push(...n); fue.push(0); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aFuera', new THREE.Float32BufferAttribute(fue, 1)); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, parcheAdentro(new THREE.MeshPhongMaterial({map:pintarCuadros(), shininess:40, specular:0x222222, side:THREE.DoubleSide}))); m.name = 'cuadros'; return m; }
/* cortinas a los costados de una ventana (no la tapan): dos paños con pliegues del alféizar para arriba y el barral, más adentro que el dintel */
function cortinas(v, col){ const y0 = alturaPiso(v.piso), [nx, nz] = v.n, P = (t, o) => v.eje === 'x' ? [v.c + t, v.f + nz*o] : [v.f + nx*o, v.c + t];
  const yb = y0 + (v.hueco ? v.hueco.y0 : 0.95) + 0.1, yt = y0 + 2.62, h = yt - yb;
  for(const s of [-1, 1]) for(let i = 0; i < 4; i++){ const t = s*(v.w/2 + 0.3 + i*0.09), dd = 0.03 + (i % 2)*0.04, [x, z] = P(t, -0.22 - (i % 2)*0.02), c = tono16(col, i % 2 ? 0.84 : 1);
    if(v.eje === 'x') caja('tela', x, yb + h/2, z, 0.1, h, dd, c, {fuera:0}); else caja('tela', x, yb + h/2, z, dd, h, 0.1, c, {fuera:0}); }
  const [bx, bz] = P(0, -0.25); if(v.eje === 'x') cil('metal', bx, yt + 0.03, bz, 0.016, v.w + 1.2, 0x8a7a50, {rz:Math.PI/2, fuera:0}); else cil('metal', bx, yt + 0.03, bz, 0.016, v.w + 1.2, 0x8a7a50, {rx:Math.PI/2, fuera:0}); }
/* una alfombra con guarda */
function alfombraSuelo(piso, x, z, w, d, col, guarda){ const y0 = alturaPiso(piso); caja('tela', x, y0 + 0.022, z, w, 0.014, d, guarda || tono16(col, 0.7), {fuera:0}); caja('tela', x, y0 + 0.026, z, w - 0.16, 0.012, d - 0.16, col, {fuera:0}); }
function tono16(c, k){ const r = Math.min(255, Math.round(((c >> 16) & 255)*k)), g = Math.min(255, Math.round(((c >> 8) & 255)*k)), b = Math.min(255, Math.round((c & 255)*k)); return (r << 16) | (g << 8) | b; }

/* ---------------------------------------------------------------- la casa amueblada */
const RADIO_POS = [-6.62, 0.85, -4.6];
/* sube las partes de un mueble (las alacenas cuelgan de la pared) */
const subir = (partes, dy) => partes.map(p => { const q = p.slice(); q[2] += dy; return q; });
function construirMuebles(){
  const V = id => VENTANAS.find(v => v.id === id);
  /* LIVING (x −7..−2, z −5..0): la tele contra la pared del fondo, el sillón de tres mirándola de espaldas a la ventana,
     la mesa ratona, un sillón individual, la biblioteca, la radio en la mesita del rincón, la lámpara de pie */
  mueblR(0, TELE_POS.x, -0.35, 2, 1.6, 0.48, pMuebleTV(1.6));
  for(const s of [-1, 1]) caja('metal', TELE_POS.x + s*0.1, TELE_POS.y + 0.6, TELE_POS.z + 0.05, 0.012, 0.5, 0.012, 0x9a9aa0, {rz:-s*0.5, fuera:0});
  caja('plastico', TELE_POS.x, TELE_POS.y + 0.4, TELE_POS.z + 0.05, 0.14, 0.03, 0.08, 0x2a2a2e, {fuera:0});
  mueblR(0, -4.5, -2.75, 0, 2.3, 0.9, pSillon(2.3, 0x8e2a2a));
  mueblR(0, -4.5, -1.55, 0, 1.1, 0.6, pMesaRatona());
  mueblR(0, -6.35, -1.1, 1, 0.95, 0.9, pSillon(0.95, 0x3a5a7a));
  mueblR(0, -2.45, -0.56, 3, 0.9, 0.32, pBiblio(0.9, 1.9, 11));
  mueblR(0, RADIO_POS[0], RADIO_POS[2], 0, 0.5, 0.42, pMesita(0.7, MAD2));
  mueblR(0, RADIO_POS[0], RADIO_POS[2], 0, 0.3, 0.3, [['plastico', 0, 0.83, 0, 0.42, 0.24, 0.22, 0x5a3418], ['plastico', 0.06, 0.83, 0.112, 0.2, 0.14, 0.006, 0x2a2a2a], ['plastico', -0.13, 0.86, 0.113, 0.06, 0.06, 0.006, 0xd8c890],
    ['plastico', -0.13, 0.78, 0.115, 0.04, 0.04, 0.008, 0x1a1a1a], ['metal', 0.14, 1.05, -0.05, 0.012, 0.36, 0.012, 0x9a9aa0, {rz:0.4}]], true);
  mueblR(0, -2.45, -4.55, 0, 0.3, 0.3, pLampara());
  alfombraSuelo(0, -4.5, -1.9, 3.0, 2.2, 0x7a2a28, 0x4a1a14);
  cuadro(0, 'z', -7, -0.75, 1.8, 0.75, 0); cuadro(0, 'x', -5, -6.3, 1.8, 0.8, 1); cuadro(0, 'z', -2, -3.85, 1.7, 0.8, 3, true);
  cortinas(V('v_living_f'), 0xa89060); cortinas(V('v_living_s'), 0xa89060);
  planta(0, -6.6, -0.38);
  /* ENTRADA (x −2..2, z −5..2,4): felpudo, perchero, la consola con el espejo, una planta y el camino de alfombra */
  caja('alfombraRoja', 0.25, 0.022, -4.45, 1.3, 0.02, 0.7, 0xffffff, {tex:0.6, fuera:0});
  alfombraSuelo(0, -0.5, -1.4, 1.0, 3.6, 0x2a3a6a, 0x1a2244);
  mueble(0, -1.65, -3.7, 0.4, 0.4, [['madera', 0, 0.9, 0, 0.06, 1.8, 0.06, OSC], ['madera', 0, 1.75, 0, 0.5, 0.05, 0.05, OSC], ['madera', 0, 1.75, 0, 0.05, 0.05, 0.5, OSC], ['madera', 0, 0.03, 0, 0.45, 0.06, 0.45, OSC], ['tela', 0.12, 1.45, 0.1, 0.3, 0.6, 0.14, 0x3a4a2a], ['tela', -0.1, 1.5, -0.12, 0.26, 0.5, 0.1, 0x6a2a1a]]);
  mueblR(0, -1.7, -0.35, 1, 1.0, 0.36, [['madera', 0, 0.76, 0, 1.0, 0.04, 0.36, MAD2], ['madera', 0, 0.66, 0, 0.94, 0.14, 0.32, MAD], ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ['madera', a*0.45, 0.35, b*0.14, 0.04, 0.7, 0.04, MAD]),
    ['plastico', 0.25, 0.83, 0, 0.18, 0.08, 0.18, 0xc8b890], ['metal', -0.2, 0.79, 0.05, 0.14, 0.02, 0.1, 0xb8a060]]);
  caja('plastico', -1.878, 1.45, -0.35, 0.012, 0.8, 0.6, 0xb8c6d0, {fuera:0}); caja('madera', -1.892, 1.45, -0.35, 0.016, 0.88, 0.68, 0x4a2a12, {fuera:0});
  planta(0, -1.58, -4.55); cuadro(0, 'z', -2, -4.3, 1.75, 0.7, 2);
  /* COCINA (x 2..7, z −5..0): la mesada sobre la pared del frente con la pileta bajo la ventana, la cocina con su campana,
     las alacenas a los costados de la ventana, la heladera junto al arco, la mesita con dos sillas, el teléfono y el reloj */
  mueblR(0, 3.12, -4.6, 0, 1.0, 0.62, pBajoMesada(1.0, true));
  mueblR(0, 4.62, -4.6, 0, 2.0, 0.62, pBajoMesada(2.0, false));
  mueblR(0, 5.97, -4.6, 0, 0.7, 0.62, pCocinaGas());
  mueblR(0, 6.61, -4.6, 0, 0.58, 0.62, pBajoMesada(0.58, true));
  caja('metal', 4.5, 0.945, -4.62, 0.62, 0.012, 0.42, 0x8a8a90, {fuera:0}); caja('metal', 4.5, 0.93, -4.62, 0.54, 0.02, 0.34, 0x4a4a50, {fuera:0});
  cil('metal', 4.5, 1.04, -4.84, 0.018, 0.2, 0xb8b8c0, {fuera:0}); caja('metal', 4.5, 1.13, -4.77, 0.028, 0.028, 0.16, 0xb8b8c0, {fuera:0});
  for(const [x0, x1] of [[2.62, 3.56], [5.44, 6.9]]) caja('azulejoPared', (x0 + x1)/2, 1.22, -4.89, x1 - x0, 0.56, 0.02, 0xffffff, {tex:0.9, fuera:0});
  mueblR(0, 3.12, -4.73, 0, 1.0, 0.34, subir(pAlacena(1.0), 1.5), true); mueblR(0, 6.61, -4.73, 0, 0.58, 0.34, subir(pAlacena(0.58), 1.5), true);
  caja('metal', 5.97, 1.72, -4.66, 0.7, 0.22, 0.48, 0xd8d8dc, {fuera:0}); caja('metal', 5.97, 1.6, -4.66, 0.66, 0.02, 0.44, 0x3a3a3e, {fuera:0}); caja('metal', 5.97, 2.4, -4.78, 0.26, 1.2, 0.22, 0xd0d0d4, {fuera:0});
  mueblR(0, 6.5, -0.55, 3, 0.8, 0.78, pHeladera());
  cil('metal', 5.81, 1.02, -4.46, 0.08, 0.14, 0x3a6a8a, {fuera:0});
  mueblR(0, 6.6, -4.62, 0, 0.3, 0.3, [['plastico', 0, 1.1, 0, 0.46, 0.3, 0.36, 0x2a2a2e], ['plastico', -0.06, 1.1, 0.181, 0.3, 0.2, 0.004, 0x10141a], ['plastico', 0.18, 1.1, 0.182, 0.06, 0.2, 0.004, 0x3a3a3e]], true);
  mueblR(0, 4.4, -2.3, 0, 1.2, 0.8, pMesa(1.2, 0.8, 0.76, MAD3));
  caja('tela', 4.4, 0.765, -2.3, 0.9, 0.012, 0.9, 0xd8d0b8, {fuera:0});
  mueblR(0, 3.55, -2.3, 1, 0.44, 0.44, pSilla(MAD2)); mueblR(0, 5.25, -2.3, 3, 0.44, 0.44, pSilla(MAD2));
  cil('plastico', 4.3, 0.781, -2.35, 0.12, 0.02, 0xf4f4f0, {fuera:0}); cil('plastico', 4.62, 0.82, -2.15, 0.04, 0.1, 0xd83030, {fuera:0});
  mueble(0, 2.13, -1.6, 0.1, 0.3, [['plastico', 0, 1.5, 0, 0.08, 0.3, 0.2, 0x2a2a2e], ['plastico', 0.05, 1.5, 0, 0.05, 0.08, 0.26, 0x1a1a1e], ['plastico', 0.045, 1.38, 0, 0.02, 0.1, 0.12, 0x3a3a3e]], true);
  cil('plastico', 2.12, 2.2, -2.6, 0.16, 0.04, 0xf4f0e0, {rz:Math.PI/2, fuera:0}); caja('plastico', 2.145, 2.24, -2.6, 0.01, 0.1, 0.012, 0x111111, {fuera:0}); caja('plastico', 2.145, 2.2, -2.56, 0.01, 0.012, 0.08, 0x111111, {fuera:0});
  cil('plastico', 6.72, 0.3, -1.25, 0.16, 0.6, 0x3a5a3a, {rb:0.13, fuera:0}); colision(0, 6.55, 6.89, -1.42, -1.08);
  cortinas(V('v_cocina_s'), 0xd8c878);
  /* COMEDOR (x 2..7, z 0..5): la mesa larga con seis sillas, el aparador, el piano lejos de la ventana */
  mueblR(0, 4.6, 2.3, 0, 1.8, 0.95, pMesa(1.8, 0.95, 0.76, MAD));
  for(const [x, z, r] of [[4.0, 1.6, 0], [4.6, 1.6, 0], [5.2, 1.6, 0], [4.0, 3.0, 2], [4.6, 3.0, 2], [5.2, 3.0, 2]]) mueblR(0, x, z, r, 0.44, 0.44, pSilla(MAD));
  for(const [x, z] of [[4.1, 2.1], [5.1, 2.5]]) cil('plastico', x, 0.771, z, 0.12, 0.02, 0xf4f4f0, {fuera:0});
  cil('metal', 4.6, 0.83, 2.3, 0.05, 0.14, 0xc8b060, {fuera:0}); cil('plastico', 4.6, 0.96, 2.3, 0.015, 0.14, 0xf4f0e0, {fuera:0});
  mueblR(0, 2.33, 2.4, 1, 1.4, 0.45, [['madera', 0, 0.44, 0, 1.4, 0.8, 0.45, MAD], ['madera', 0, 0.86, 0, 1.44, 0.04, 0.48, OSC], ...[-0.35, 0.35].map(x => ['madera', x, 0.5, 0.226, 0.62, 0.52, 0.012, MAD2]), ...[-0.35, 0.35].map(x => ['metal', x + (x > 0 ? -0.25 : 0.25), 0.55, 0.24, 0.02, 0.1, 0.02, 0xd0b060]),
    ['plastico', -0.4, 1.05, -0.12, 0.26, 0.34, 0.02, 0xe8e0d0], ['plastico', 0.1, 1.02, -0.12, 0.22, 0.28, 0.02, 0xd8e0e8], ['plastico', 0.45, 0.97, 0.05, 0.1, 0.18, 0.1, 0x6a8ab0]]);
  mueblR(0, 2.85, 4.58, 2, 1.4, 0.6, [['madera', 0, 0.66, 0, 1.4, 1.32, 0.6, 0x241612], ['madera', 0, 0.78, 0.2, 1.36, 0.06, 0.36, 0x1a0e0a], ['plastico', 0, 0.8, 0.35, 1.28, 0.04, 0.12, 0xf4f4f0], ['madera', 0, 1.1, 0.22, 1.2, 0.5, 0.02, 0x2a1a14], ['madera', 0, 0.02, 0.28, 1.2, 0.04, 0.2, 0x1a0e0a],
    ...Array.from({length:8}, (_, i) => ['plastico', -0.56 + i*0.16, 0.83, 0.33, 0.03, 0.03, 0.07, 0x111111])]);
  cuadro(0, 'z', 7, 0.75, 1.8, 0.75, 4, true); cuadro(0, 'x', 5, 6.35, 1.8, 0.8, 5, true);
  cortinas(V('v_comedor_b'), 0x6a3a3a); cortinas(V('v_comedor_s'), 0x6a3a3a); planta(0, 6.55, 4.55);
  /* DORMITORIO de abajo (x −7..−2, z 0..5): la cama contra la pared del fondo al lado de la ventana, la mesa de luz con
     velador, la cómoda de la linterna con su espejo junto al placard, una silla con ropa y la alfombra */
  mueblR(0, -2.88, 3.9, 2, 1.4, 2.0, pCama(1.4, 2.0, 0x3a5a9a));
  mueblR(0, -3.85, 4.69, 2, 0.5, 0.42, pMesita(0.55)); mueblR(0, -3.85, 4.69, 2, 0.26, 0.26, subir(pVelador(), 0.55), true);
  mueblR(0, -4.3, 0.36, 0, 0.9, 0.5, pComoda(0.9)); caja('plastico', -4.3, 1.5, 0.115, 0.6, 0.7, 0.02, 0xb8c6d0, {fuera:0}); caja('madera', -4.3, 1.5, 0.108, 0.68, 0.78, 0.02, 0x4a2a12, {fuera:0});
  placard('placard_cuarto', 0, -5.8, 0.42, 'x', 1);
  mueblR(0, -6.55, 4.45, 1, 0.44, 0.44, pSilla(MAD2).concat([['tela', 0.02, 0.52, 0.0, 0.36, 0.05, 0.3, 0x5a6a8a, {ry:0.3}], ['tela', 0, 0.7, -0.19, 0.4, 0.3, 0.05, 0x5a6a8a]]));
  alfombraSuelo(0, -4.6, 2.5, 2.0, 1.6, 0x6a5a8a); cortinas(V('v_cuarto_b'), 0x5a7a9a); cortinas(V('v_cuarto_s'), 0x5a7a9a);
  cuadro(0, 'x', 5, -2.88, 1.75, 0.9, 0, true);
  /* BAÑO de abajo (x −2..0,5, z 2,4..5): inodoro, lavatorio con espejo contra la pared del lavadero, toallero; LAVADERO
     (x 0,5..2): el estante de la llave contra la pared del baño, el lavarropas contra la otra, y el paso a la puerta libre */
  mueblR(0, -1.45, 4.62, 2, 0.44, 0.5, pInodoro());
  mueblR(0, 0.18, 3.6, 3, 0.56, 0.44, pLavatorio()); caja('plastico', 0.385, 1.5, 3.6, 0.02, 0.62, 0.5, 0xc0ccd6, {fuera:0}); caja('plastico', 0.39, 1.5, 3.6, 0.02, 0.68, 0.56, 0xf0f0f0, {fuera:0});
  caja('metal', -1.88, 1.2, 3.6, 0.03, 0.03, 0.6, 0xb8b8c0, {fuera:0}); caja('tela', -1.86, 1.0, 3.6, 0.03, 0.4, 0.46, 0x6a9ab8, {fuera:0});
  caja('tela', -0.9, 0.022, 3.7, 0.7, 0.012, 0.5, 0x6a9ab8, {fuera:0});
  mueble(0, 0.77, 2.95, 0.36, 0.8, [['madera', 0, 0.92, 0, 0.34, 0.03, 0.8, MAD], ['madera', 0, 1.42, 0, 0.34, 0.03, 0.8, MAD], ['madera', 0, 0.42, 0, 0.34, 0.03, 0.8, MAD], ['madera', 0, 0.92, -0.39, 0.34, 1.84, 0.03, MAD], ['madera', 0, 0.92, 0.39, 0.34, 1.84, 0.03, MAD],
    ['plastico', -0.05, 1.53, -0.2, 0.1, 0.2, 0.1, 0x3a8ad8], ['plastico', 0.02, 1.52, 0.1, 0.12, 0.17, 0.08, 0xe86a2a], ['plastico', -0.04, 0.52, 0.2, 0.2, 0.17, 0.16, 0xd8d0c0], ['plastico', 0, 0.54, -0.18, 0.18, 0.2, 0.14, 0x40a060]]);
  mueblR(0, 1.6, 3.8, 3, 0.6, 0.6, pLavarropas()); cil('plastico', 1.297, 0.5, 3.8, 0.17, 0.02, 0x2a3a4a, {rz:Math.PI/2, fuera:0}); cil('metal', 1.292, 0.5, 3.8, 0.2, 0.012, 0xc8c8cc, {rz:Math.PI/2, fuera:0});
  /* DORMITORIO GRANDE (arriba, x −7..−2, z −5..0): la cama contra la pared del costado, mesas de luz, el placard, la compu de las cámaras */
  mueblR(1, -5.9, -3.4, 1, 1.4, 2.0, pCama(1.4, 2.0, 0x8e2020, 1.1));
  for(const z of [-4.35, -2.45]){ mueblR(1, -6.65, z, 1, 0.5, 0.42, pMesita(0.55)); mueblR(1, -6.65, z, 1, 0.26, 0.26, subir(pVelador(), 0.55), true); }
  placard('placard_master', 1, -6.58, -1.5, 'z', 1);
  mueblR(1, -3.6, -0.4, 2, 1.3, 0.6, [['madera', 0, 0.74, 0, 1.3, 0.05, 0.6, MAD], ['madera', -0.6, 0.36, 0, 0.06, 0.72, 0.55, OSC], ['madera', 0.6, 0.36, 0, 0.06, 0.72, 0.55, OSC], ['madera', 0.4, 0.55, 0.02, 0.36, 0.3, 0.5, MAD2],
    ['plastico', 0, 1.02, -0.08, 0.6, 0.46, 0.34, 0xd8d4c8], ['plastico', 0, 1.02, 0.093, 0.5, 0.36, 0.01, 0x101418], ['plastico', 0, 0.78, 0.13, 0.5, 0.03, 0.18, 0xd0ccc0], ['plastico', 0.36, 0.78, 0.12, 0.08, 0.03, 0.12, 0xd0ccc0], ['plastico', 0, 0.8, -0.1, 0.24, 0.1, 0.2, 0xc8c4b8]]);
  mueblR(1, -3.6, -1.0, 0, 0.44, 0.44, pSilla(OSC)); alfombraSuelo(1, -4.4, -2.2, 2.0, 1.6, 0x5a3a2a);
  cortinas(V('v_master_f'), 0x8a2a2a); cuadro(1, 'x', 0, -5.9, 1.75, 0.9, 1, true);
  /* CUARTO DEL NENE (x 2..7, z −5..0): la camita, el cajón de juguetes, el escritorio chico, el osito y los cubos */
  mueblR(1, 6.0, -3.85, 3, 1.0, 1.8, pCama(1.0, 1.8, 0x3a8a4a, 0.8));
  mueblR(1, 3.0, -0.4, 2, 0.9, 0.5, [['madera', 0, 0.3, 0, 0.9, 0.6, 0.5, 0xc8a040], ['madera', 0, 0.61, 0, 0.94, 0.03, 0.54, 0xa88030], ['plastico', 0.2, 0.71, 0, 0.18, 0.18, 0.18, 0xd83030], ['plastico', -0.15, 0.7, 0.05, 0.15, 0.15, 0.15, 0x3050d8], ['plastico', 0.02, 0.85, 0.02, 0.13, 0.13, 0.13, 0xf0c030]]);
  mueblR(1, 4.6, -0.4, 2, 1.0, 0.5, pMesa(1.0, 0.5, 0.6, 0xd8d0c0)); mueblR(1, 4.6, -0.95, 0, 0.44, 0.44, pSilla(0x3a7ad8));
  mueble(1, 6.6, -0.5, 0.4, 0.4, [['tela', 0, 0.17, 0, 0.3, 0.34, 0.24, 0x8a5a30], ['tela', 0, 0.45, 0, 0.24, 0.22, 0.2, 0x8a5a30], ['tela', -0.09, 0.59, 0, 0.08, 0.08, 0.06, 0x7a4a24], ['tela', 0.09, 0.59, 0, 0.08, 0.08, 0.06, 0x7a4a24], ['plastico', -0.05, 0.47, -0.101, 0.03, 0.03, 0.01, 0x111111], ['plastico', 0.05, 0.47, -0.101, 0.03, 0.03, 0.01, 0x111111]], true);
  for(const [x, z, c] of [[3.7, -2.6, 0xd83030], [3.95, -2.45, 0x30a050], [3.8, -2.2, 0x3050d8]]) caja('plastico', x, PISO1 + 0.105, z, 0.18, 0.18, 0.18, c, {ry:x, fuera:0});
  cil('plastico', 5.2, PISO1 + 0.145, -2.2, 0.13, 0.26, 0xe84a3a, {seg:12, fuera:0});
  alfombraSuelo(1, 4.4, -2.4, 1.6, 1.6, 0xd8c040, 0x3050d8); cortinas(V('v_nene_f'), 0x4a8ad8);
  /* BAÑO de arriba: bañera con cortina, inodoro, lavatorio con espejo */
  mueblR(1, -6.1, 4.5, 2, 1.6, 0.78, pBanera(1.6));
  mueblR(1, -2.55, 4.62, 2, 0.44, 0.5, pInodoro());
  mueblR(1, -4.2, 0.35, 0, 0.56, 0.44, pLavatorio()); caja('plastico', -4.2, PISO1 + 1.5, 0.115, 0.5, 0.62, 0.02, 0xc0ccd6, {fuera:0}); caja('plastico', -4.2, PISO1 + 1.5, 0.108, 0.56, 0.68, 0.02, 0xf0f0f0, {fuera:0});
  caja('tela', -4.6, PISO1 + 0.036, 2.6, 0.7, 0.012, 0.5, 0xd86a8a, {fuera:0}); cortinas(V('v_bano2_s'), 0xd8e0e8);
  /* DEPÓSITO: cajas, la estantería de metal con latas, muebles viejos tapados con sábanas, un maniquí tapado y la bicicleta */
  for(const [x, z, s, y] of [[6.4, 4.4, 0.8, 0], [5.72, 4.5, 0.55, 0], [6.4, 3.35, 0.7, 0], [6.4, 4.4, 0.5, 0.8]]) mueble(1, x, z, s, s, [['madera', 0, y + s/2, 0, s, s, s, 0xa07840], ['plastico', 0, y + s + 0.001, 0, s*0.9, 0.002, 0.12, 0xc8a870]], y > 0);
  mueblR(1, 2.35, 4.3, 1, 1.2, 0.45, [['metal', -0.58, 0.95, -0.2, 0.03, 1.9, 0.03, 0x6a6a70], ['metal', 0.58, 0.95, -0.2, 0.03, 1.9, 0.03, 0x6a6a70], ['metal', -0.58, 0.95, 0.2, 0.03, 1.9, 0.03, 0x6a6a70], ['metal', 0.58, 0.95, 0.2, 0.03, 1.9, 0.03, 0x6a6a70],
    ...[0.1, 0.65, 1.2, 1.75].map(y => ['metal', 0, y, 0, 1.2, 0.025, 0.44, 0x7a7a80]), ['plastico', -0.35, 0.76, 0, 0.18, 0.2, 0.18, 0x8a8a90], ['plastico', 0.3, 0.75, 0.05, 0.16, 0.18, 0.16, 0x4a6a9a], ['madera', 0.1, 1.36, 0, 0.5, 0.3, 0.34, 0xa07840], ['plastico', -0.3, 1.89, 0, 0.3, 0.26, 0.3, 0x7a6a50]]);
  mueblR(1, 4.4, 1.2, 0, 1.6, 0.8, pTapado(1.6, 0.8, 0.8, 3)); mueblR(1, 6.3, 1.4, 3, 0.6, 0.6, pTapado(0.6, 1.0, 0.6, 5));
  mueble(1, 3.4, 3.55, 0.45, 0.45, [['metal', 0, 0.5, 0, 0.06, 1.0, 0.06, 0x3a3a3e], ['tela', 0, 1.35, 0, 0.44, 0.72, 0.3, 0xe8e4da], ['tela', 0, 1.8, 0, 0.26, 0.28, 0.26, 0xe8e4da], ['tela', 0, 0.98, 0, 0.52, 0.12, 0.36, 0xdcd8ce], ['metal', 0, 0.02, 0, 0.36, 0.04, 0.36, 0x3a3a3e]]);
  { const bx = 5.6, bz = 2.4, y0 = PISO1; cil('metal', bx - 0.45, y0 + 0.33, bz, 0.3, 0.03, 0x1a1a1a, {rx:Math.PI/2, seg:16, fuera:0}); cil('metal', bx + 0.45, y0 + 0.33, bz, 0.3, 0.03, 0x1a1a1a, {rx:Math.PI/2, seg:16, fuera:0});
    caja('metal', bx, y0 + 0.62, bz, 0.9, 0.04, 0.04, 0xa02020, {rz:0.1, fuera:0}); caja('metal', bx - 0.2, y0 + 0.46, bz, 0.5, 0.04, 0.04, 0xa02020, {rz:-0.6, fuera:0}); caja('metal', bx - 0.42, y0 + 0.82, bz, 0.04, 0.2, 0.3, 0x2a2a2a, {fuera:0}); caja('plastico', bx + 0.3, y0 + 0.8, bz, 0.22, 0.04, 0.1, 0x1a1a1a, {fuera:0});
    colision(1, bx - 0.8, bx + 0.8, bz - 0.12, bz + 0.12, {mueble:true}); manchaSuelo(bx - 0.85, bx + 0.85, bz - 0.25, bz + 0.25, y0 + 0.036); }
  /* PASILLO de arriba: el camino de alfombra, la mesita con el florero, cuadros */
  alfombraSuelo(1, -0.6, 0.0, 0.9, 8.4, 0x3a2a4a, 0x221830);
  mueblR(1, -1.7, 0.65, 1, 0.7, 0.35, [['madera', 0, 0.74, 0, 0.7, 0.04, 0.35, MAD2], ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ['madera', a*0.31, 0.36, b*0.14, 0.04, 0.72, 0.04, MAD]), ['plastico', 0, 0.9, 0, 0.12, 0.28, 0.12, 0x2a5a8a], ['plastico', 0.02, 1.1, 0, 0.2, 0.14, 0.06, 0xd83040]]);
  planta(1, -1.6, -4.5); cuadro(1, 'z', -2, 3.9, 1.75, 0.8, 4); cuadro(1, 'z', 2, -1.8, 1.75, 0.8, 5, true);
  /* el placard de abajo de la escalera se abre desde el pasillo */
  placard('placard_escalera', 0, 0.62, -0.4, 'z', -1, true);
  /* la llave inglesa en el estante del lavadero (se esconde cuando la agarrás) */
  { const g = new THREE.Group(), m = MAT.metal; const a = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.26), m), b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.06), m); b.position.z = 0.14; tintar(a.geometry, 0x9aa0a8); tintar(b.geometry, 0x9aa0a8); conFuera(a.geometry, 0); conFuera(b.geometry, 0);
    g.add(a, b); g.position.set(0.75, 0.945, 3.2); g.rotation.y = 0.5; MUNDO.grupo.add(g); MUNDO.llaveInglesa = g; }
}
const partesPlanta = () => [['madera', 0, 0.18, 0, 0.36, 0.36, 0.36, 0x7a3a1c], ['madera', 0, 0.37, 0, 0.4, 0.04, 0.4, 0x6a3014], ['plastico', 0, 0.36, 0, 0.32, 0.03, 0.32, 0x3a2a1a],
  ['plastico', 0, 0.62, 0, 0.05, 0.5, 0.05, 0x2a6a2a], ['plastico', 0.14, 0.8, 0, 0.32, 0.06, 0.1, 0x2e8a32, {rz:0.5}], ['plastico', -0.12, 0.76, 0.05, 0.28, 0.06, 0.1, 0x2e8a32, {rz:-0.6}], ['plastico', 0, 0.92, -0.1, 0.1, 0.06, 0.3, 0x2e8a32, {rx:0.5}], ['plastico', 0.02, 1.0, 0.08, 0.1, 0.06, 0.26, 0x36a03a, {rx:-0.5}]];
function planta(piso, x, z){ mueble(piso, x, z, 0.45, 0.45, partesPlanta()); }
/* lo que va afuera recibe el sol */
const alSol = partes => partes.map(p => { const q = p.slice(); q[8] = Object.assign({}, q[8] || {}, {fuera:1}); return q; });

/* ---------------------------------------------------------------- la fachada: zócalo de ladrillo, alero de la entrada con sus postes,
   postigos, jardineras, canaletas con sus bajadas, la chimenea y el remate del techo */
function construirFachada(){
  const X = 7.1, Z = 5.1, BL = 0xe8e4da;
  /* el zócalo de ladrillo con su cornisa de cemento; se corta en las dos puertas */
  const zoc = (x0, x1, z0, z1) => { const w = x1 - x0, d = z1 - z0; caja('ladrillo', (x0 + x1)/2, 0.22, (z0 + z1)/2, w, 0.6, d, 0xffffff, {tex:0.9, fuera:1});
    caja('vereda', (x0 + x1)/2, 0.54, (z0 + z1)/2, w + (d > w ? 0.04 : 0), 0.05, d + (w > d ? 0.04 : 0), 0xc8c2b8, {fuera:1}); };
  zoc(-X - 0.06, -0.39, -Z - 0.06, -Z); zoc(0.89, X + 0.06, -Z - 0.06, -Z); zoc(-X - 0.06, 0.61, Z, Z + 0.06); zoc(1.89, X + 0.06, Z, Z + 0.06);
  zoc(-X - 0.06, -X, -Z, Z); zoc(X, X + 0.06, -Z, Z);
  /* la entrada: el piso de cemento, dos postes blancos, la viga y el alero de tejas, el felpudo y dos macetas */
  caja('vereda', 0.25, 0.02, -5.75, 2.7, 0.04, 1.3, 0xc0bab0, {tex:1.2, fuera:1});
  for(const x of [-1.0, 1.5]){ caja('madera', x, 1.36, -6.28, 0.14, 2.72, 0.14, BL, {fuera:1}); caja('madera', x, 0.06, -6.28, 0.22, 0.12, 0.22, 0xc8c4ba, {fuera:1}); colision(0, x - 0.11, x + 0.11, -6.39, -6.17); }
  caja('madera', 0.25, 2.72, -6.28, 2.8, 0.16, 0.16, BL, {fuera:1}); caja('madera', 0.25, 2.72, -5.2, 2.8, 0.12, 0.12, BL, {fuera:1});
  caja('tejas', 0.25, 2.93, -5.78, 3.1, 0.08, 1.52, 0xffffff, {rx:-0.2, tex:1.5, fuera:1});
  caja('tela', 0.25, 0.05, -5.52, 1.0, 0.02, 0.55, 0x4a3020, {fuera:1});
  for(const x of [-0.72, 1.22]) mueble(0, x, -5.5, 0.45, 0.45, alSol(partesPlanta()));
  caja('metal', 1.05, 1.95, -5.13, 0.2, 0.14, 0.02, 0xc8a850, {fuera:1});
  /* la puerta de atrás: un alerito, el escalón */
  caja('tejas', 1.25, 2.74, 5.55, 1.9, 0.07, 0.95, 0xffffff, {rx:0.2, tex:1.5, fuera:1}); for(const x of [0.5, 2.0]) caja('madera', x, 2.5, 5.35, 0.06, 0.06, 0.55, BL, {rx:0.7, fuera:1});
  caja('vereda', 1.25, 0.02, 5.55, 1.7, 0.04, 0.9, 0xc0bab0, {tex:1.2, fuera:1});
  /* postigos verdes con tablillas a los costados de cada ventana, y jardineras con flores abajo de las del frente */
  for(const v of VENTANAS){ if(v.chica) continue; const h = v.hueco, y0 = alturaPiso(v.piso), [nx, nz] = v.n, alto = h.y1 - h.y0 + 0.12, ym = y0 + (h.y0 + h.y1)/2;
    const P = (t, o) => v.eje === 'x' ? [v.c + t, v.f + nz*o] : [v.f + nx*o, v.c + t];
    for(const s of [-1, 1]){ const [x, z] = P(s*(v.w/2 + 0.4), 0.135);
      if(v.eje === 'x') caja('madera', x, ym, z, 0.4, alto, 0.04, 0x2e4a3a, {fuera:1}); else caja('madera', x, ym, z, 0.04, alto, 0.4, 0x2e4a3a, {fuera:1});
      for(let k = 0; k < 10; k++){ const yk = ym - alto/2 + 0.1 + k*(alto - 0.2)/9, [x2, z2] = P(s*(v.w/2 + 0.4), 0.16);
        if(v.eje === 'x') caja('madera', x2, yk, z2, 0.33, 0.04, 0.02, 0x3c5c4a, {fuera:1}); else caja('madera', x2, yk, z2, 0.02, 0.04, 0.33, 0x3c5c4a, {fuera:1}); } }
    if(v.piso === 0 && (v.id === 'v_living_f' || v.id === 'v_cocina_f')){ const [x, z] = P(0, 0.23), r = mulberry(v.c*7 + 3);
      caja('madera', x, y0 + h.y0 - 0.33, z, v.w + 0.1, 0.2, 0.25, 0x6a3a1c, {fuera:1}); colision(0, x - v.w/2 - 0.05, x + v.w/2 + 0.05, z - 0.13, z + 0.13);
      for(let i = 0; i < 9; i++){ const t = -v.w/2 + 0.1 + i*(v.w - 0.2)/8, [fx, fz] = P(t, 0.23 + (r() - 0.5)*0.1), c = [0xd83040, 0xf0c030, 0xf4f0e8, 0xe05080][i % 4];
        caja('plastico', fx, y0 + h.y0 - 0.18, fz, 0.12, 0.12, 0.12, 0x2e7a30, {fuera:1}); caja('plastico', fx, y0 + h.y0 - 0.1, fz, 0.07, 0.07, 0.07, c, {fuera:1}); } } }
  /* las canaletas bajo los aleros y las bajadas en las esquinas */
  for(const s of [-1, 1]){ caja('metal', 0, 5.72, s*5.56, 15.1, 0.1, 0.12, 0xd4d4d0, {fuera:1});
    for(const sx of [-1, 1]){ caja('metal', sx*6.95, 5.6, s*5.37, 0.08, 0.08, 0.4, 0xd4d4d0, {fuera:1}); caja('metal', sx*6.95, 2.84, s*5.18, 0.08, 5.6, 0.08, 0xd4d4d0, {fuera:1});
      caja('metal', sx*6.95, 0.08, s*5.3, 0.1, 0.06, 0.28, 0xd4d4d0, {fuera:1}); } }
  /* el remate de la cumbrera, las tapas blancas de los hastiales y la chimenea de ladrillo */
  const ang = Math.atan2(2.5, 5), lad = Math.hypot(5.5, 2.5 + 0.5*2.5/5);
  caja('tejas', 0, 8.67, 0.0, 15.1, 0.1, 0.4, 0x9a9a9a, {fuera:1});
  for(const s of [-1, 1]) for(const sx of [-1, 1]) caja('madera', sx*7.52, 7.25, s*2.75, 0.06, 0.2, lad, BL, {rx:s*ang, fuera:1});
  caja('ladrillo', -5.0, 7.7, 2.0, 0.9, 2.9, 0.9, 0xffffff, {tex:0.9, fuera:1}); caja('vereda', -5.0, 9.18, 2.0, 1.05, 0.1, 1.05, 0xb8b2a8, {fuera:1}); caja('metal', -5.0, 9.3, 2.0, 0.5, 0.16, 0.5, 0x1a1a1a, {fuera:1});
}
