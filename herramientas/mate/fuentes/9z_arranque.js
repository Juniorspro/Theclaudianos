/* ================================================================ arranque */
medir();
PART.solidas = sistemaParticulas(1400, false); PART.brillos = sistemaParticulas(700, true);
prepararHojas(); aplicarCalidad();
document.getElementById('carga').style.display = 'none';
volverAlMenu(); UI.p = 'titulo';
requestAnimationFrame(lazo);
