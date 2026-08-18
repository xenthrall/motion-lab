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

- Un **kit de animación** (`src/animations/`) con dos mitades, que
  cualquier IA o persona puede componer para generar una animación nueva a
  partir de un prompt sin reinventar la estructura. Ver
  [`src/animations/README.md`](src/animations/README.md).
  - **Moves** (`moves/`) — animan a la mascota: entrada, idle, blink,
    bounce, tilt, lean, mirada, ojos bien abiertos, settle, **cambio de
    expresión** (forma real de ojos/boca, no solo transform), giro,
    tambaleo, **embestida/esquiva** con estirado, **anticipación**, y
    **accesorios** que se ponen y se quitan.
  - **Efectos** (`effects/`) — animan la escena alrededor: fogonazos,
    ondas expansivas, explosiones de partículas, líneas de velocidad y
    **sacudida de cámara**. Con aleatoriedad sembrada, para que un render
    salga idéntico cada vez.
- Dos **experimentos reales**, registrados en `src/experiments/registry.ts`:
  - `mascot-adventure` — **"La aventura del código"**, ~19s: un `{ }`
    aparece y lo examina, un bicho la asusta y lo persigue hasta
    aplastarlo, se le prende el foco con una idea (ojos de estrella),
    programa al ritmo de 0s y 1s, un café de más la marea, festeja con un
    check y un giro, y despega un cohete — con siete expresiones faciales
    distintas y ocho objetos hechos a mano (`src/experiments/mascot-adventure.ts`,
    guion completo documentado ahí).
  - `mascot-rescue` — **"Código Rojo"**, ~15.7s de cine de acción:
    producción se cae (sirena roja y un `500` que tapa el cuadro), la
    mascota entra en pánico, se pone las **gafas de héroe**, esquiva un
    `404` agachándose y un `null` saltando, contraataca girando mientras
    los bugs estallan, se enfrenta a un bug gigante y lo revienta con un
    fogonazo — confeti, `✓ DEPLOYED`, y se le caen las gafas encima del
    guiño final. Es el experimento que **usa todo el motor a la vez**:
    moves + efectos de escena + accesorios + capas de profundidad.
- Un **lab interactivo** (`npm run dev`) con layout de **panel
  administrativo**, responsive (probado en desktop y mobile) y con
  **tema claro/oscuro** (toggle manual, persistido, respeta la
  preferencia del sistema por defecto, sin flash del tema incorrecto al
  recargar):
  - **Sidebar** — galería de experimentos (tarjetas con ícono +
    descripción; seleccionar una la reproduce en bucle al instante) y el
    toggle de tema.
  - **Centro de pantalla** — solo la preview: el stage, una **línea de
    tiempo arrastrable** (duración calculada, tiempo actual) y los
    controles de transporte (reiniciar / play-pausa que **refleja el
    estado real** / **bucle activable-desactivable**).
  - **Toolbar compacto** sobre la preview — relación de aspecto y
    **fondo** son dos botones que abren un **popover** con las opciones
    (en vez de ocupar espacio fijo en pantalla), más el botón de
    descarga. Lo que se ve en el stage (aspecto + fondo) es exactamente
    lo que se exporta.
- **Fondos configurables** (`src/export/backgrounds.ts`) — lista plana y
  fácil de ampliar/reemplazar. De momento tres sólidos elegidos para
  contrastar bien con el violeta de la mascota (Medianoche, Crema,
  Esmeralda) más Transparente. El **formato de archivo se deriva
  automáticamente** del fondo elegido — ya no es una elección aparte:
  - Fondo sólido → **MP4**, listo para subir directo a redes sociales.
  - Fondo transparente → **WebM** con canal alfa real (verificado
    empíricamente), pensado como asset reutilizable (overlays, edición,
    composición web).

  La exportación en vivo (botón "Descargar" en la UI) usa únicamente
  `canvas` + `MediaRecorder` nativos del navegador — cero dependencias
  nuevas.
- **Renderizador offline determinista** — para cuando la exportación en
  vivo pierde frames en animaciones largas/pesadas. Reproduce el mismo
  timeline de GSAP en un navegador headless, pero pausado y avanzado
  frame por frame (sin presupuesto de tiempo real), y lo codifica con
  `ffmpeg`. Más lento que la exportación en vivo, pero **nunca pierde un
  frame** sin importar cuán compleja sea la animación — verificado con
  "La aventura del código" completa (577/577 frames exactos).
