# Kit de animación — cómo componer una animación nueva

Este documento es la convención que permite a cualquier IA (o persona)
generar una animación nueva a partir de un prompt sin reinventar la
estructura cada vez.

## Concepto: "moves"

Cada archivo en `moves/` exporta una función pura con esta firma:

```ts
(parts: MascotParts, options?: MoveOptions) => gsap.core.Timeline
```

- Recibe las partes tipadas de la mascota (`src/svg/utils/query-mascot.ts`):
  `parts.mascot` (cuerpo completo), `parts.head`, `parts.eyes`,
  `parts.mouth`, `parts.extra`.
- Devuelve un `gsap.timeline()` **sin reproducirse por sí solo en la
  práctica**: quien lo usa siempre lo añade sincrónicamente a un timeline
  padre (`tl.add(move(parts))`) antes de que GSAP tenga oportunidad de
  reproducirlo de forma independiente en el siguiente tick.
- No monta SVG, no toca el DOM fuera de esos grupos, no sabe nada de la
  página, del stage ni de la exportación.

> ⚠️ **Gotcha de GSAP encontrado en la práctica:** un timeline anidado
> creado con `{ paused: true }` aporta **duración cero** al timeline
> padre cuando se hace `parent.add(child)` — el padre literalmente no lo
> cuenta (confirmado con una prueba mínima). Por eso los moves NO se
> crean pausados. El timeline de nivel superior de un experimento
> (`src/experiments/*.ts`), que nunca se anida en otro, sí puede y debe
> crearse con `{ paused: true }` — eso es lo que le permite a la UI
> controlar cuándo arranca.

## Moves disponibles

| Move | Target | Qué hace |
|---|---|---|
| `entrance(parts, { duration })` | `mascot` | scale+fade de aparición |
| `idleBreathing(parts, { repeat, duration, amount })` | `mascot` | loop sutil de escala ("está viva") |
| `blink(parts, { times, duration, gap })` | `eyes` | parpadeo (squash vertical) |
| `bounce(parts, { height, duration })` | `mascot` | salto con squash/stretch |
| `tilt(parts, { angle, duration })` | `mascot` | inclinación de cabeza (cuerpo completo), gesto de curiosidad |
| `lean(parts, { x, y, duration })` | `mascot` | se acerca/inclina hacia un punto de la escena |
| `eyesShift(parts, { x, y, duration })` | `eyes` | desplaza la mirada en una dirección |
| `widenEyes(parts, { scale, duration })` | `eyes` | ojos bien abiertos (sorpresa/curiosidad) |
| `settle(parts, { duration })` | `mascot` + `eyes` | vuelve a la postura neutra (posición, rotación, escala) |
| `setExpression(parts, shapes, { pop, duration })` | `eyes` + `mouth` | cambia la **forma** (no solo transform) — ver más abajo |
| `spin(parts, { rotations, duration })` | `mascot` | giro completo de cuerpo entero (rotación relativa `+=360°`) |
| `wobble(parts, { cycles, duration, angle })` | `mascot` | tambaleo nervioso/mareado, repetido |
| `dash(parts, { x, y, duration, stretch, returnBack })` | `mascot` | embestida/esquiva rápida, con estirado en el eje del movimiento |
| `anticipate(parts, { squash, duration })` | `mascot` | agacharse antes de actuar (deja la pose comprimida) |
| `setAccessory(parts, accessory, { drop })` | `extra` | pone/quita algo puesto (gafas, etc.) — ver más abajo |

`tilt`/`lean` animan `parts.mascot` (no `parts.head`) a propósito: HEAD,
EYES y MOUTH son grupos hermanos, no anidados — rotar/mover solo HEAD los
desalinearía. Cualquier gesto de "cuerpo completo" (inclinar, acercarse,
saltar) siempre debe animar `parts.mascot`.

## Cambiar la forma de ojos/boca (expresiones)

`setExpression` no anima una forma existente, la **reemplaza** — usa los
presets de `src/svg/mascot/expressions.ts` (`neutral`, `surprised`,
`happy`, `starstruck`, `dizzy`, `determined`, `wink`, `angry`, `panic`):

```ts
tl.add(setExpression(parts, expressions.starstruck), "<");
```

