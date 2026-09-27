/* ================================================================ las mascotas
   Como en el original: no pelean, acompañan. Van detrás del rōnin, festejan cuando le sale algo bien (desvío,
   relámpago, remate, la última baja) y cada una da una ventaja que sube con su nivel (1 a 5). Se compran y se mejoran en
   MASCOTAS; la puesta se ve también en el título. Los cuadros salen de videos de Rezona, como los luchadores. */
const MASCOTAS = {
  gato:  {pj:'m_gato',   kanji:'猫', nombre:'Gato del cascabel', txt:'Tu equilibrio se recupera un {0}% más rápido y aguanta un {1}% más.', precio:0,    voz:'maullido', alto:86, atras:135},
  shiba: {pj:'m_shiba',  kanji:'犬', nombre:'Shiba',             txt:'{0}% de esquivar solo un golpe normal.',                         precio:600,  voz:'ladrido',  alto:92, atras:145},
  cuervo:{pj:'m_cuervo', kanji:'烏', nombre:'Cuervo',            txt:'Ganás un {0}% más de oro.',                                      precio:900,  voz:'graznido', alto:70, atras:130},
  halcon:{pj:'m_halcon', kanji:'鷹', nombre:'Halcón',            txt:'{0}% de golpe crítico (daño ×1,8).',                             precio:1500, voz:'chillido', alto:74, atras:120, vuela:118},
  panda: {pj:'m_panda',  kanji:'熊', nombre:'Panda',             txt:'Tu vida máxima sube un {0}%.',                                   precio:2200, voz:'panda',    alto:96, atras:150},
};
/* lo que da cada una en su nivel (porcentajes enteros, para mostrar y para calcular) */
function bonoMascota(id, nv){ nv = nv || 0; if(!nv) return [0, 0];
  if(id === 'gato') return [20 + nv*10, 4 + nv*3];
  if(id === 'shiba') return [6 + nv*3, 0];
  if(id === 'cuervo') return [15 + nv*9, 0];
  if(id === 'halcon') return [8 + nv*4, 0];
  if(id === 'panda') return [8 + nv*4, 0];
  return [0, 0]; }
/* si la puesta no tiene cuadros en el archivo, no hay mascota (y tampoco su ventaja): el juego sigue igual */
const mascotaPuesta = () => MASCOTAS[PROG.mascota] && PROG.mascotas[PROG.mascota] && DATOS.pj[MASCOTAS[PROG.mascota].pj] ? PROG.mascota : null;
/* la ventaja de la puesta (0 si la que se pide no es la puesta) */
function ventaja(id, i){ return mascotaPuesta() === id ? bonoMascota(id, PROG.mascotas[id])[i || 0]/100 : 0; }
const precioMascota = id => { const nv = PROG.mascotas[id] || 0; return Math.round(180*Math.pow(1.7, nv)*(1 + MASCOTAS[id].precio/1500)); };
function comprarMascota(id){ const M = MASCOTAS[id]; if(PROG.mascotas[id]){ PROG.mascota = id; guardarProg(); SON.fx(M.voz); cargarPJ(M.pj).catch(anotarError); return true; }
  if(PROG.oro < M.precio){ SON.fx('menu_atras'); return false; } PROG.oro -= M.precio; PROG.mascotas[id] = 1; PROG.mascota = id; guardarProg(); SON.fx('compra'); SON.fx(M.voz);
  cargarPJ(M.pj).catch(anotarError); return true; }
function mejorarMascota(id){ const nv = PROG.mascotas[id] || 0, p = precioMascota(id); if(!nv || nv >= 5 || PROG.oro < p){ SON.fx('menu_atras'); return false; }
  PROG.oro -= p; PROG.mascotas[id] = nv + 1; guardarProg(); SON.fx('mejora'); SON.fx(MASCOTAS[id].voz); return true; }

/* ---------------------------------------------------------------- la mascota en la pelea */
function crearMascota(H){
  const id = mascotaPuesta(); if(!id) return null; const M = MASCOTAS[id];
  return {id, pj:M.pj, T:{alto:M.alto}, escala:1, dir:H ? H.dir : 1, x:H ? H.x - (H.dir || 1)*M.atras : 200, yOff:M.vuela || 0,
    anim:'quieto', animT:Math.random()*2, fpsAnim:0, animVel:1, festejoT:0, vozT:0, sombra:!M.vuela};
}
/* festeja y dice lo suyo (con un respiro entre voces, para que no sea un coro) */
function mascotaFesteja(){ const m = LUCHA.mascota; if(!m || !PJ[m.pj] || !PJ[m.pj].anims.festejo) return;
  if(m.anim !== 'festejo'){ m.anim = 'festejo'; m.animT = 0; m.fpsAnim = 14; }
  if(RELOJ.t - m.vozT > 1.6){ m.vozT = RELOJ.t; SON.fx(MASCOTAS[m.id].voz, {pan:panDe(m.x), vol:0.8}); } }
function pasoMascota(dt){
  const m = LUCHA.mascota, H = LUCHA.heroe; if(!m || !H) return;
  const M = MASCOTAS[m.id], meta = H.x - H.dir*M.atras;
  /* sigue al rōnin con un poco de atraso y mira para donde mira él; no se mete en la pelea */
  m.x += (meta - m.x)*Math.min(1, dt*(Math.abs(meta - m.x) > 140 ? 6 : 3)); m.dir = H.dir;
  m.x = lim(m.x, ARENA.x0 - 20, ARENA.x1 + 20);
  m.animT += dt;
  if(m.vuela) m.yOff = M.vuela + Math.sin(RELOJ.t*2.2)*8;
  if(m.anim === 'festejo' && m.animT >= duracion(m, 'festejo', 14)){ m.anim = 'quieto'; m.animT = 0; m.fpsAnim = 0; }
}
