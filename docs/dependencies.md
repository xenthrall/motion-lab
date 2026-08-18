# Dependencias: análisis y decisiones

Este documento explica el razonamiento detrás de cada dependencia instalada,
y por qué se descartaron otras alternativas relevantes del ecosistema. El
objetivo es evitar convertir el laboratorio en una acumulación de librerías
redundantes.

## Instaladas

### `gsap` (runtime)

Motor de animación principal. Cubre, con un único paquete, la mayoría de
necesidades listadas para este laboratorio:

- Animación de DOM y de atributos/paths SVG.
- Timelines y secuenciación (`gsap.timeline()`).
- Transformaciones (x, y, rotate, scale, skew) con soporte nativo para SVG.
- **Morphing de paths** vía `MorphSVGPlugin`.
- Animación de trazo/dibujo de paths vía `DrawSVGPlugin`.
- Animación por scroll vía `ScrollTrigger`.
- Animación a lo largo de un path vía `MotionPathPlugin`.

**Por qué GSAP y no otra cosa:** desde abril de 2025, Webflow (dueño de
GreenSock) hizo **gratuito el 100% de GSAP, incluidos todos los plugins que
antes requerían membresía de pago (Club GreenSock)** — MorphSVG, DrawSVG,
SplitText, ScrollTrigger, etc. Esto elimina el motivo histórico para
combinarlo con otras librerías más pequeñas: un solo paquete, sin coste,
cubre animación DOM, SVG, morphing, scroll e interacción con una API madura,
bien documentada y ampliamente usada en producción (branding, sitios de
agencia, etc. — el caso de uso más cercano al de Tequia).

No requiere registro privado de npm ni token: se instala como cualquier
paquete público (`import MorphSVGPlugin from "gsap/MorphSVGPlugin"`).

- Solapamiento: sustituye por completo a anime.js, Motion y ScrollMagic/AOS
  para los fines de este proyecto (ver "Descartadas").
- Tamaño: el core es pequeño (~ 30-60 kB); los plugins se importan bajo
  demanda, solo se paga el coste de lo que realmente se usa.
- Madurez: 10+ años en producción, mantenimiento activo, ahora respaldado
  por Webflow.
- Producción: mismo motor sirve tanto para experimentos rápidos como para
  animaciones finales de branding.

### `vite` (dev)

Servidor de desarrollo y bundler. Elegido por:

- Arranque y HMR casi instantáneos (esbuild + módulos ESM nativos).
- Configuración mínima, soporte TypeScript de fábrica.
- Build de producción optimizado (Rollup) sin configuración adicional.
- Es el estándar de facto actual para proyectos frontend vanilla/TS que no
  necesitan un framework de aplicación completo (Next, Remix, etc.).

### `typescript` (dev)

Tipado estático. Relevante especialmente porque GSAP tiene tipos oficiales
robustos, lo que da autocompletado y seguridad al manipular timelines,
selectores SVG y propiedades de transformación — útil según las animaciones
crezcan en complejidad.

### `@types/node` (dev)

Tipos de Node para escribir configuración (`vite.config.ts`) y futuros
scripts de utilidad (p. ej. el pipeline de optimización de SVG) sin errores
de tipado al usar APIs de Node.

### `svgo` (dev)

Optimizador de SVG. Los SVG exportados desde herramientas de diseño
(Illustrator, Figma) suelen incluir metadata, IDs generados automáticamente,
grupos redundantes y atributos de editor que dificultan tanto el rendimiento
como la selección de partes individuales (`HEAD`, `EYES`, `MOUTH`, `EXTRA`).

Se instala ahora como parte de la **preparación** del pipeline de assets
(script `svg:optimize` ya definido en `package.json`), aunque **no se ha
usado todavía** porque aún no existe el SVG de la mascota. Es una
herramienta estándar, muy madura, sin runtime cost (solo se usa en tiempo de
build/preparación de assets, nunca se envía al navegador).

### `@biomejs/biome` (dev)

Lint + formato en una sola herramienta y un solo `biome.json`, en lugar de
combinar ESLint + Prettier (+ plugins de integración entre ambos). Se
prefirió por:

- Menor número de dependencias para lograr el mismo resultado.
- Configuración más simple.
- Rendimiento notablemente superior (escrito en Rust).
- Soporte nativo de TypeScript sin plugins adicionales.

### `tailwindcss` + `@tailwindcss/vite` (dev)