Es un corte instantáneo (con un pequeño "pop" de énfasis en los ojos),
no un morph — es intencional, un cambio de expresión súbito es un
recurso cómico de toda la vida en animación, no algo que haya que
disimular. Agregar una expresión nueva: sumar una entrada a
`expressions.ts` con las mismas coordenadas que usa `tequia-base.svg`
(ojos ~y=67-89, boca ~y=99-113, centro x=90) — no a un move.

> ⚠️ **Gotcha de GSAP encontrado en la práctica:** `timeline.pause(segundos)`
> usa `suppressEvents: true` por defecto, lo que **silencia** cualquier
> `tl.call()` (como `setExpression`) que quede entre la posición vieja y
> la nueva al saltar — el resultado visual es que un scrub grande puede
> "aterrizar" con la cara equivocada (se ve la última expresión que sí
> llegó a dispararse, no la que correspondía a ese punto). Confirmado
> comparando reproducción en tiempo real (correcta) contra saltos con
> `pause(t)` (incorrectos) en `mascot-adventure`, que es la primera
> animación con suficientes cambios de expresión para notarlo. El fix:
> para **seekear** (no solo pausar en el lugar actual), usar
> `timeline.pause(); timeline.time(segundos, false);` — el segundo
> argumento `false` de `.time()` desactiva el `suppressEvents`. Ya
> aplicado en el scrubber de `main.ts`.

> ⚠️ **Otro gotcha relacionado — expresión que no se resetea al
> reiniciar/loopear:** `setExpression` muta `innerHTML` directamente; a
> diferencia de un transform, GSAP no tiene forma de "rebobinar" eso solo
> reproduciendo el timeline desde 0. Si un experimento cambia de expresión
> y después se reinicia (botón Reiniciar, exportar, o el bucle
> automático completando un ciclo), sin nada adicional arrancaría el
> nuevo ciclo mostrando la ÚLTIMA cara con la que terminó el anterior
> (`mascot-adventure` reiniciaba visiblemente sonriendo). El fix vive en
> `main.ts`, no en el kit: `resetVisualState()` restaura EYES/MOUTH a
> `expressions.neutral` además de limpiar transforms, y se llama antes de
> **cualquier** `timeline.restart()` (manual, por loop, o al arrancar un
> experimento nuevo) — no hace falta que un experimento se preocupe por
> esto al componerse, ya está cubierto centralizadamente.

`anticipate` deja la mascota **comprimida a propósito** — es una pose de
espera, no un gesto cerrado. Lo que venga después (`dash`, `bounce`,
`spin`, o un `to` que devuelva `scaleX/scaleY` a 1) es lo que la suelta.
Si se compone sola, la mascota se queda agachada.

## Ponerle cosas encima (accesorios en `#EXTRA`)

`setAccessory` es el hermano de `setExpression` para el grupo `#EXTRA`:
reemplaza su markup con un preset de `src/svg/mascot/accessories.ts`
(`none`, `shades`), opcionalmente dejándolo caer desde arriba:

```ts
tl.add(setAccessory(parts, accessories.shades), "<");
tl.add(setAccessory(parts, accessories.none, { drop: false }), "+=2");
```

`#EXTRA` es el último hijo de `#MASCOT`, así que dibuja **sobre** la cara
— es el sitio para gafas, gorros o insignias, y no para algo que deba
quedar detrás (eso va en una capa de escena).

> ⚠️ Mismo gotcha que las expresiones: `setAccessory` muta `innerHTML`, y
> GSAP no puede rebobinar eso. Sin ayuda, un experimento que termina con
> gafas puestas volvería a arrancar con gafas. Ya está cubierto
> centralizadamente — `resetVisualState()` en `main.ts` (y su gemelo en
> `src/render/entry.ts`, para el renderer offline) vacía `#EXTRA` además de
> restaurar EYES/MOUTH antes de cualquier restart. Verificado dejando
> loopear `mascot-rescue`: al reiniciar, `#EXTRA` queda vacío.

## Efectos de escena (`effects/`)

