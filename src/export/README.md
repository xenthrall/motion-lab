# Export — descarga a formatos de redes sociales

Dos formas de exportar, que conviven a propósito (ver
["Exportación en vivo vs. renderizado offline"](#exportación-en-vivo-vs-renderizado-offline)
más abajo para cuándo usar cada una):

- **En vivo, en el navegador** (`capture.ts`) — instantáneo, el botón
  "Descargar" de la UI. Cero dependencias nuevas.
- **Offline, determinista** — el mismo motor
  (`server/render/engine.ts`) con dos formas de invocarlo:
  - el **panel de Renders** de la app (botón "Render HD" o el formulario),
    que encola el trabajo en el backend y muestra el progreso en vivo;
  - la **CLI** `npm run render`, para un render suelto desde la terminal.

  Tarda más que la captura en vivo, pero nunca pierde un frame sin
  importar cuán pesada sea la animación.

La arquitectura del backend (cola, librería en disco, API) está en
[`server/README.md`](../../server/README.md).

## Exportación en vivo (`capture.ts`)

- `capture.ts` — redibuja el SVG animado en vivo sobre un `<canvas>` cada
  frame (`requestAnimationFrame`), captura ese canvas como `MediaStream`
  (`canvas.captureStream`) y lo graba con `MediaRecorder`. Es una
  grabación en tiempo real (dura lo que dure la animación), no un
  renderizador determinista frame-por-frame.
- `rasterize.ts` — la función que convierte el estado actual del SVG en
  píxeles sobre un canvas (letterboxed al tamaño destino). La comparte
  `capture.ts` (llamada en cada frame) **y** la página de render
  headless (`src/render/entry.ts`, que maneja el renderer offline) — una
  sola implementación para las dos vías de exportación, así lo que se
  descarga en vivo y lo que sale del render offline son los mismos
  píxeles.
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

## Renderizado offline

Dos formas de disparar el **mismo** motor (`server/render/engine.ts`):

### Desde la app (panel de Renders)

`npm run dev` levanta el lab y el backend juntos. En la barra lateral,
**Renders**:

- **"Render HD"** en el toolbar del laboratorio encola lo que estás
  viendo (experimento + aspecto + fondo actuales) y salta al panel.
- El formulario del panel permite elegir cualquier combinación y los fps.
- Los trabajos en curso muestran barra de progreso, frame actual y botón
  de cancelar; los terminados quedan en la librería con reproductor,
  descarga y borrado.

Ver [`server/README.md`](../../server/README.md) para la cola, la
persistencia y la API.

### Desde la terminal (CLI)

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
cuatro flags corre de punta a punta sin bloquear, y con solo
`--experiment` se detiene a preguntar exactamente lo que falta
(aspecto/fondo/fps) y muestra la confirmación al final.

La CLI levanta su propio dev server de Vite, así que funciona sin
`npm run dev` corriendo. A diferencia del panel, escribe siempre al mismo
nombre de archivo (`experimento-aspecto-fondo.mp4`): un comando suelto
re-ejecutado debería reemplazar su propia salida, no acumular copias. El
backend, en cambio, agrega un sufijo único porque ahí el objetivo es
justamente mantener una librería.

**Ojo:** los renders hechos por la CLI quedan en `renders/` pero **no
aparecen en el panel**, porque no se registran en `library.json` (ver
["Límite conocido"](../../server/README.md#límite-conocido-la-cli-no-entra-en-la-librería)).
Para renders que quieras administrar desde la app, usá el panel.

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

Playwright abre **`/render.html`** — una segunda entrada de Vite, sin
interfaz, que solo monta la mascota y expone `window.motionLabRender`
(ver `src/render/entry.ts`). Por cada frame:

```js
api.seek(t);              // timeline.time(t, false) — seek exacto, sin suppressEvents
await api.captureFrame(); // usa rasterizeSvgToCanvas, el mismo código que capture.ts
```

No hay presupuesto de tiempo por frame: si rasterizar tarda 5ms o 500ms,
el resultado es idéntico, porque cada frame se captura de forma
determinista. Los PNG se escriben **directo al stdin de `ffmpeg`**
(`-f image2pipe`), que codifica con ajustes que ninguna captura en vivo
podría usar (`-preset slow`, `-crf 15`) porque el tiempo de codificación
ya no importa. `mascot-adventure` completo (577 frames, 1080x1080) da
**577/577 frames exactos**, confirmado con `ffprobe` (duración =
frames/fps exacto, sin huecos).

Antes el renderer manejaba la app real por un hook dev-only
(`window.__lab`). La página aparte es mejor por tres razones: existe en
el build de producción (así `npm start` puede renderizar sin un dev
server), es un contrato estable en vez de un hook de depuración (la
interfaz de la app se puede refactorizar sin romper renders), y carga
más rápido en el navegador headless porque no hay UI que construir.
Escribir a `ffmpeg` por stdin, en vez de a un directorio temporal de
PNGs numerados, elimina el temporal (nada que limpiar si el proceso
muere), evita escribir y releer cientos de MB, y solapa la codificación
con la captura.

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
- Necesita un proceso Node corriendo (el backend, o la CLI que levanta el
  suyo) — no es algo que el navegador pueda hacer solo. Por eso conviven
  ambas vías a propósito, ver más abajo.

## Exportación en vivo vs. renderizado offline

| | En vivo (`capture.ts`) | Offline (motor + backend/CLI) |
|---|---|---|
| Cuándo usar | Preview rápido, publicar ya | Clips largos/pesados, calidad final |
| Velocidad | Instantáneo (dura lo que dura el clip) | Más lento (frame por frame + encode) |
| Frames perdidos | Posible en clips pesados | Nunca — determinista |
| Calidad de encode | La que da `MediaRecorder` en tiempo real | Configurable, sin límite de tiempo (`-crf 15 -preset slow`) |
| Dependencias | Ninguna (solo el navegador) | `playwright` + `ffmpeg` del sistema |
| Dónde queda | Descarga directa del navegador | Librería en `renders/`, gestionable desde la app |
