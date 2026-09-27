/* ================================================================ arranque y bucle */
let _ult = performance.now(), _fps = 60;
function cuadro(ahora){
  requestAnimationFrame(cuadro);
  let dt = Math.min(0.05, Math.max(0, (ahora - _ult)/1000)); _ult = ahora; _fps = _fps*0.95 + (dt > 0 ? 1/dt : 60)*0.05;
  RELOJ.real += dt; RELOJ.t += dt;
  try {
    if(JUEGO.modo === 'pelea' || JUEGO.modo === 'bendicion' || JUEGO.modo === 'resultado' || JUEGO.modo === 'derrota'){
      if(JUEGO.modo === 'pelea' && !JUEGO.pausa){ pasoLucha(dt); pasoTutorial();
        if(LUCHA.fin && LUCHA.finT > (LUCHA.fin === 'victoria' ? (LUCHA.enemigo.T.jefe ? 3.2 : 2.2) : 2.6) && !LUCHA.cerrando){ LUCHA.cerrando = true; if(finDePelea() === 'sigue') LUCHA.cerrando = false; } }
      dibujarPelea(JUEGO.pausa ? 0 : dt);
    } else if(JUEGO.modo === 'menu') dibujarTitulo(dt);
    else if(JUEGO.modo === 'cargando'){ /* deja el último cuadro atrás del velo */ }
  } catch(e){ anotarError(e); }
}
async function arrancar(){
  UI.velo(true, 'EL ÚLTIMO RŌNIN'); SON.volumen(AJ.musica, AJ.efectos);
  /* el papel: ruido de fibras horneado una vez */
  { const [c, x] = [document.createElement('canvas'), null]; c.width = c.height = 256; const cx = c.getContext('2d'), d = cx.createImageData(256, 256), r = mulberry(7);
    for(let i = 0; i < d.data.length; i += 4){ const v = 200 + r()*55; d.data[i] = v; d.data[i + 1] = v*0.97; d.data[i + 2] = v*0.9; d.data[i + 3] = 255; } cx.putImageData(d, 0, 0);
    cx.globalAlpha = 0.08; cx.strokeStyle = '#6a5030'; for(let i = 0; i < 90; i++){ cx.beginPath(); const x0 = r()*256, y0 = r()*256; cx.moveTo(x0, y0); cx.lineTo(x0 + rv(-30, 30), y0 + rv(-8, 8)); cx.stroke(); }
    $('papel').style.backgroundImage = 'url(' + c.toDataURL() + ')'; }
  await cargarFondos();
  try { await cargarPJ('heroe', k => UI.progreso(k)); } catch(e){ anotarError(e); }
  requestAnimationFrame(cuadro);
  UI.velo(false);
  { const mp = mascotaPuesta(); if(mp) cargarPJ(MASCOTAS[mp].pj).catch(anotarError); }   /* la mascota, para que ya acompañe en el título */
  setTimeout(() => cargarPJ('e_bandido').catch(anotarError), 1500);   /* el primer enemigo de la historia, de antemano */
  if(!AJ.vistoIdioma) UI.idioma(); else UI.titulo();
}
/* ================================================================ para el banco */
window.__R = {JUEGO, LUCHA, PJ, PROG, AJ, ENT, RELOJ, ERRORES, TR_FALTA, TIPOS, CAPITULOS, BENDICIONES, UI, SON, MED, FONDOS,
  empezarCapitulo, empezarYokai, siguienteEtapa, arrancarPelea, pasoLucha, dibujarPelea, dibujarTitulo, cargarPJ, heroeStats, tomarBendicion, ponerIdioma, pausar, apretar,
  comprarEspada, mejorarEspada, entrenar, comprarMascota, mejorarMascota, MASCOTAS, ventaja, elegirAtaque, heroeStatsM:() => heroeStats(), finDePelea, ponerEstado, luchador, cuadroDe, tr, modoJS:v => { MODO_JS = !!v; }, modoWC:v => { MODO_WC = !!v; }, wc:() => ({MODO_WC, _wcTex, camino:CAMINO.elegido, gpu:CAMINO.gpu.map(Math.round), cpu:CAMINO.cpu.map(Math.round)}), camino:v => { CAMINO.elegido = v; }, est:() => ({fps:Math.round(_fps), modo:JUEGO.modo, pjs:Object.keys(PJ)})};
window.__mp4 = mp4Muestras; window.__DATOS = DATOS;
if(!window.__noArrancar) arrancar();