Un **move** anima a la mascota; un **efecto** anima *la escena alrededor*.
Viven en `src/animations/effects/` y tienen su propia firma:
`(layer, options) => gsap.core.Timeline`, donde `layer` es una capa creada
con `upsertSceneLayer` (ver abajo).

| Efecto | Qué hace |
|---|---|
| `flash(layer, { color, opacity, duration, hold })` | fogonazo a cuadro completo (impacto, sirena) |
| `shockwave(layer, { x, y, to, rings, color })` | anillo(s) que se expanden desde un punto |
| `burst(layer, { x, y, count, distance, gravity, spread, angle, colors })` | explosión de partículas / confeti |
| `speedLines(layer, { count, direction, opacity, coverage })` | rayas horizontales de velocidad |
| `cameraShake(targets, { intensity, cycles, duration })` | sacude lo que se le pase, como una cámara golpeada |

Reglas propias de los efectos (el detalle completo, en
`effects/index.ts`):

- Crean sus formas **al construirse el timeline**, no mientras se
  reproduce, y las dejan invisibles. Crear elementos en pleno playback
  haría que un scrub cayera en un frame que nunca existió.
- Todos sus `fromTo` llevan **`immediateRender: false`**. GSAP aplica los
  valores "from" al *crear* el tween, no al reproducirlo: sin esa bandera,
  construir el experimento pinta todas las partículas sobre el frame 0.
  Se encontró exactamente así — el primer render de `mascot-rescue` tenía
  cuadraditos pegados en la cara durante todo el clip.
- La aleatoriedad va **sembrada** (`createRandom`), para que un render sea
  reproducible: todo el renderer offline de este lab existe para ser
  determinista, y `Math.random()` lo rompería.
- `cameraShake` es el único que no recibe una capa sino targets sueltos,
  porque justamente tiene que mover **todo a la vez** (capas + mascota) con
  los mismos offsets. Ojo: anima `x`/`y`, así que no conviene solaparlo con
  un move que esté moviendo la mascota en ese instante (`lean`, `dash`) —
  se pisarían.

## Reaccionar a algo en la escena (objetos de utilería)

Cuando una animación necesita que la mascota reaccione a **algo que no es
parte de ella** (un objeto, una notificación, un ícono), ese "algo" no va
en el SVG de la mascota ni en un move — se crea como una prop de escena
genérica con `src/svg/utils/scene-props.ts`:

```ts
const object = upsertSceneProp(parts.root, "algun-id-estable", "circle", {
  cx: "152", cy: "18", r: "6", fill: "#facc15", opacity: "0",
});
tl.to(object, { opacity: 1, duration: 0.3 }, "+=0.15");
```

Para un objeto compuesto por varias formas (un bicho con patas, un
cohete con aletas), usar `upsertSceneGroup(root, id, innerSvgMarkup)` en
vez de `upsertSceneProp` — mismo comportamiento idempotente, pero crea un
`<g>` con markup arbitrario en vez de un único elemento con atributos.

Para una escena con varios objetos —y sobre todo si va a haber efectos—
conviene `upsertSceneLayer(root, id, { behind })` en vez de props sueltas:
devuelve un `<g>` vacío al que se le van agregando formas con
`appendSceneShape(layer, markup)`. Dos motivos:

- **Profundidad:** con `behind: true` la capa se inserta *antes* de
  `#MASCOT`, así que dibuja detrás de ella. Sin eso, todo lo que se agrega
  al root queda por delante. Un experimento típico usa dos capas: fondo
  (sirena, tinte) y frente (proyectiles, explosiones).
- **Movimientos de cámara:** con todo dentro de una capa, un solo tween
  sobre la capa mueve la escena entera sin pelearse con los tweens de cada
  prop (cada uno anima su propio transform).

`upsertSceneProp`/`upsertSceneGroup`/`upsertSceneLayer` son idempotentes
(si ya existe una prop con ese id, la reemplazan) y quedan marcadas con
`data-scene-prop` para que `clearSceneProps(root)` pueda limpiarlas al
cambiar de experimento — eso ya lo hace `main.ts` en `setExperiment()`,
no hace falta repetirlo por experimento. Ver `src/experiments/mascot-adventure.ts` (varios objetos compuestos) y
`src/experiments/mascot-rescue.ts` (dos capas + efectos + accesorios +
entradas fuera de cuadro, el más completo) como ejemplos, ambos con su
guion documentado en el archivo.