CSS utilitario para la **UI del lab** (el panel donde se previsualiza y
descarga — stage, pills de experimento/formato, botones, badge de estado).
Deliberadamente **no** se usa para nada relacionado con la animación de la
mascota: GSAP sigue escribiendo sus propios estilos inline en tiempo de
ejecución, y eso no cambia.

- `@tailwindcss/vite` es el plugin oficial de Tailwind v4 para Vite: cero
  configuración de PostCSS, cero `tailwind.config.js` con `content: []`
  manual — escanea el grafo de módulos de Vite directamente. Coincide con
  la prioridad de "configuración sencilla" del proyecto.
- Tokens de marca (`--color-brand*`) definidos una vez en
  `src/styles/global.css` vía `@theme`, tomados del propio gradiente de la
  mascota — así el acento de la UI queda ligado a la identidad visual sin
  hardcodear hex en cada componente.
- `global.css` quedó reducido a `@import "tailwindcss"` + esos tokens: el
  preflight de Tailwind ya cubre el reset que antes se escribía a mano.

**Dónde sigue habiendo CSS puro:** ninguno todavía más allá de las líneas
de tema — es intencional. Si en el futuro se necesita componer una
animación más compleja con `@keyframes` CSS (algo que GSAP no cubra bien,
p. ej. un efecto puramente decorativo de fondo), ese CSS iría en su propio
archivo dentro de la carpeta del experimento que lo use, nunca mezclado
con clases de Tailwind de la UI — mismo principio de separación que ya
regía animaciones (`src/animations/`) vs. UI (`src/components/`).

### `lucide-static` (dev) — iconos de interfaz

Paquete de iconos de trazo (line icons) como archivos `.svg` individuales,
importados con el mismo patrón `?raw` que ya se usaba para el SVG de la
mascota — cada icono usado se inlinea como string en el bundle, solo se
paga el peso de los que realmente se importan (tree-shaking real, no un
sprite completo).

- Se prefirió sobre el paquete `lucide` (con runtime `createIcons()`)
  porque no aporta nada aquí: no hay necesidad de reemplazo dinámico de
  iconos por atributo, y evita cualquier JS de runtime extra.
- Lucide es el sucesor activamente mantenido de Feather Icons, con un
  estilo de trazo neutro que combina bien con la paleta violeta de la
  mascota sin competir visualmente con ella.

### `simple-icons` (dev) — logos de redes sociales

