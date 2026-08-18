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

### `playwright` (dev)

Automatiza un navegador Chromium real desde Node — usada exclusivamente
por el renderizador offline `server/render/engine.ts` (ver
`src/export/README.md`). No toca la app en sí (el bundle que ve el
usuario no la incluye, ni siquiera de forma tree-shakeable — es un
devDependency que solo corre en un script de Node).

- **Por qué hace falta ahora, no antes:** la exportación en vivo (tiempo
  real, en el navegador) empezó a mostrar lag real en animaciones largas
  (`mascot-adventure`). Se investigaron primero optimizaciones sin sumar
  dependencias — ninguna funcionó (ver detalle en
  `src/export/README.md`) — así que la única forma de eliminar el lag de
  raíz era quitar la restricción de tiempo real, lo que requiere driving
  el timeline desde fuera del navegador interactivo.
- **Por qué Playwright y no Puppeteer:** ambas son opciones maduras y
  equivalentes para este uso (automatizar Chromium). Playwright ya se
  usó extensivamente durante el desarrollo de este proyecto para testing
  manual (vía `playwright-core` en un scratchpad, nunca como dependencia
  real) — se conoce su comportamiento en este entorno específico
  (incluidos gotchas reales encontrados, como que `page.evaluate()`
  cuelga si el callback devuelve un objeto de GSAP con referencias
  circulares). Se usa el paquete completo `playwright` (no
  `playwright-core`) para que el script funcione en cualquier máquina
  sin depender de que el navegador correcto esté instalado en una ruta
  adivinable.
- **Por qué no Remotion:** Remotion resolvería el mismo problema, pero
  **es** una capa sobre React — segundo motivo (junto con el pipeline de
  renderizado) por el que se había descartado hasta ahora (ver
  "Descartadas" más abajo). `server/render/engine.ts` logra exactamente
  lo mismo (renderizado determinista frame-por-frame) reutilizando el
  100% del código de animación existente (GSAP + los propios
  experimentos), sin introducir React ni una capa de composición nueva.

### `hono` + `@hono/node-server` (dev)

El framework HTTP del backend de renders (`server/`, ver
[`server/README.md`](../server/README.md)). Dos paquetes chicos, sin
dependencias transitivas propias, con tipos de TypeScript de primera.

- **Por qué hacía falta un backend:** disparar un render offline desde el
  navegador, ver su progreso, y después descargarlo o borrarlo, requiere
  un proceso de larga vida con acceso al sistema de archivos: Playwright y
  `ffmpeg` no corren dentro de una pestaña. La alternativa (seguir usando
  solo la CLI) funcionaba, pero obligaba a saltar a la terminal para todo
  lo que no fuera previsualizar.
- **Por qué Hono y no Express/Fastify:** la API son ~8 rutas. Hono da
  ruteo tipado, SSE (`hono/streaming`) y servido de estáticos sin sumar
  el árbol de dependencias de Express ni el andamiaje de esquemas de
  Fastify. Además su API está basada en `Request`/`Response` estándar,
  que es lo mismo que usa el resto del código moderno del proyecto
  (`fetch` en el cliente), así que no hay dos modelos mentales.
- **Por qué no cero dependencias (`node:http` a mano):** se evaluó
  seriamente, porque el proyecto tiene la costumbre de no sumar paquetes
  por comodidad. Serían ~150 líneas propias de ruteo, parseo de JSON,
  SSE y servido de archivos con soporte de `Range` — código de
  infraestructura sin relación con animación, que habría que mantener y
  testear. Hono lo resuelve con dos paquetes minúsculos. Lo único que sí
  quedó escrito a mano es la ruta que sirve el video, porque necesitaba
  control fino de `Range` y de `Content-Disposition`.

### TypeScript ejecutado directo por Node (sin `tsx` ni `ts-node`)