- **Gestión completa de renders desde la app** (backend propio,
  [`server/`](server/README.md)) — la barra lateral tiene una vista
  **Renders** donde se encola un render, se ve su **progreso en vivo**
  (etapa + frame actual, por SSE), se cancela a mitad de camino, y
  quedan los terminados en una **librería** con reproductor, descarga y
  borrado. El botón **"Render HD"** del toolbar encola directamente lo
  que estás viendo. Si el backend no está corriendo, la app sigue
  funcionando y el panel lo dice en vez de fallar.
- **CLI** (`npm run render`) — el mismo motor para un render suelto desde
  la terminal, con selección interactiva (flechas + enter) de lo que no
  se haya pasado por flag; con todas las flags (o `--yes`) no toca stdin,
  seguro para scripts/CI.

  Ver [`src/export/README.md`](src/export/README.md) para el detalle
  técnico de la transparencia, de cómo agregar un fondo nuevo, y de
  cuándo usar cada vía de exportación; y
  [`server/README.md`](server/README.md) para la cola, la API y por qué
  no se migró a Next.js.

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
  lab únicamente** (sidebar, toolbar, stage, controles, badges). No toca
  la animación de la mascota: eso lo sigue escribiendo GSAP directamente.
  Tema claro/oscuro con `@custom-variant dark` + tokens semánticos
  (`bg-surface`, `text-ink`, etc. — ver `src/styles/global.css`), así los
  componentes no repiten pares `dark:` en cada clase.
- **lucide-static** / **simple-icons** (dev) — iconos SVG puros (interfaz
  y logos de redes sociales respectivamente), importados con `?raw`, el
  mismo patrón que ya se usaba para el SVG de la mascota.
- **Playwright** (dev) — solo para el renderizador offline, no toca la
  app. Automatiza Chromium para reproducir el timeline frame por frame
  sin las restricciones de tiempo real de la exportación en vivo.
- **Hono** + **@hono/node-server** (dev) — el backend de renders
  (`server/`). Dos paquetes chicos, sin dependencias transitivas, para
  ~8 rutas HTTP + SSE.
- **TypeScript ejecutado directo por Node** — el backend y los scripts
  están en `.ts` y corren con `node server/main.ts`: Node 22.18+ borra
  los tipos por su cuenta, así que no hay bundler, ni `tsx`, ni paso de
  build para el servidor.
- **npm** — gestor de paquetes.

Exportación en vivo con `canvas` + `MediaRecorder` nativos del navegador
— cero dependencias nuevas ahí. Remotion se evaluó específicamente para
el renderizador offline y se descartó por requerir React sin necesidad
real. **Next.js se evaluó para el backend y también se descartó**: aporta
SSR/ruteo/React que una herramienta local de un solo usuario no necesita,
implicaría reescribir toda la UI que ya funciona, y no resuelve la parte
difícil (trabajos largos con progreso — sus route handlers son de
petición/respuesta, haría falta un worker aparte igual). Sin frameworks
de UI de aplicación (React, Vue, etc.) en el laboratorio en sí. Ver
[`docs/dependencies.md`](docs/dependencies.md) para el razonamiento
completo de cada dependencia instalada y las descartadas.

## Estructura

