# Tequia Motion Lab

Laboratorio experimental de animación con JavaScript/TypeScript, enfocado en
animación SVG/DOM. El primer sujeto de experimentación será la mascota de
Tequia, cuyo SVG base se incorporará más adelante.

## Propósito

Este proyecto no es una app de producto: es un espacio para experimentar,
desarrollar y eventualmente producir animaciones, empezando por lo simple
(fade, transform, easing básico) hasta llegar a animaciones más compuestas
y orgánicas (morphing de paths, timelines complejas, secuencias de
expresión de la mascota). El objetivo final incluye poder exportar esas
animaciones a formatos aptos para redes sociales.

Áreas que este laboratorio cubrirá con el tiempo:

- Animación de SVG (transform, paths, morphing).
- Animación de elementos DOM.
- Motion design con JavaScript.
- Experimentos de interacción.
- Animaciones de branding.
- Eventualmente, generación de contenido audiovisual (video) para redes
  sociales.

**Estado actual: solo infraestructura.** No hay animaciones implementadas
todavía — ver [Próximos experimentos](#próximos-experimentos-roadmap).

## Stack

- **TypeScript** — tipado estático, especialmente útil con los tipos
  oficiales de GSAP.
- **Vite** — dev server con HMR y build de producción, configuración
  mínima.
- **GSAP** — motor de animación (DOM + SVG, timelines, morphing, scroll,
  motion path). 100% gratuito desde 2025, incluidos todos los plugins.
- **Biome** — lint + formato en una sola herramienta.
- **SVGO** (dev) — optimización de SVG, para preparar el asset de la
  mascota cuando llegue.
- **npm** — gestor de paquetes.

Sin frameworks de UI (React, Vue, etc.) por ahora. Ver
[`docs/dependencies.md`](docs/dependencies.md) para el razonamiento
completo de cada dependencia instalada y las descartadas.

## Estructura

```
src/
├── animations/     # (vacío) módulos de animación reutilizables, timelines, easings
├── components/     # (vacío) piezas DOM/animación reutilizables, sin framework
├── experiments/    # (vacío) un punto de entrada por experimento aislado
├── svg/
│   ├── mascot/      # aquí vivirá el SVG de la mascota Tequia (aún no incorporado)
│   └── utils/       # (vacío) helpers para parsear/consultar SVG
├── utils/          # (vacío) helpers genéricos (dom, math, timing)
├── styles/         # CSS global
└── main.ts         # entry point — smoke test, sin lógica de animación
```

La mascota (`src/svg/mascot/`) está deliberadamente desacoplada del
sistema de animación (`src/animations/`): el SVG no depende de código de
animación, y el código de animación solo se referirá a las partes del SVG
por selector (id/clase). Ver
[`src/svg/mascot/README.md`](src/svg/mascot/README.md).

## Cómo ejecutar

```bash
npm install       # instalar dependencias
npm run dev        # servidor de desarrollo con hot reload
npm run build       # build de producción (type-check + bundle)
npm run preview      # sirve el build de producción localmente
npm run lint        # revisa lint/formato con Biome
npm run format       # aplica formato con Biome
```

Verificado: `npm run build` compila sin errores y `npm run dev` sirve
correctamente `index.html` con HMR activo.

## Próximos experimentos (roadmap, no implementado)

Lista de experimentos previstos, en orden aproximado de complejidad. Nada
de esto está implementado todavía — es solo la hoja de ruta:

1. Cargar el SVG de la mascota en el DOM.
2. Animación de entrada (aparición inicial).
3. Animación idle (loop sutil de "estar viva").
4. Blink (parpadeo).
5. Bounce.
6. Cambio de expresiones (ojos/boca).
7. Animación de accesorios (`EXTRA`).
8. Morphing de partes (paths).
9. Timeline compuesta combinando varios de los anteriores.
10. Adaptaciones para formatos verticales de redes sociales.
11. Renderizado/exportación de animaciones.
12. Generación programática de video (candidato: Remotion, requerirá
    evaluar la introducción de React en un subsistema aislado).

## Convenciones para el SVG de la mascota

Cuando se incorpore el SVG base de Tequia, se espera que exponga sus
partes animables como grupos identificables independientes, por ejemplo:

```
<g id="HEAD">...</g>
<g id="EYES">...</g>
<g id="MOUTH">...</g>
<g id="EXTRA">...</g>
```

Esto permitirá animar cada parte por separado sin acoplar el asset al
código de animación. No se modificará ni rediseñará el SVG en esta etapa.