## El cuadro no es fijo

El `viewBox` del SVG **cambia con la relación de aspecto elegida** (ver
`getAspectViewBox` en `src/export/aspect-presets.ts`): 160x160 en 1:1,
160x284 en 9:16, 231x130 en 16:9. Siempre contiene la caja base de la
mascota (centrada en 90,65) y crece hacia afuera, así que sus coordenadas
—ojos en y≈67-89, boca en y≈99-113— no cambian nunca.

Lo que sí cambia es dónde están los **bordes**. Cualquier cosa que tenga
que entrar o salir de cuadro debe preguntarlos, no escribirlos a mano:

```ts
import { frameEdges } from "@/svg/utils/view-box";

const frame = frameEdges(parts.root);
gsap.set(proyectil, { x: frame.right + 34, y: 72 });   // fuera de cuadro, a la derecha
tl.to(proyectil, { x: frame.left - 34, duration: 0.6 });
```

Con un número fijo (`x: 200`), en 16:9 el proyectil arrancaría **ya
visible** dentro del cuadro, y en 9:16 saldría mucho antes de llegar al
borde. Los efectos ya lo hacen solos (`flash` cubre el cuadro real,
`speedLines` lo cruza entero).

> El timeline se reconstruye al cambiar de formato, justamente para que
> estas medidas se recalculen — lo hace `main.ts` en `onAspectChange`, y
> la página de render fija el `viewBox` antes de construir el timeline.

## Componer una animación (un "experimento")

Un experimento (`src/experiments/*.ts`) combina moves en un timeline
padre usando el propio sistema de posicionamiento de GSAP — no hace falta
una capa de composición propia:

```ts
const tl = gsap.timeline({ paused: true });
tl.add(entrance(parts));
tl.add(idleBreathing(parts, { repeat: 2 }), ">");   // después del anterior
tl.add(blink(parts, { times: 2 }), "+=0.4");         // 0.4s después de eso
tl.add(bounce(parts), "+=0.2");
```

Cada experimento se registra en `src/experiments/registry.ts` para que
aparezca automáticamente en el selector del lab (`npm run dev`).

## Cómo agregar un efecto nuevo

1. Crear `src/animations/effects/nombre.ts` con la firma
   `(layer, options) => gsap.core.Timeline`, sin pausar.
2. Crear las formas al construir (con `svgNode`), dejarlas invisibles, y
   animarlas con `fromTo(..., { immediateRender: false })`.
3. Usar `createRandom(seed)` para cualquier aleatoriedad.
4. No tocar nunca la mascota — para eso están los moves.
5. Exportarlo desde `effects/index.ts`.

## Cómo agregar un move nuevo

1. Crear `src/animations/moves/nombre.ts` con la misma firma (recibe
   `parts` + `options` opcionales, devuelve `gsap.timeline()` sin pausar —
   ver el aviso sobre timelines anidados pausados, arriba).
2. Animar solo `parts.head` / `eyes` / `mouth` / `extra` / `mascot` —
   nunca hacer `querySelector` manual sobre el DOM.
3. `transformOrigin` explícito siempre que se anime `scale`/`rotate`, para
   que el resultado no dependa del bounding box real del grupo.
4. Exportarlo desde `moves/index.ts`.
5. Usarlo en un experimento nuevo o combinarlo con los existentes.

## Reglas para mantener esto componible

- Un move se compone siempre añadiéndolo sincrónicamente a un padre
  (`tl.add(move(parts))`); nunca se juega ni se guarda para usarse suelto
  más tarde, ni asume cuándo empieza — eso lo decide el padre.
- Un move nunca asume la duración/orden de otros moves.
- Para timelines que se vayan a **exportar a video** (ver
  `src/export/`), evitar `repeat: -1` (infinito): la exportación necesita
  una duración finita (`tl.duration()` finito).
- Si una expresión nueva de la mascota necesita EYES/MOUTH/EXTRA
  distintos (no solo transformarlos), eso vive en el SVG
  (`src/svg/mascot/`, ver su README), no en un move — los moves animan,
  no rediseñan.