```
src/
├── animations/
│   ├── moves/        # animan a la mascota: entrance, idleBreathing, blink,
│   │                  # bounce, tilt, lean, eyesShift, widenEyes, settle,
│   │                  # setExpression, setAccessory, spin, wobble, dash,
│   │                  # anticipate (composables)
│   ├── effects/      # animan la escena: flash, shockwave, burst,
│   │                  # speedLines, cameraShake (+ PRNG sembrado)
│   └── README.md      # convención para componer/agregar animaciones
├── api/              # render-client.ts — cliente tipado de la API + suscripción SSE
├── components/       # UI del lab (Tailwind), sin framework:
│   │                  #   sidebar, experiment-gallery, toolbar, option-picker,
│   │                  #   popover, transport-controls, timeline-bar, status,
│   │                  #   theme, toggle-group, icons, stage, format-icons,
│   │                  #   experiment-icons, render-panel, render-card
├── experiments/      # mascot-adventure, mascot-rescue + registry.ts
├── export/           # aspect-presets, backgrounds, rasterize (compartido), captura en vivo, descarga
├── render/           # entry.ts — página headless que maneja el renderer (render.html)
├── shared/           # render-api.ts — contrato compartido navegador ↔ backend ↔ CLI
├── svg/
│   ├── mascot/        # SVG de la mascota + expressions.ts y accessories.ts
│   └── utils/         # query-mascot, inline-svg, scene-props, view-box
├── utils/            # (vacío) helpers genéricos (dom, math, timing)
├── styles/           # global.css — solo el import de Tailwind + tokens de tema
└── main.ts            # orquesta stage + controls + experimentos + export + panel de renders

server/               # backend de renders (TypeScript, ejecutado directo por Node)
├── main.ts            #   arranque y modos dev/prod
├── app.ts             #   rutas HTTP (Hono) + SSE + estáticos
├── queue.ts           #   cola de trabajos: crear, correr, cancelar, borrar
├── library.ts         #   renders/ + manifiesto library.json
├── render/            #   engine.ts (motor determinista), browser.ts, ffmpeg.ts
└── README.md          #   arquitectura, API y decisiones (incluida la de Next.js)

scripts/
├── dev.ts             # levanta Vite + API juntos (npm run dev)
└── render.ts          # CLI del renderizador offline (npm run render)

index.html             # la app
render.html            # página headless de render (segunda entrada del build)
```

La mascota (`src/svg/mascot/`) está deliberadamente desacoplada del
sistema de animación (`src/animations/`): el SVG no depende de código de
animación, y el código de animación solo se referirá a sus partes por
selector (`#HEAD`, `#EYES`, `#MOUTH`, `#EXTRA`, `#MASCOT`). Ver
[`src/svg/mascot/README.md`](src/svg/mascot/README.md).

## Cómo ejecutar

```bash
npm install                        # instalar dependencias
npx playwright install chromium    # una sola vez, para el renderizador offline

npm run dev        # lab + backend de renders juntos — abrir http://localhost:5173
npm run build       # build de producción (type-check de app y servidor + bundle)
npm start           # un solo proceso: sirve el build y la API — http://localhost:5174
npm run typecheck    # tsc sobre frontend y backend
npm run lint        # revisa lint/formato con Biome
npm run format       # aplica formato con Biome

# render offline desde la terminal (alternativa al panel de Renders de la app)
npm run render                     # interactivo: flechas + enter para elegir experimento/aspecto/fondo/fps
npm run render -- --list           # ver experimentos/aspectos/fondos disponibles
npm run render -- --experiment=mascot-adventure --aspect=vertical --background=midnight --fps=30 --yes
```

`npm run dev` levanta dos procesos (Vite en 5173, API en 5174) y los baja
juntos; Vite hace proxy de `/api`, así que el navegador ve un solo
origen. `npm run dev:app` levanta solo el frontend: la app funciona
igual, pero el panel de Renders avisa que la API no está disponible.

En `npm run dev`: elegí un experimento en la galería del sidebar (arranca
en bucle al instante), ajustá relación de aspecto/fondo desde los
popovers del toolbar, reproducí/pausá/arrastrá la línea de tiempo o
desactivá el bucle, y usá **"Descargar"** para exportar exactamente lo
que se está reproduciendo en pantalla — instantáneo, ideal para previews.
Si una animación larga/pesada se ve con lag en el video descargado, usá
**"Render HD"** (o la vista **Renders** del sidebar): encola un render
offline frame-perfecto, con progreso en vivo, y lo deja en una librería
donde podés reproducirlo, descargarlo o borrarlo (requiere `ffmpeg`
instalado en el sistema).

