# Tequia mascot SVG

## Archivos

- `tequia-base.reference.svg` — copia verbatim de la referencia canónica
  compartida (con toda su documentación: sistema de coordenadas, paleta,
  receta para crear expresiones nuevas). **No se importa desde código.**
  Es solo documentación viva a la que volver cuando se necesite recordar,
  por ejemplo, las coordenadas de HEAD_POINTS o los acentos de color
  permitidos para accesorios.
- `tequia-base.svg` — versión de trabajo, expresión neutra. Visualmente
  **idéntica** a la referencia (mismos puntos, mismo gradiente, mismos
  colores). El único cambio es estructural: cada capa está envuelta en un
  `<g id="...">` para poder seleccionarla y animarla por separado. Esta es
  la que se importa desde código (`?raw` de Vite).

## Convención de grupos

```
<g id="MASCOT">           <!-- cuerpo completo: target para entrada/bounce/idle -->
  <g id="HEAD">...</g>    <!-- polígono + gradiente, no cambia entre expresiones -->
  <g id="EYES">...</g>
  <g id="MOUTH">...</g>
  <g id="EXTRA">...</g>   <!-- vacío en la versión base -->
</g>
```

## Cómo crear una variante/expresión nueva

Duplicar `tequia-base.svg`, mantener `HEAD` y el `<linearGradient>` tal
cual, y reemplazar el contenido de `EYES` / `MOUTH` / `EXTRA` siguiendo la
receta documentada en `tequia-base.reference.svg`.

## Nota para cuando haya varias instancias en la misma página

El `<linearGradient id="mascot-base-gradient">` usa un id fijo. Mientras
solo haya una mascota inline por página (caso actual) no hay problema. Si
en algún experimento futuro se necesitan varias instancias simultáneas
(p. ej. comparar expresiones lado a lado), habrá que namespacing ese id
para evitar colisiones — no resuelto todavía porque no hace falta aún.

## Desacoplamiento

El SVG no depende del código de animación (`src/animations/`), y el
código de animación solo debe referirse a estas partes por selector
(`#HEAD`, `#EYES`, `#MOUTH`, `#EXTRA`), nunca al revés. Esto mantiene el
asset intercambiable (nueva versión de la mascota, u otra mascota
distinta) sin tocar lógica de animación.

Nada de esto está animado todavía — solo se carga inline en `main.ts`
(`src/svg/utils/inline-svg.ts`) para confirmar que el asset renderiza
correctamente.
