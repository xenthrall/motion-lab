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

`tilt`/`lean` animan `parts.mascot` (no `parts.head`) a propósito: HEAD,
EYES y MOUTH son grupos hermanos, no anidados — rotar/mover solo HEAD los
desalinearía. Cualquier gesto de "cuerpo completo" (inclinar, acercarse,
saltar) siempre debe animar `parts.mascot`.

## Cambiar la forma de ojos/boca (expresiones)

`setExpression` no anima una forma existente, la **reemplaza** — usa los
presets de `src/svg/mascot/expressions.ts` (`neutral`, `surprised`,
`happy`, `starstruck`, `dizzy`, `determined`, `wink`):

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

`upsertSceneProp`/`upsertSceneGroup` son idempotentes (si ya existe una
prop con ese id, la reemplazan) y las props quedan marcadas con
`data-scene-prop` para que `clearSceneProps(root)` pueda limpiarlas al
cambiar de experimento — eso ya lo hace `main.ts` en `setExperiment()`,
no hace falta repetirlo por experimento. Ver
`src/experiments/mascot-curiosity.ts` (un objeto simple) y
`src/experiments/mascot-adventure.ts` (varios objetos compuestos, con
guion completo documentado en el archivo) como ejemplos.

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
