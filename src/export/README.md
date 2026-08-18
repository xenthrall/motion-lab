# Export — descarga a formatos de redes sociales

## Decisión: sin dependencias nuevas

`docs/dependencies.md` había descartado Remotion para esta etapa por
requerir React + un pipeline de renderizado (Chromium headless + ffmpeg).
Esta v1 de exportación no lo necesita: usa únicamente APIs nativas del
navegador.

- `capture.ts` — redibuja el SVG animado en vivo sobre un `<canvas>` cada
  frame (`requestAnimationFrame`), captura ese canvas como `MediaStream`
  (`canvas.captureStream`) y lo graba con `MediaRecorder`. Es una
  grabación en tiempo real (dura lo que dure la animación), no un
  renderizador determinista frame-por-frame — suficiente para clips
  cortos de la mascota.
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

## Cuándo reconsiderar Remotion (o ffmpeg.wasm)

- Si se necesita exportación **determinista** frame-por-frame (sin
  depender de que el navegador reproduzca en tiempo real).
- Si se necesita garantizar MP4 exacto sin depender del soporte del
  navegador (ffmpeg.wasm podría transcodificar WebM → MP4 en el cliente).
- Si el pipeline de producción final requiere renderizar fuera del
  navegador (batch, CI, server-side).

Hasta que alguno de esos casos sea concreto, esta v1 nativa es suficiente
y evita el coste de una dependencia pesada.
