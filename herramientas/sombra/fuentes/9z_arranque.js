/* ================================================================ arranque */
medir(); iniciarPost(); POST.brillo = 0.35;
for(const n of NIVELES) n.tramos = Math.min(n.tramos, 9);
prepararFondoMenu();
document.getElementById('carga').style.display = 'none';
UI.p = 'idioma'; SON.cinta(0.3);
/* las sondas del banco */
window.__S = {J, NIN, CAM, UI, PROG, AJ, POST, MAPA, NIVELES, MUNDOS, NINJAS, EFECTOS, TR_FALTA, _AUD, get ENEM(){ return ENEM; }, get MONEDAS(){ return MONEDAS; }, get BALAS(){ return BALAS; },
  empezarNivel, empezarInfinito, volverAlMenu, reintentar, ponerIdioma, irA, saltar, puedeSaltar, alcance, armarNivel, velTiro, pasoCuerpo, tile, abrirCofre, guardarProg, efecto, HH, V_MAX,
  sim:(n, dt) => { for(let i = 0; i < n; i++) paso(dt); }, textos:() => [..._AUD], SON};
requestAnimationFrame(lazo);