**Verificado en un navegador real** (Chrome headless vía Playwright, no
solo compilación): autoplay + bucle al seleccionar un experimento
(confirmado con el estado real del timeline de GSAP, no solo visualmente
— el bucle reinicia limpio en `time: 0` justo al llegar a la duración
total), desactivar el bucle sí detiene la reproducción al terminar,
play/pausa/reiniciar/scrub funcionan como un reproductor real (pausa y
reanuda desde la misma posición), los popovers de aspecto/formato abren
en el punto donde se hace click, cierran al seleccionar o al hacer click
afuera (mouse y touch), sidebar/toolbar/transporte se deshabilitan
correctamente durante una exportación en curso (evita el caso borde de
cambiar de experimento a mitad de una grabación) y se rehabilitan al
terminar, el tema claro/oscuro persiste entre recargas sin flash del
tema incorrecto, el layout no tiene overflow horizontal en mobile (390px)
y se ve correctamente en desktop, el MP4 exportado es H.264 válido
(confirmado con `ffprobe`), y el WebM transparente exportado se decodificó
de vuelta **en el propio navegador** para confirmar que el canal alfa es
real (esquina `[0,0,0,0]`, mascota opaca `alfa=255`) — no alcanza con
mirar el archivo, porque `ffmpeg` en línea de comandos no compone ese
canal alfa por defecto al extraer un frame (ver `src/export/README.md`).

`mascot-adventure` (19.23s reales, medidos con `timeline.duration()`) se
verificó con capturas en más de una docena de puntos a lo largo de toda
la historia (objeto por objeto, expresión por expresión) y con
reproducción en tiempo real completa. En el camino se encontraron y
corrigieron dos bugs reales:

- **Scrubbing a la cara equivocada:** saltar con `timeline.pause(segundos)`
  silencia los `tl.call()` de por medio (`suppressEvents` por defecto en
  GSAP), así que arrastrar la línea de tiempo rápido hacia el final podía
  "aterrizar" con la cara equivocada. Fix: `timeline.time(segundos,
  false)` (ver `src/animations/README.md`). Confirmado con el estado real
  del DOM y exportando el clip completo a MP4 (el frame final tiene la
  expresión feliz correcta).
- **La expresión no se reseteaba al reiniciar/loopear:** el bucle
  automático (y el botón Reiniciar) volvían a arrancar el clip todavía
  con la última cara del ciclo anterior (`mascot-adventure` volvía a
  empezar sonriendo en vez de neutra). Fix: `resetVisualState()` en
  `main.ts` ahora también restaura EYES/MOUTH a la expresión neutra antes
  de cualquier restart. Confirmado dejando correr un ciclo completo de
  19.23s + 2.5s del siguiente y verificando que la boca vuelve a ser la
  neutra, no la "happy" del cierre anterior.

**Renderizador offline**: antes de construirlo se investigaron
optimizaciones a la exportación en vivo — `createImageBitmap` para
rasterizar el SVG falló directamente (0 bytes de salida, confirmado que es
un problema del navegador/entorno y no de nuestro SVG probando con un
`<rect>` trivial, revertido antes de llegar a ningún lado), y las otras
dos alternativas medidas (Blob URL, reutilizar el `Image`) no mejoraron
nada — así que el fix real era eliminar la restricción de tiempo real, no
optimizarla. Se probó con `mascot-adventure` (la animación más pesada):
577/577 frames exactos (confirmado con `ffprobe`, sin huecos), y el fondo
transparente exportado por esta vía también se decodificó en el navegador
para confirmar canal alfa real, igual que la vía en vivo.

**Backend y panel de renders** — verificado ejercitando la API y la UI
reales, no solo compilando:

- Ciclo completo desde el navegador: encolar con "Render HD", ver el
  progreso avanzar (`Preparando el navegador…` → `Frame 26 / 111`),
  cancelar a mitad, encolar desde el formulario, esperar a que termine,
  reproducir el video en la tarjeta, y borrarlo — sin un solo error de
  consola.
- **Cola serializada**: con dos trabajos encolados, uno queda `running` y
  el otro `queued`, y arranca solo cuando el primero libera.
- **Cancelar cancela de verdad**: interrumpido en el frame 60 de 577, el
  trabajo queda `cancelled`, sin error, y **no deja archivo parcial** en
  `renders/`.
- **Persistencia**: la librería sobrevive al reinicio del proceso
  (`renders/library.json`), y borrar desde la UI elimina el registro y el
  archivo.
- **Streaming de video**: `Range` responde `206 Partial Content` (para
  que el `<video>` pueda buscar sin bajar todo) y `?download=1` fuerza
  `Content-Disposition: attachment`.
- **Transparencia también por esta vía**: el WebM se decodificó **en un
  navegador real** a través del proxy — esquina `[0,0,0,0]`, mascota
  opaca `[133,68,239,255]`.