Igual patrón (`?raw`, un archivo `.svg` por marca). Se usa para marcar
visualmente qué plataformas corresponden a cada preset de formato (p. ej.
Instagram junto a "1:1 · Feed", TikTok junto a "9:16 · Reels / Stories /
TikTok").

- Es la fuente canónica de logos de marca en el ecosistema npm: miles de
  marcas, un solo paquete, sin depender de assets sueltos de dudosa
  procedencia/licencia por cada red social.
- Deliberadamente separado de `lucide-static`: uno cubre iconografía
  genérica de interfaz (trazo, `currentColor`), el otro cubre logos de
  marca (forma sólida, identidad propia de cada red) — mezclarlos en un
  solo paquete no tendría sentido, son catálogos con propósitos distintos
  y ninguno cubre al otro.

## Descartadas (evaluadas, no instaladas)

### Motion (antes Framer Motion, paquete `motion`)

Muy buena API declarativa para animación DOM, especialmente en combinación
con React. Se descarta por ahora porque:

- Se solapa casi por completo con lo que ya cubre GSAP para DOM/SVG.
- Su soporte de morphing de paths SVG es más limitado que MorphSVGPlugin.
- Su mayor ventaja (integración declarativa con componentes React) no
  aplica todavía, porque este proyecto es vanilla TS.

**Revisar de nuevo si** en el futuro se introduce React (p. ej. para
Remotion) y se prefiere un modelo de animación declarativo por componente
en esa capa específica.

### anime.js

Librería ligera y capaz (la v4 mejoró notablemente su mantenimiento).
Se descarta porque es funcionalmente redundante con GSAP: ambas resuelven
timelines, easing y animación de propiedades DOM/SVG, y GSAP ya está en el
proyecto con más funcionalidad integrada (scroll, morphing, motion path).
Mantener las dos añadiría dos APIs distintas para el mismo problema sin
beneficio real.

### flubber

Librería especializada en interpolación entre paths SVG arbitrarios (sin
necesidad de que tengan el mismo número de puntos). Se descarta porque
`MorphSVGPlugin` de GSAP —ahora gratuito— resuelve el mismo problema con
mejor integración con el resto del motor de animación (timelines, easing
compartido, etc.).

**Revisar de nuevo si** aparece un caso de morphing muy específico donde
MorphSVGPlugin no dé buen resultado y flubber sí.

### ScrollMagic / AOS (animación por scroll)

ScrollMagic está prácticamente sin mantenimiento. AOS es muy limitado (solo
alterna clases CSS al hacer scroll, sin control fino de timeline).
`ScrollTrigger` (incluido en `gsap`, gratuito) es hoy el estándar de facto
para scroll-driven animation y ya cubre este caso.

### Remotion

Framework para renderizar animaciones a video frame-por-frame usando React
+ un navegador headless. Es la herramienta más alineada con la necesidad
futura de "generación de video para redes sociales", pero:

- Requiere React como dependencia central (Remotion **es** una capa sobre
  React), lo cual el alcance actual explícitamente evita justificar sin
  necesidad concreta.
- Implica un pipeline de renderizado (Chromium headless + ffmpeg) que no
  tiene sentido instalar antes de tener animaciones que exportar.

**Queda en el roadmap** como la herramienta candidata para exportación de
video, el día que se aborde esa etapa — probablemente como un subsistema
aislado (p. ej. `export/` o un paquete separado) que consuma los módulos de
`svg/` y `animations/`, sin forzar React en todo el laboratorio.

### PixiJS / Three.js (canvas / WebGL)

No hay necesidad actual de renderizado por canvas o WebGL: la mascota y los
experimentos son SVG/DOM. Añadir un motor de canvas ahora sería
especulativo. Se reconsiderará solo si:

- El rendimiento de animar SVG/DOM se vuelve un cuello de botella real
  (p. ej. muchas partículas simultáneas), o
- Se elige un pipeline de exportación de video basado en canvas en lugar de
  Remotion.

### React

No se incluye en esta etapa. La animación de un único SVG de mascota
mediante GSAP operando directamente sobre el DOM no necesita un modelo de
componentes; introducir React ahora añadiría complejidad de build y un
cambio de paradigma sin beneficio inmediato.

**Se reconsiderará** puntualmente cuando se aborde exportación de video con
Remotion — y, aun así, evaluando si conviene aislarlo solo a ese subsistema
en lugar de migrar todo el laboratorio.

### ESLint + Prettier

Descartados como combinación en favor de Biome, que cubre el mismo
resultado (lint + formato) con una sola dependencia y configuración más
simple. Ver sección "Instaladas".

### DaisyUI / componentes prearmados sobre Tailwind

Se evaluó pero se descartó: la UI del lab es pequeña y a medida (pills,
stage, badge de estado) — una librería de componentes añadiría una capa de
clases/convenciones propias encima de Tailwind sin ahorrar trabajo real
aquí. Reconsiderar solo si la UI crece mucho (formularios complejos,
modales, tablas).

### Heroicons / Feather / Font Awesome (iconos de interfaz)

Alternativas válidas a Lucide. Heroicons está más atado visualmente a
Tailwind UI/marca de Tailwind Labs; Feather está prácticamente congelado
(Lucide es su fork activamente mantenido, con más iconos); Font Awesome
implica un paquete mucho más pesado y, en su forma gratuita, muchos
iconos de trazo relevantes solo están en la versión de pago. Lucide gana
en mantenimiento activo + estilo neutro + tree-shaking real vía
`lucide-static`.

### Vitest / testing

No se añade todavía. Esta etapa es de experimentación visual, no de lógica
compleja verificable por tests unitarios. Se reconsiderará si aparecen
utilidades (`utils/`, math/easing helpers) con lógica no trivial que valga
la pena testear.

## Resumen de la decisión

Un solo motor de animación (`gsap`, gratuito y completo), herramientas de
desarrollo mínimas y estándar (`vite`, `typescript`, `biome`), una única
utilidad de preparación de assets (`svgo`), y para la UI del lab —
deliberadamente separada de la animación de la mascota— Tailwind v4 vía su
plugin de Vite más dos paquetes de iconos SVG puros (`lucide-static` para
interfaz, `simple-icons` para marcas), ambos consumidos con el mismo
patrón `?raw` que ya usaba el SVG de la mascota. Todo lo demás queda
documentado como decisión futura, no como deuda técnica.
