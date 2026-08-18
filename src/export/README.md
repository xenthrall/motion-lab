# Export — descarga a formatos de redes sociales

Dos formas de exportar, que conviven a propósito (ver
["Exportación en vivo vs. renderizado offline"](#exportación-en-vivo-vs-renderizado-offline)
más abajo para cuándo usar cada una):

- **En vivo, en el navegador** (`capture.ts`) — instantáneo, el botón
  "Descargar" de la UI. Cero dependencias nuevas.
- **Offline, determinista** (`scripts/render.mjs`, raíz del proyecto) —
  `npm run render`, corre en Node vía un navegador headless + `ffmpeg`.
  Tarda más, pero nunca pierde un frame sin importar cuán pesada sea la
  animación.

## Exportación en vivo (`capture.ts`)

- `capture.ts` — redibuja el SVG animado en vivo sobre un `<canvas>` cada
  frame (`requestAnimationFrame`), captura ese canvas como `MediaStream`
  (`canvas.captureStream`) y lo graba con `MediaRecorder`. Es una
  grabación en tiempo real (dura lo que dure la animación), no un
  renderizador determinista frame-por-frame.
- `rasterize.ts` — la función que convierte el estado actual del SVG en
  píxeles sobre un canvas (letterboxed al tamaño destino). La comparte
  `capture.ts` (llamada en cada frame) **y** `scripts/render.mjs` (vía el
  hook `window.__lab.render`, solo en modo dev) — una sola implementación
  para las dos vías de exportación.
- `aspect-presets.ts` — formatos soportados (cuadrado, 4:5, 9:16, 16:9)
  con su resolución de exportación. El mismo preset dimensiona el stage
  en pantalla (`src/components/stage.ts`), así lo que se ve en el
  navegador es lo que se exporta.
- `backgrounds.ts` — los fondos disponibles (ver más abajo). El mismo
  preset pinta el fondo del stage en pantalla, mismo principio WYSIWYG
  que `aspect-presets.ts`.
- `download.ts` — dispara la descarga del Blob resultante.

`capture.ts` sigue aceptando `format` (`"mp4" | "webm-transparent"`) como
antes, pero ya **no es una elección directa del usuario** — `main.ts` lo
deriva del `kind` del fondo elegido (`"solid"` → mp4, `"transparent"` →
webm-transparent), así no existe una combinación inválida que elegir
(antes formato de archivo y fondo eran selectores independientes y nada
impedía, conceptualmente, pedir transparencia con un fondo sólido).

## Fondos (`backgrounds.ts`)

Lista plana y reemplazable — agregar, quitar o recolorear un fondo es un
cambio de una línea ahí, en ningún otro lado. De momento:

| id | Nombre | Tipo | Color |
|---|---|---|---|
| `midnight` | Medianoche | sólido | `#0a0a0f` |
| `cream` | Crema | sólido | `#f6f0e4` |
| `emerald` | Esmeralda | sólido | `#0d3b34` |
| `transparent` | Transparente | transparente | — |

Los tres sólidos se eligieron para contrastar bien con el gradiente
violeta de la mascota en ambos extremos (claro arriba, oscuro abajo):
un neutro muy oscuro, un cálido casi-blanco, y un verde-azulado profundo
con un matiz claramente distinto al violeta (evita elegir un cuarto tono
de violeta, que podría no contrastar bien contra la parte más oscura del
propio gradiente de la mascota). Verificado extrayendo un frame del
video exportado y comprobando el color de fondo real en el píxel.

Para agregar un fondo nuevo: sumar una entrada a `BACKGROUNDS` en
`backgrounds.ts` — el picker de la UI (`src/components/toolbar.ts`) y la
exportación lo recogen automáticamente, no hace falta tocar nada más.

## Formato de salida

Se deriva del fondo elegido (ver arriba):

- **Fondo sólido → MP4**: se intenta MP4 primero
  (`MediaRecorder.isTypeSupported`) y se cae a WebM si el navegador no lo
  soporta. Listo para subir directo a redes sociales.
- **Fondo transparente → WebM**: fuerza `video/webm;codecs=vp9` y
  **omite** el relleno de fondo del canvas (`ctx.clearRect` en vez de
  `ctx.fillRect`), así el video queda con canal alfa real — pensado como
  asset reutilizable (overlay, edición, composición web), no para redes
  sociales directamente (Instagram/TikTok no aceptan video con
  transparencia).

### Transparencia: verificado empíricamente, no asumido

Antes de implementar esto se verificó, con una prueba mínima (canvas con
mitad opaca/mitad transparente → `captureStream` → `MediaRecorder` con
`vp9` → decodificar el resultado de vuelta a un `<canvas>`), que **Chrome
preserva el canal alfa de punta a punta** en exactamente este pipeline,
sin flags ni configuración especial — solo `getContext("2d", {alpha:
true})` (ya es el default) + `video/webm;codecs=vp9`. Esto evitó sumar
una dependencia pesada (ffmpeg.wasm) para algo que el navegador ya
resuelve nativamente.

**Advertencia real encontrada al verificar con la mascota real:**
`ffmpeg`/`ffprobe` (herramienta de línea de comandos) **no** compone el
canal alfa de VP9-en-WebM al extraer un frame con las opciones por
defecto (`ffprobe` reporta `pix_fmt=yuv420p`, sin alfa, y un frame
extraído con `-frames:v 1 -pix_fmt rgba` sale con alfa=255 en todos
lados) — a pesar de que el archivo SÍ tiene el canal alfa (ffmpeg hasta
loggea `alpha_mode: 1` en los metadatos al leerlo). La verificación real
que importa es decodificar el archivo **en un navegador** (`<video>` +
`drawImage` a un canvas) — así se confirmó, con el archivo real exportado
desde la mascota, que la esquina transparente da `[0,0,0,0]` y el cuerpo
opaco de la mascota da alfa `255`. Si en algún momento se necesita
inspeccionar/editar estos archivos fuera del navegador (afterEffects,
ffmpeg con flags específicos, etc.), tener en cuenta que las herramientas
por defecto pueden mostrar el alfa como si no existiera aunque sí esté
ahí.

**Compatibilidad:** verificado en Chrome/Chromium. La lectura de WebM con
alfa VP9 en Firefox/Safari no se probó — el archivo es VP9-alpha-en-WebM
válido según spec, pero el soporte de decodificación puede variar entre
navegadores.

## Renderizado offline (`scripts/render.mjs`)

```
npm run render                                                                     # interactivo: flechas + enter para todo lo que falte
npm run render -- --list                                                           # ver ids disponibles y salir
npm run render -- --experiment=mascot-adventure                                    # solo pregunta aspecto/fondo/fps
npm run render -- --experiment=... --aspect=... --background=... --fps=... --yes   # 100% scriptable, sin prompts
```

Cada valor (experimento, aspecto, fondo, fps) se toma de su flag si viene
dado; si no, se pregunta interactivamente con `@clack/prompts` (flechas +
enter, `Esc`/`Ctrl+C` cancela limpio). Al final solo se muestra una
confirmación si **al menos un valor** salió de un prompt — un run con las
cuatro flags (o con `--yes`) nunca toca stdin, así sigue siendo seguro de
invocar desde un script o CI. Verificado en ambos extremos: con las
cuatro flags corre de punta a punta sin bloquear (~21s para `mascot-intro`
completo), y con solo `--experiment` se detiene a preguntar exactamente
lo que falta (aspecto/fondo/fps) y muestra la confirmación al final.

### Por qué existe

La exportación en vivo reproduce el timeline en tiempo real: si un frame
tarda más de lo que dura ese frame a la velocidad elegida, ese frame se
pierde. En animaciones largas/pesadas (`mascot-adventure`, con 8 props de
escena) esto se nota como lag en el video descargado.

Antes de construir esto se investigaron optimizaciones al capturador en
vivo — **ninguna ayudó, y una directamente rompió la exportación**:

- `createImageBitmap(Blob)` en vez de `Image` + data-URI: falla con
  `InvalidStateError: The source image could not be decoded` en este
  Chrome/headless — confirmado incluso con un SVG trivial de un solo
  `<rect>`, así que no es un problema de nuestro SVG en particular.
  Producía exports de **0 bytes**. Revertido antes de que llegara a
  ningún lado.
- `Image.src = URL.createObjectURL(blob)` en vez de data-URI: medido
  **más lento** (~38ms/frame) que el data-URI original (~18ms/frame) —
  el overhead de registrar/revocar la Blob URL supera el costo de
  codificar un string XML de ese tamaño.
- Reutilizar un único `Image` en vez de `new Image()` por frame: sin
  diferencia medible — la creación de objetos no es el cuello de botella,
  el costo real es decodificar+pintar el SVG en sí (~16-24ms/frame para
  la escena más pesada a 1080x1080).

Con eso descartado, la única forma de eliminar el lag de raíz es quitar
la restricción de tiempo real — de ahí este script.

### Cómo funciona

Abre un navegador headless (Playwright) contra un dev server de Vite
levantado por el propio script, selecciona el experimento/aspecto/fondo
haciendo click en la UI real (los mismos elementos que usaría una
persona), y por cada frame:

```js
window.__lab.timeline.pause();
window.__lab.timeline.time(t, false); // seek exacto, sin suppressEvents — ver src/animations/README.md
await window.__lab.render.rasterizeSvgToCanvas(svg, ctx, settings); // mismo código que capture.ts
```

No hay presupuesto de tiempo por frame: si rasterizar tarda 5ms o 500ms,
el resultado es idéntico, porque cada frame se captura de forma
determinista y se guarda como PNG. Al final, `ffmpeg` codifica la
secuencia con ajustes que ninguna captura en vivo podría usar (`-preset
slow`, `-crf 15`) porque el tiempo de codificación ya no importa.
`mascot-adventure` completo (577 frames, 1080x1080) tardó
~95s en total — más lento que verlo en vivo, pero **577/577 frames
exactos**, confirmado con `ffprobe` (duración = frames/fps exacto, sin
huecos).

### Costos

- Suma `playwright` como dependencia de desarrollo, más una descarga de
  ~300MB de Chromium (`npx playwright install chromium`, una sola vez), y
  `@clack/prompts` (dependencia liviana, sin runtime propio más allá de
  ANSI/readline) para el menú interactivo de flechas + enter.
- Requiere `ffmpeg` instalado en el sistema (no empaquetado — se evaluó
  `ffmpeg-static`, que lo descarga automáticamente, pero se descartó por
  ahora: sumaría ~50-80MB a **todo** `npm install`, incluso para quien
  nunca use el renderer, cuando `ffmpeg` del sistema es un requisito
  común y de una sola instalación).
- Es una herramienta de línea de comandos, no un botón en el navegador —
  conviven ambas vías a propósito, ver más abajo.

## Exportación en vivo vs. renderizado offline

| | En vivo (`capture.ts`) | Offline (`scripts/render.mjs`) |
|---|---|---|
| Cuándo usar | Preview rápido, publicar ya | Clips largos/pesados, calidad final |
| Velocidad | Instantáneo (dura lo que dura el clip) | Más lento (frame por frame + encode) |
| Frames perdidos | Posible en clips pesados | Nunca — determinista |
| Calidad de encode | La que da `MediaRecorder` en tiempo real | Configurable, sin límite de tiempo (`-crf 15 -preset slow`) |
| Dependencias | Ninguna (solo el navegador) | `playwright` + `ffmpeg` del sistema |
