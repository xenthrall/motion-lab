# Tequia Motion Lab

Laboratorio de animación con JavaScript/TypeScript, enfocado en animación
SVG/DOM. El sujeto de experimentación es la mascota de Tequia
(`src/svg/mascot/`).

## Propósito

Espacio para experimentar, desarrollar y producir animaciones, desde lo
simple (fade, transform, easing) hasta lo compuesto y orgánico (morphing,
timelines complejas, secuencias de expresión). Incluye exportar esas
animaciones a formatos aptos para redes sociales, directamente desde el
navegador.

## Estado actual

Ya hay una base funcional de punta a punta:

- Un **kit de animación** (`src/animations/`) — funciones "move"
  reutilizables sobre GSAP (entrada, idle, blink, bounce, tilt, lean,
  mirada, ojos bien abiertos, settle) que cualquier IA o persona puede
  componer para generar una animación nueva a partir de un prompt, sin
  reinventar la estructura. Ver
  [`src/animations/README.md`](src/animations/README.md).
- Dos **experimentos reales**, registrados en `src/experiments/registry.ts`:
  - `mascot-intro` — entrada + idle + blink + bounce.
  - `mascot-curiosity` — la mascota respira, nota un objeto que aparece en
    escena, reacciona con curiosidad (ojos bien abiertos, mirada, cabeza
    inclinada, se acerca, rebotitos), parpadea y vuelve a neutro. El
    objeto es una prop de escena genérica (`src/svg/utils/scene-props.ts`),
    no parte del SVG de la mascota.
- Un **lab interactivo** (`npm run dev`), con UI en Tailwind y responsive
  (probado en desktop y mobile), que funciona casi como un reproductor de
  video: selector de experimento y de relación de aspecto (con iconos,
  incluyendo el logo de la red social a la que corresponde cada formato),
  **línea de tiempo arrastrable** con duración calculada y tiempo actual,
  botón de play que **refleja si está reproduciendo o en pausa** (icono +
  texto), reiniciar, y **descargar** en el formato de archivo elegido, con
  feedback de estado (badge con spinner mientras graba, éxito/error).
- **Exportación a dos formatos de archivo** (`src/export/`), con APIs
  nativas del navegador (canvas + `MediaRecorder`) — sin dependencias
  nuevas:
  - **MP4** — fondo sólido, para subir directo a redes sociales.
  - **WebM transparente** — sin fondo (canal alfa real, verificado
    empíricamente), pensado como asset reutilizable (overlays, edición,
    composición web).
  
  Ver [`src/export/README.md`](src/export/README.md) para el detalle
  técnico de cómo se logra la transparencia sin ninguna dependencia nueva.

