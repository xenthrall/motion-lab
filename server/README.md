# Backend de renders

Proceso Node que ejecuta los renders offline y los administra: encolar,
seguir el progreso en vivo, cancelar, descargar y borrar — todo desde la
interfaz del lab, sin pasar por la terminal.

Escrito en TypeScript y ejecutado **directo por Node** (`node
server/main.ts`), sin bundler ni loader: Node 22.18+ borra los tipos por
su cuenta. Ver `docs/dependencies.md` para las implicancias (solo
sintaxis borrable, imports con extensión `.ts` explícita).

## Por qué existe (y por qué no es Next.js)

La CLI (`npm run render`) ya resolvía el render offline, pero obligaba a
salir de la app para todo: renderizar, encontrar el archivo, borrarlo.
Lo que faltaba no era servir HTML — era **ejecutar trabajos largos con
progreso**, algo que una pestaña no puede hacer (Playwright y `ffmpeg`
son procesos del sistema).

Next.js se evaluó y se descartó: aportaría SSR/ruteo/React que esta
herramienta local no necesita, y no resolvería la parte difícil (sus
route handlers son de petición/respuesta; haría falta un worker aparte
igual). El razonamiento completo está en `docs/dependencies.md`.

## Piezas

```
server/
├── main.ts            # arranque, modos dev/prod, apagado ordenado
├── app.ts             # rutas HTTP (Hono) + estáticos en producción
├── queue.ts           # estado de los trabajos: crear, correr, cancelar, borrar
├── library.ts         # renders/ en disco + manifiesto library.json
├── config.ts          # rutas, puertos, concurrencia
└── render/
    ├── engine.ts      # el render determinista (compartido con la CLI)
    ├── browser.ts     # Chromium compartido, con cierre por inactividad
    └── ffmpeg.ts      # ffmpeg como sumidero de frames PNG
```

## Cómo renderiza

El motor (`render/engine.ts`) abre **`/render.html`** en Chromium: una
segunda entrada de Vite, sin interfaz, que solo monta la mascota y expone
`window.motionLabRender` (ver `src/render/entry.ts`). Por cada frame:

```js
api.seek(t);              // timeline.time(t, false) — seek exacto, sin suppressEvents
await api.captureFrame(); // rasteriza al canvas y devuelve un PNG
```

No hay presupuesto de tiempo real: si rasterizar tarda 5ms o 500ms el
resultado es idéntico. Los PNG se **escriben directo al stdin de
`ffmpeg`** (`-f image2pipe`), sin directorio temporal: nada que limpiar
si el proceso muere, ni cientos de megabytes escritos y releídos, y la
codificación se solapa con la captura.

### Por qué una página aparte y no un hook de depuración

Antes el renderer manejaba la app real a través de `window.__lab`, un
hook que solo existía en desarrollo (`import.meta.env.DEV`). Eso tenía
dos problemas: el backend **solo podía renderizar contra un dev server de
Vite**, y cualquier refactor de la interfaz podía romper los renders.
`render.html` es una entrada real del build (1.7 kB), así que
`npm start` renderiza contra el build de producción, y el único
acoplamiento que queda es la interfaz `RenderPageApi` de
`src/shared/render-api.ts`.

Ese archivo compartido es también el contrato de la API HTTP: lo importan
el navegador, la página de render y el servidor.

## La cola

En memoria y en proceso, un render a la vez por defecto
(`MOTION_LAB_CONCURRENCY`). Las dos mitades del render ya saturan la CPU
(Chromium rasterizando 1080p+, `ffmpeg` en `-preset slow`), así que
paralelizar en una sola máquina sobre todo hace que ambos vayan más
lento y que las barras de progreso mientan.

Los trabajos terminados se persisten en `renders/library.json`
(escritura atómica) y se recargan al arrancar; los que estaban corriendo
cuando el proceso murió no sobreviven, que es la respuesta honesta —
su salida tampoco.

Cancelar aborta de verdad: interrumpe el bucle de frames, mata `ffmpeg`
y borra el archivo parcial. Un video a medias que parece terminado es
peor que ningún archivo.

### Límite conocido: la CLI no entra en la librería

`npm run render` escribe en la misma carpeta `renders/`, pero **no
registra su salida en `library.json`**, así que sus archivos no aparecen
en el panel (ni se pueden borrar desde ahí). Es deliberado: la CLI es un
proceso aparte que puede correr con el backend apagado, y que ambos
escriban el manifiesto a la vez sería una condición de carrera — el
backend guarda su mapa en memoria completo, así que pisaría lo que
hubiera escrito la CLI.

Si en algún momento molesta, la solución limpia es que la CLI, cuando
detecte un backend escuchando, encole vía `POST /api/renders` en vez de
renderizar por su cuenta; y que siga siendo autónoma solo si no hay
ninguno. No se hizo ahora porque mezclar las dos vías sobre la misma
librería no es un caso de uso frecuente.

## API

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/health` | Estado + si hay `ffmpeg` en el PATH |
| `GET` | `/api/renders` | Todos los trabajos, más nuevo primero |
| `POST` | `/api/renders` | Encola uno (`{experimentId, aspectId, backgroundId, fps}`) |
| `GET` | `/api/renders/:id` | Uno |
| `POST` | `/api/renders/:id/cancel` | Cancela |
| `DELETE` | `/api/renders/:id` | Borra el registro y el archivo |
| `GET` | `/api/renders/:id/file` | El video (soporta `Range`; `?download=1` fuerza descarga) |
| `GET` | `/api/events` | SSE: snapshot al conectar, después solo deltas |

**El servidor no conoce los ids.** Experimentos, aspectos y fondos son
strings opacos que le pasa a la página de render, que es la que valida y
resuelve. Por eso agregar un experimento o un fondo nuevo **no requiere
tocar el backend**: se agrega al registro del frontend y aparece en los
dos lados. Un id inexistente vuelve como un trabajo fallido con un
mensaje legible.

El progreso se emite por SSE con *throttle* (200ms): un render de 577
frames generaría cientos de mensajes por segundo y haría repintar la UI
mucho más seguido de lo que una persona puede leer. Los cambios de etapa
y los estados finales salen siempre al instante.

## Modos

```bash
npm run dev     # Vite (5173) + API (5174), con proxy /api — un solo comando
npm run build
npm start       # un solo proceso: sirve dist/ y la API, y renderiza contra su propio build
```

En desarrollo son dos procesos (`scripts/dev.ts` los levanta y los baja
juntos) porque el dev server de Vite es Connect y la API es Hono/fetch;
puentearlos costaría más complejidad de la que ahorra. El proxy de
`/api` en `vite.config.ts` hace que el navegador vea un solo origen, así
que el frontend nunca necesita una URL base por entorno ni configuración
de CORS.

Si el backend no está corriendo, la app **sigue funcionando**: el
laboratorio, la previsualización y la descarga en vivo no dependen de
él. El panel de Renders muestra "API no disponible" y deshabilita lo que
no puede hacer.