No es una dependencia — es la ausencia de una, y vale documentarla. Node
22.18+ hace *type stripping* nativo, así que `server/` y `scripts/` están
escritos en TypeScript y se ejecutan con `node server/main.ts`, sin
bundler, sin loader y sin artefactos de build.

El costo es que solo se puede usar sintaxis *borrable*: nada de `enum`,
`namespace`, propiedades de parámetros ni decoradores, y los imports
relativos llevan la extensión `.ts` explícita. Eso está garantizado por
`tsconfig.server.json`, que activa `erasableSyntaxOnly` y
`verbatimModuleSyntax` — sin esas dos banderas, un error de tipos podría
convertirse en un error de ejecución. `npm run typecheck` revisa frontend
y backend por separado.

### `@clack/prompts` (dev)

CLI interactiva (flechas + enter, confirmaciones, spinners) para
`scripts/render.ts` — permite elegir experimento/aspecto/fondo/fps sin
tener que recordar ni escribir los ids de memoria en cada invocación.

- **Por qué esta y no otra:** es de la misma familia que ya se usa
  indirectamente vía `vite`/otras herramientas del ecosistema (mismo
  autor que `create-vite`), tipada en TypeScript, sin dependencias
  pesadas propias (`@clack/core`, `sisteransi`, utilidades de ancho de
  string para manejar emojis/ANSI correctamente). Cubre exactamente lo
  necesario — `select` (flechas), `confirm`, `spinner`, `intro`/`outro`
  — sin sumar un framework de CLI completo (comandos, subcomandos,
  parsing propio de flags) que no hace falta: los flags siguen
  parseándose a mano (`parseArgs` en el propio script, ya eran solo
  `--clave=valor`).
- **Diseño:** cada valor se toma de su flag si vino dado; si no, se
  pregunta. Solo se muestra una confirmación final si al menos un valor
  fue interactivo — un run con las cuatro flags (o `--yes`) nunca toca
  stdin, sigue siendo seguro invocarlo desde un script o CI (ver
  `src/export/README.md`).
- **No se usa en la app** (`src/`) en absoluto — vive solo en
  `scripts/render.ts`, un devDependency que no afecta el bundle de
  producción.

## Descartadas (evaluadas, no instaladas)

### Next.js (y frameworks de aplicación en general)

Evaluado explícitamente al construir el backend de renders, y descartado.
Es la decisión de arquitectura más importante de esa etapa, así que va el
razonamiento completo.

**Lo que Next.js aporta y este proyecto no usa:** renderizado en
servidor, React Server Components, ruteo por archivos, optimización de
imágenes, SEO, despliegue en edge/serverless. Esta herramienta es local y
de un solo usuario: se abre en `localhost`, no se indexa, no tiene
usuarios concurrentes ni rutas más allá de dos vistas, y su "contenido"
es un SVG animado por GSAP sobre el DOM. Ninguna de esas capacidades
tiene dónde aplicarse.

**Lo que costaría:** Next.js *es* React. Migrar significa reescribir los
~15 componentes de `src/components/` (sidebar, galería, toolbar,
popover, transporte, línea de tiempo, panel de renders) que hoy
funcionan, están documentados y no tienen deuda. Es trabajo grande con
cero ganancia funcional.

**Y el punto decisivo:** la parte difícil de esta función no es servir
HTML, es **ejecutar trabajos largos con progreso en vivo**. Un render de
`mascot-adventure` son ~577 frames y varios minutos de Playwright +
`ffmpeg`. Los route handlers de Next.js son de petición/respuesta y están
pensados para entornos serverless: para esto haría falta igual un proceso
worker aparte y un almacén de trabajos. Es decir, se pagaría el impuesto
de React **y** habría que construir la cola de todos modos. La cola es
justamente lo que se construyó (`server/queue.ts`, ~200 líneas), sobre un
proceso Node normal que ya puede tener a Chromium y a `ffmpeg` vivos.

