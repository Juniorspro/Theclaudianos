/* ================================================================ arranque */
medir(); prepararArte(); iniciarPost();
JUG.mascara = mascaraAbierta(PROG.mascara) ? PROG.mascara : 'carpincho';
document.getElementById('carga').style.display = 'none';
J.modo = 'menu'; UI.p = 'idioma'; SON.cinta(0.25);
/* las sondas del banco */
window.__L = {J, JUG, CTRL, CAMARA, UI, PROG, AJ, POST, PISO, CAPITULOS, ARMAS, TR_FALTA, _AUD, get ENEM(){ return ENEM; }, get ITEMS(){ return ITEMS; }, get CUERPOS(){ return CUERPOS; }, get BALAS(){ return BALAS; },
  empezarCap, jugarCap, cargarPiso, terminarCapitulo, reintentar, volverAlMenu, ponerIdioma, matar, hacerAccion, accionDisponible, seVe, campo, pasoCampo, chocaCirculo, irA, centroPalo, centroAccion, aMundo, textoLibre:() => [..._AUD], SON, sim:(n, dt) => { for(let i = 0; i < n; i++) paso(dt); }, get ESTADOS(){ return ESTADOS_PISO; }};
requestAnimationFrame(lazo);