Sigue habiendo mucho roadmap por delante (expresiones, morphing,
timelines más orgánicas) — ver [Próximos experimentos](#próximos-experimentos-roadmap).

## Stack

- **TypeScript** — tipado estático, especialmente útil con los tipos
  oficiales de GSAP.
- **Vite** — dev server con HMR y build de producción, configuración
  mínima.
- **GSAP** — motor de animación (DOM + SVG, timelines, morphing, scroll,
  motion path). 100% gratuito desde 2025, incluidos todos los plugins.
- **Biome** — lint + formato en una sola herramienta.
- **SVGO** (dev) — optimización de SVG para el pipeline de assets.
- **Tailwind CSS v4** (vía `@tailwindcss/vite`) — estilos de la **UI del
  lab únicamente** (stage, pills, botones, badge de estado). No toca la
  animación de la mascota: eso lo sigue escribiendo GSAP directamente.
- **lucide-static** / **simple-icons** (dev) — iconos SVG puros (interfaz
  y logos de redes sociales respectivamente), importados con `?raw`, el
  mismo patrón que ya se usaba para el SVG de la mascota.
- **npm** — gestor de paquetes.

Exportación de video con `canvas` + `MediaRecorder` nativos del navegador
— ninguna dependencia nueva (Remotion sigue descartado por ahora, ver
`src/export/README.md`). Sin frameworks de UI de aplicación (React, Vue,
etc.). Ver [`docs/dependencies.md`](docs/dependencies.md) para el
razonamiento completo de cada dependencia instalada y las descartadas.

## Estructura

```
src/
├── animations/
│   ├── moves/        # entrance, idleBreathing, blink, bounce, tilt, lean,
│   │                  # eyesShift, widenEyes, settle (composables)
│   └── README.md      # convención para componer/agregar animaciones
├── components/       # stage, controls, timeline-bar, status, icons — UI del lab (Tailwind), sin framework
├── experiments/      # mascot-intro.ts, mascot-curiosity.ts + registry.ts
├── export/           # aspect-presets, file-formats, captura a video (MediaRecorder), descarga
├── svg/
│   ├── mascot/        # SVG de la mascota Tequia (versión de trabajo + referencia)
│   └── utils/         # query-mascot.ts, inline-svg.ts, scene-props.ts
├── utils/            # (vacío) helpers genéricos (dom, math, timing)
├── styles/           # global.css — solo el import de Tailwind + tokens de tema
└── main.ts            # orquesta stage + controls + experimentos + export
```

La mascota (`src/svg/mascot/`) está deliberadamente desacoplada del
sistema de animación (`src/animations/`): el SVG no depende de código de
animación, y el código de animación solo se referirá a sus partes por
selector (`#HEAD`, `#EYES`, `#MOUTH`, `#EXTRA`, `#MASCOT`). Ver
[`src/svg/mascot/README.md`](src/svg/mascot/README.md).

## Cómo ejecutar

```bash
npm install       # instalar dependencias
npm run dev        # lab interactivo con hot reload — abrir la URL que imprime Vite
npm run build       # build de producción (type-check + bundle)
npm run preview      # sirve el build de producción localmente
npm run lint        # revisa lint/formato con Biome
npm run format       # aplica formato con Biome
```

En `npm run dev`: elegí un experimento, una relación de aspecto y un
formato de archivo, reproducí/pausá/arrastrá la línea de tiempo para
verlo en vivo, y usá **"Descargar video"** para exportar exactamente lo
que se está reproduciendo en pantalla, en la resolución y formato
elegidos.

**Verificado en un navegador real** (Chrome headless vía Playwright, no
solo compilación): la mascota se mueve de verdad durante la reproducción,
play/pausa/reiniciar/scrub funcionan como en un reproductor de video real
(pausa y reanuda desde la misma posición, no reinicia; arrastrar la línea
de tiempo salta a ese punto), el layout no tiene overflow horizontal en
mobile (390px) y se ve correctamente en desktop, el MP4 exportado es
H.264 válido (confirmado con `ffprobe`), y el WebM transparente exportado
se decodificó de vuelta **en el propio navegador** para confirmar que el
canal alfa es real (esquina `[0,0,0,0]`, mascota opaca `alfa=255`) — no
alcanza con mirar el archivo, porque `ffmpeg` en línea de comandos no
compone ese canal alfa por defecto al extraer un frame (ver
`src/export/README.md`).

En consola del navegador, en modo dev, `window.__lab` expone `gsap`,
`stage` y el `timeline` actual para inspección manual (no existe en el
build de producción).

## Próximos experimentos (roadmap)

Lo que ya existe está tachado; el resto sigue siendo hoja de ruta:

1. ~~Cargar el SVG de la mascota en el DOM.~~
2. ~~Animación de entrada.~~
3. ~~Animación idle.~~
4. ~~Blink.~~
5. ~~Bounce.~~
6. ~~Timeline compuesta combinando varios de los anteriores.~~ (`mascot-intro`)
7. ~~Adaptaciones para formatos verticales de redes sociales.~~
8. ~~Renderizado/exportación de animaciones.~~
8b. ~~Reacción a un objeto/estímulo en escena (curiosidad).~~ (`mascot-curiosity`)
8c. ~~Exportación con fondo transparente (asset reutilizable) y UI tipo
    reproductor de video (play/pausa real, línea de tiempo arrastrable).~~
9. Cambiar expresiones (variantes de forma de EYES/MOUTH, no solo
   transformarlos — ver `src/svg/mascot/README.md`).
10. Animación de accesorios (`EXTRA`).
11. Morphing de partes (paths) — candidato: `MorphSVGPlugin` de GSAP.
12. Animación basada en scroll — candidato: `ScrollTrigger` de GSAP.
13. Generación programática de video más allá de un solo clip (batch,
    variantes por formato) — candidato: Remotion, si el navegador deja
    de ser suficiente (ver `src/export/README.md`).

## Convención del SVG de la mascota

Cada capa de la mascota es un grupo identificable, envuelto a su vez en
un grupo de cuerpo completo:

```
<g id="MASCOT">
  <g id="HEAD">...</g>
  <g id="EYES">...</g>
  <g id="MOUTH">...</g>
  <g id="EXTRA">...</g>
</g>
```

Esto permite animar cada parte por separado, o el cuerpo completo
(`#MASCOT`), sin acoplar el asset al código de animación. Detalle completo
en [`src/svg/mascot/README.md`](src/svg/mascot/README.md).