**Revisar de nuevo si** el laboratorio deja de ser local y de un solo
usuario: varias personas renderizando contra un servidor compartido,
autenticación, o una UI que crezca hasta necesitar ruteo real y estado
compartido complejo. Nada de eso está sobre la mesa hoy.

### Redis / BullMQ / una base de datos para la cola

La cola vive en memoria y los trabajos terminados se espejan en
`renders/library.json`. Un job store persistente permitiría sobrevivir a
un reinicio a mitad de render, pero eso no significa nada acá: si el
proceso muere, el render a medias muere con él y hay que rehacerlo igual.
Sumar un servicio externo (o un archivo de base de datos) para no ganar
nada sería peso operativo puro.

**Reconsiderar si** aparecen renders programados/desatendidos que deban
sobrevivir al ciclo de vida del proceso.

### `tsx` / `ts-node` para el backend

Innecesarios: Node 22.18+ ejecuta TypeScript directamente (ver arriba).
Una dependencia menos y un paso de arranque menos.

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
+ un navegador headless. Se descartó desde el inicio del proyecto por
requerir React como dependencia central (Remotion **es** una capa sobre
React) — un costo que no se justificaba sin una necesidad concreta.

Esa necesidad concreta llegó (exportación determinista, sin lag, para
animaciones pesadas — ver `playwright` más arriba y
`src/export/README.md`), pero se resolvió **sin** Remotion: un motor de
~200 líneas (`server/render/engine.ts`) con Playwright + `ffmpeg` logra
el mismo renderizado frame-por-frame reutilizando directamente el código
de animación existente, y lo usan por igual la CLI y el backend. No hay
nada que Remotion aportara aquí que justificara sumar React — el
"pipeline de renderizado" que antes se mencionaba como motivo adicional
para descartarlo ya no aplica, se construyó y es liviano.

**Revisar de nuevo si** en algún momento se necesita algo que Remotion
resuelve y un script simple no: renderizado paralelo/distribuido,
composición de múltiples clips en un timeline de video más complejo, o
integración con un pipeline de CI para generar variantes en batch.

### `ffmpeg-static`

Empaqueta un binario de `ffmpeg` precompilado y lo descarga en el
`postinstall`, evitando que quien use el renderizador offline necesite
instalar `ffmpeg` por su cuenta. Se descartó por ahora: el binario agrega
~50-80MB a **todo** `npm install` del proyecto, para todo el mundo,
aunque nunca vayan a usar el renderer offline — un costo alto para un
requisito (`ffmpeg` en el sistema) que ya es común y de instalación
única. El script falla con un mensaje claro y accionable si no lo
encuentra en el PATH.

**Reconsiderar si** el renderer offline pasa a ser el camino principal de
exportación (no una herramienta ocasional) o si el equipo/CI no puede
garantizar `ffmpeg` preinstalado.

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

El motivo original para reconsiderarlo era "si se aborda exportación de
video con Remotion" — ya se abordó exportación de video determinista
(`server/render/engine.ts`), pero sin Remotion (ver esa sección más
abajo), así que ese disparador ya no aplica. Sigue sin haber necesidad
concreta de React en ningún punto del laboratorio.

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
patrón `?raw` que ya usaba el SVG de la mascota.

La exportación de video tiene tres capas, cada una con su propio
presupuesto de dependencias: la vía en vivo sigue en cero dependencias
nuevas (solo `canvas` + `MediaRecorder` del navegador); la vía offline
suma `playwright` — evaluada frente a la alternativa obvia (Remotion) y
preferida por no requerir React, reutilizando en cambio el código de
animación que ya existía; y la gestión de renders desde la interfaz suma
`hono` + `@hono/node-server`, evaluados frente a Next.js (descartado por
no aportar nada a una herramienta local de un solo usuario, y por no
resolver la parte difícil: los trabajos largos) y frente a escribir el
servidor con `node:http` a mano.

El backend no suma runtime de TypeScript: Node lo ejecuta directo. Todo
lo demás queda documentado como decisión futura, no como deuda técnica.