- **Validación**: falta un campo → `400` con mensaje legible; fps fuera de
  rango → `400`; id de experimento inexistente → el trabajo queda
  `failed` con `Unknown experiment "no-existe". Available: ...`.
- **Sin backend corriendo** (solo Vite): la app funciona igual, "Descargar"
  (captura en vivo) sigue habilitado, y el panel muestra "API no
  disponible" con los botones de render deshabilitados y un tooltip que
  dice qué hacer.
- **Modo producción**: `npm start` (un solo proceso) sirve la app y
  renderiza **contra su propio build** — 145/145 frames de
  `mascot-curiosity` en 4:5 (experimento ya retirado). Esto es lo que el
  viejo hook dev-only no podía hacer.
- Tema claro/oscuro y layout mobile (390px, sin overflow horizontal)
  verificados también en la vista de Renders.

En consola del navegador, en modo dev, `window.__lab` expone `gsap`,
`stage` y el `timeline` actual para inspección — nada de eso existe en el
build de producción. El renderer **ya no depende de ese hook**: usa
`/render.html`, una entrada real del build con su propio contrato
(`src/shared/render-api.ts`).

## Próximos experimentos (roadmap)

Lo que ya existe está tachado; el resto sigue siendo hoja de ruta:

1. ~~Cargar el SVG de la mascota en el DOM.~~
2. ~~Animación de entrada.~~
3. ~~Animación idle.~~
4. ~~Blink.~~
5. ~~Bounce.~~
6. ~~Timeline compuesta combinando varios de los anteriores.~~
7. ~~Adaptaciones para formatos verticales de redes sociales.~~
8. ~~Renderizado/exportación de animaciones.~~
8b. ~~Reacción a un objeto/estímulo en escena (curiosidad).~~
8c. ~~Exportación con fondo transparente (asset reutilizable) y UI tipo
    reproductor de video (play/pausa real, línea de tiempo arrastrable).~~
8d. ~~UI tipo panel administrativo (sidebar + galería + popovers para
    formato), bucle activable/desactivable, tema claro/oscuro.~~
9. ~~Cambiar expresiones (variantes de forma de EYES/MOUTH, no solo
   transformarlos).~~ `setExpression` + `src/svg/mascot/expressions.ts`
   (7 expresiones), usado en `mascot-adventure`.
9b. ~~Animación larga con guion (~15s+), objetos hechos a mano y varias
    expresiones — `mascot-adventure`.~~
9c. ~~Fondos configurables (3 sólidos + transparente), escalables/
    reemplazables (`src/export/backgrounds.ts`); formato de archivo
    derivado automáticamente del fondo.~~
9d. ~~Renderizador offline determinista (`npm run render`) para
    animaciones largas/pesadas que pierden frames en la exportación en
    vivo — sin Remotion/React, con Playwright + ffmpeg.~~
9e. ~~CLI interactiva para el renderizador offline (flechas + enter vía
    `@clack/prompts`), con flags opcionales para uso scriptable/CI.~~
9f. ~~Backend propio (`server/`) y gestión completa de renders desde la
    app: encolar, progreso en vivo por SSE, cancelar, reproducir,
    descargar y borrar; librería persistente en `renders/`. Con página de
    render headless (`render.html`) en lugar del hook dev-only, así el
    modo producción también puede renderizar.~~
9g. ~~Capa de **efectos de escena** (`src/animations/effects/`): fogonazo,
    onda expansiva, partículas, líneas de velocidad y sacudida de cámara,
    con aleatoriedad sembrada; capas de profundidad (`upsertSceneLayer`).
    Estrenadas en `mascot-rescue`.~~
10. ~~Animación de accesorios (`EXTRA`).~~ `setAccessory` +
    `src/svg/mascot/accessories.ts` — las gafas de héroe de `mascot-rescue`
    entran cayendo y se caen solas al final.
11. Morphing de partes (paths) — candidato: `MorphSVGPlugin` de GSAP.
12. Animación basada en scroll — candidato: `ScrollTrigger` de GSAP.
13. Generación programática de video más allá de un solo clip (batch,
    variantes por formato) — la cola ya acepta varios trabajos seguidos y
    los corre en orden, así que batch sería encolar por combinación de
    experimento/aspecto/fondo, sin necesitar nada nuevo del motor.

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
