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
