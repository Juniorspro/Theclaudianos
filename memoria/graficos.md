# Gráficos — lo que está puesto y lo que falta
Fuente: `juegos-pc/Bosque.html`; método largo en `docs/GUIA-JUEGOS.md` y `.claude/skills/graficos`.
Ver también: [bosque](bosque.md), [banco](banco.md).

## Lo que ya está (2026-09-22)
- Tono **ACES** con exposición 0,94–1,02 según el día; sin HDR: el destino del VHS es
  `RGBAFormat` de 8 bits con `encoding = sRGB`.
- **Luz de entorno real**: foto 360 → `PMREMGenerator` → `scene.environment`, intensidad 0,20–0,42
  atada al ciclo de día. El cielo del juego es un shader de degradado y **no ilumina**.
- Hemisférica 0,40–0,80 con cielo y suelo de colores distintos; direccional 0,40–1,58.
- Sombra: mapa 2048, caja ±28 m, `bias −0,0006`, `normalBias 0,04`. Las **hojas no proyectan**.
- Niebla `FogExp2` 0,034–0,055 (sin bruma baja integrada).
- Texturas de foto con **normal derivado por Sobel** de la propia foto y
  `MirroredRepeatWrapping`; el tinte del material se recalcula en lineal al cambiar la foto.
- Post VHS propio, topado en 1,25 y con ajuste del jugador (NO/SUAVE/MEDIA/FUERTE).

## Lo que el método pide y todavía no está — por orden de impacto
1. **Un sol que mande y una sola hora**: hoy el ciclo día/noche mueve todo; la guía pide
   contraste alto con el ambiente por debajo del sol. (sin comprobar acá)
2. **HDR + rayos de sol**: el destino es de 8 bits y no hay volumétricos. `docs/GUIA-JUEGOS.md § 6.1`.
3. **Niebla con bruma baja y color de sol** (la de la guía, integrada a lo largo del rayo):
   `docs/GUIA-JUEGOS.md § 6.3`.
4. **LOD de árboles en tres niveles** (hoy sólo hay recorte por cuadra): `§ 6.5`.
5. **Fundir lo que queda suelto**: 595 mallas fuera de las casas (faroles, carteles, cercos).
6. **Encadenar `onBeforeCompile` con clave** (`parchear`): hoy el viento y la proyección de UV
   viven en materiales distintos, pero el día que se junten en uno, el segundo pisa al primero.
   `docs/GUIA-JUEGOS.md § 6.3`.

## Reglas que ya costaron una vuelta (las cortas)
- `setRGB`/`new Color(0x…)` toman lineales: un color sRGB sale lavado → `convertSRGBToLinear()`.
- El tone mapping **no** se aplica dibujando a un render target.
- `renderer.info` se pone a cero en cada `render()`: va `info.autoReset=false` y reset a mano.
- Una sombra es una pasada entera de la escena; una luz con intensidad 0 no proyecta.
- Un material instanciado tiene una sola opacidad: lo que late, late con la **escala**.
- El descarte de caras mira el **orden de los vértices**, no la normal.
- `Group.add()` devuelve el grupo, no el hijo.
