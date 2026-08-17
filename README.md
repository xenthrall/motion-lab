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
  reutilizables sobre GSAP (entrada, idle, blink, bounce) que cualquier IA
  o persona puede componer para generar una animación nueva a partir de un
  prompt, sin reinventar la estructura. Ver
  [`src/animations/README.md`](src/animations/README.md).
- Un **primer experimento real** (`src/experiments/mascot-intro.ts`) que
  anima la mascota combinando esos moves, registrado en
  `src/experiments/registry.ts`.
- Un **lab interactivo** (`npm run dev`): selector de experimento y de
  formato/aspecto, reproducir/reiniciar en vivo en el navegador, y botón
  de **descargar video** en el formato elegido.
- **Exportación a video** (`src/export/`) con APIs nativas del navegador
  (canvas + `MediaRecorder`) — sin dependencias nuevas. Ver
  [`src/export/README.md`](src/export/README.md).

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
- **npm** — gestor de paquetes.

Exportación de video con `canvas` + `MediaRecorder` nativos del navegador
— ninguna dependencia nueva (Remotion sigue descartado por ahora, ver
`src/export/README.md`). Sin frameworks de UI (React, Vue, etc.). Ver
[`docs/dependencies.md`](docs/dependencies.md) para el razonamiento
completo de cada dependencia instalada y las descartadas.

## Estructura

```
src/
├── animations/
│   ├── moves/        # entrance, idleBreathing, blink, bounce (composables)
│   └── README.md      # convención para componer/agregar animaciones
├── components/       # stage.ts (escenario) y controls.ts (UI del lab), sin framework
├── experiments/      # mascot-intro.ts + registry.ts (lo que aparece en el selector)
├── export/           # aspect-presets, captura a video (MediaRecorder), descarga
├── svg/
│   ├── mascot/        # SVG de la mascota Tequia (versión de trabajo + referencia)
│   └── utils/         # query-mascot.ts, inline-svg.ts
├── utils/            # (vacío) helpers genéricos (dom, math, timing)
├── styles/           # CSS global
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

En `npm run dev`: elegí un experimento y un formato, reproducí para
verlo en vivo, y usá **"Descargar video"** para exportar exactamente lo
que se está reproduciendo en pantalla, en la resolución del formato
elegido.

**Verificado en un navegador real** (Chrome headless vía Playwright, no
solo compilación): la mascota se mueve de verdad durante la reproducción,
el selector de experimento/formato funciona, y el video exportado es un
MP4 H.264 válido (confirmado con `ffprobe`) con la resolución y duración
correctas.

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
9. Cambiar expresiones (variantes de EYES/MOUTH, ver `src/svg/mascot/README.md`).
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
