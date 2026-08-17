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
- `download.ts` — dispara la descarga del Blob resultante.

## Formato de salida

Se intenta MP4 primero (`MediaRecorder.isTypeSupported`) y se cae a WebM
si el navegador no lo soporta. Chrome/Edge recientes soportan MP4 nativo
en `MediaRecorder`; si no, WebM es ampliamente aceptado (la mayoría de
redes sociales re-codifican el video subido de todas formas).

## Cuándo reconsiderar Remotion (o ffmpeg.wasm)

- Si se necesita exportación **determinista** frame-por-frame (sin
  depender de que el navegador reproduzca en tiempo real).
- Si se necesita garantizar MP4 exacto sin depender del soporte del
  navegador (ffmpeg.wasm podría transcodificar WebM → MP4 en el cliente).
- Si el pipeline de producción final requiere renderizar fuera del
  navegador (batch, CI, server-side).

Hasta que alguno de esos casos sea concreto, esta v1 nativa es suficiente
y evita el coste de una dependencia pesada.
