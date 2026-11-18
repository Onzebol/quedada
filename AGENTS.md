# quedada

Fuente de la verdad de las instrucciones para agentes de IA en este repositorio.
`CLAUDE.md` solo importa este fichero: editar siempre aquí.

## Descripción

Aplicación web para organizar quedadas de casa rural entre amigos. Sustituye al Excel
que se usaba hasta ahora (`QUEDADA ALMUNIA.xlsx`, hoja «COMPRAS 2026»: columnas
comprador, comprado, cena del viernes y observaciones del año anterior).

Funcionalidad mínima (primeros hitos):

1. **Lista de la compra**: productos, quién los compra, si ya están comprados, comida/cena
   a la que pertenecen y observaciones.
2. **Gastos**: registrar quién paga qué y calcular el reparto y las deudas entre participantes.

Se irán añadiendo más cosas después (cada una como hito nuevo).

_Pendiente: confirmar con el Excel la estructura exacta de datos y cómo se reparten los gastos._

## Stack y comandos

- **Vite + React** en sus últimas versiones estables, con TypeScript.
- **Tests**: Vitest + React Testing Library + jest-dom (TDD, ver más abajo).
- **Lint**: oxlint (el que trae la plantilla actual de Vite) y `tsc -b` para tipos.
- **CI/CD**: GitHub Actions (lint, tests y build en cada PR; despliegue al fusionar en `main`).
- **Despliegue**: GitHub Pages en https://onzebol.github.io/quedada/ (`base: '/quedada/'` en
  `vite.config.ts`). Se publica solo al fusionar en `main` (`.github/workflows/deploy.yml`, que
  antes pasa los tests). Si se añade enrutado, usar rutas con hash (`#/ruta`): Pages no
  redirige rutas desconocidas a `index.html` y recargar daría 404.
- **Repositorio**: GitHub (cuenta `Onzebol`, CLI `gh`). Nota: el `CLAUDE.md` global menciona
  Gitea, pero este proyecto usa GitHub por decisión expresa del usuario.

Comandos:

- Instalar: `npm install`
- Desarrollo: `npm run dev` escucha en el **puerto fijo 39726** (`strictPort`, en `vite.config.ts`, #60): es la URL de redirección que tiene Supabase Auth (`http://localhost:39726/quedada/`). Excepción decidida por el usuario a la preferencia global de puertos aleatorios; si está ocupado falla y hay que parar quien lo usa (un solo worktree a la vez)
- Tests: `npm test` (una pasada) o `npm run test:watch`; cobertura con `npm run coverage`
- Lint: `npm run lint`; tipos: `npm run typecheck`
- Build: `npm run build`
- Captura a 400 px de ancho (móvil) con Edge sin interfaz, que no baja de 500 px de ventana:
  `msedge --headless --force-device-scale-factor=1.25 --window-size=500,1900 --virtual-time-budget=5000 --screenshot=<fichero.png> <url>`
  (un iframe de 400 px no sirve: el almacenamiento queda bloqueado y la app no carga).

La CI (`.github/workflows/ci.yml`) ejecuta lint, tipos, tests y build en cada PR y push a `main`.

_Pendiente: almacenamiento compartido entre varias personas (hoy SQLite en el navegador, por navegador)._

## Convenciones

- Idioma de la interfaz, issues, PRs y commits: español.
- **TDD obligatorio**: primero un test que falla (rojo), luego el código mínimo para que pase
  (verde), luego refactor. Ningún cambio de comportamiento sin test previo.
- Estructura: `src/` con `App.tsx` y `main.tsx`; los tests van junto al código como
  `*.test.ts(x)`; la configuración común de tests está en `src/test/setup.ts`.
- Dominio (`src/dominio/`, sin React): `tipos.ts` (Quedada, Grupo, Producto, Participante),
  `totales.ts` (funciones puras de totales), `liquidacion.ts` (reparto y «quién debe a quién»),
  `repositorio.ts` (interfaz asíncrona),
  `repositorioSqlite.ts` (implementación actual: SQLite en el navegador con `sql.js`, esquema
  relacional; cada escritura serializa la base y la guarda con la interfaz `Persistencia`,
  implementada en IndexedDB por `persistenciaIndexedDb.ts`), `abrirRepositorio.ts` (arranque
  desde `main.tsx`) y `migracion.ts` (importa una sola vez lo antiguo de `localStorage`);
  `repositorioLocalStorage.ts` queda solo como origen de esa migración. `fabrica.ts` crea datos de prueba.
  `operaciones.ts` (altas, ediciones y borrados de participantes, comidas y productos, siempre
  devolviendo una quedada nueva), `filtros.ts` (filtros de la lista) y `numeros.ts` (leer y
  mostrar cantidades y euros con coma decimal).
- Interfaz de la compra (`src/compra/`, #67): `ListaCompra` (filtro «Mostrar» y secciones; **no crea participantes**: los compradores salen de los que se definen en «La casa»),
  `GrupoCompra`, `FilaProducto` y el hook `useQuedada`, que carga la primera quedada del
  repositorio (o crea una con las comidas habituales) y guarda cada cambio, de uno en uno y en orden (#27: con un
  repositorio remoto dos guardados a la vez podrían llegar desordenados; mientras hay uno en curso solo
  se guarda el último estado). `App` recibe el
  repositorio y el generador de ids por props para poder probarlo con un repositorio en memoria
  (`src/test/repositorioMemoria.ts`). Dirección visual «Sierra» (#11; maqueta en
  `docs/diseno/c-sierra.html`): tokens de color y tipografía Bricolage Grotesque en `index.css`,
  paneles en `compra.css` (claro) y `cuentas.css` (verde), dos columnas desde 60 rem.
- **Lista de la compra** (#67), con el mismo estilo que «La casa»: cada **sección** (antes «comida»; el dominio sigue llamándola `Grupo`) es una ficha **plegable y contraída por defecto** (`GrupoCompra`, igual que `FichaFamilia`: el nombre es un botón con `aria-expanded`; al elegir un filtro (#90) se despliegan solas (con «Sin asignar» y «Pendientes» todas; con una persona, salvo las compradas enteras; al volver a «Todos», todo contraído), y se pliegan y despliegan a mano; la decisión se toma cada vez que se elige un filtro, no al marcar productos; la sección comprada entera muestra «Todo comprado») que muestra «N productos · X por comprar · Y sin comprador»; las secciones y los productos van **por orden alfabético** (`ordenarPorNombre`). **Todo se edita en ventanas modales**: «Añadir sección» (arriba), «Renombrar», «Añadir» producto y «Editar» producto, estos dos con el mismo formulario (`FormularioProducto`: nombre, cantidad, unidad, precio por unidad y observaciones; el descuento ya no se edita pero se conserva y cuenta en el total). Ya no hay interruptor «Gasto de la casa» (`Grupo.reparto` y `cambiarReparto` se conservan). La cantidad va delante del nombre («1 kg - Carne»). **Compradores** (`dominio/compradores.ts`): el desplegable de asignar ofrece los participantes y también las familias sin personas (`compradorId` puede ser el id de una familia; el Resumen las cuenta como pagadoras), por orden alfabético; borrar una familia suelta sus productos. Junto a «Mostrar» (que solo ofrece a quienes tienen algo asignado) salen los totales de la lista; con filtro cuentan solo lo filtrado, sin «sin comprador», y con un filtro por persona se oculta el desplegable de asignar de cada producto. **Con cualquier filtro activo (#70) la lista es de solo lectura** (`soloLectura` en `GrupoCompra` y `FilaProducto`): no hay botones de añadir sección, renombrar, borrar, añadir producto ni editar; se siguen pudiendo marcar como comprados. Las líneas de datos (`.familia__datos`, `.persona__datos`, `.grupo__datos`, `.compra__datos`) separan sus bloques con un círculo pequeño (`ui/controles.css`), las casillas (`input[type=checkbox]`: lista de la compra y pagos) comparten el aspecto de `ui/controles.css`, los `select` son píldoras con flecha propia y los botones sin texto son círculos perfectos.
- **App instalable (PWA)** (#69, `src/pwa/`, plugin `vite-plugin-pwa` en `vite.config.ts`): manifiesto en `src/pwa/manifiesto.ts` (nombre «Quedada», `display: standalone`, colores `#2f6b4f`/`#e8ecea`, `start_url` y `scope` relativos `./` para que caigan en `/quedada/`), iconos y favicon en `public/` (`favicon.svg`, `favicon.ico`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`; las fuentes SVG están en `public/favicon.svg` y `docs/diseno/icono-maskable.svg`/`icono-ios.svg`; se pasan a PNG con Edge sin interfaz y se reescalan). **Service worker** (Workbox, `generateSW`): precachea la interfaz (js, css, html, iconos) y cachea las fuentes de Google; **los datos (Supabase) nunca se cachean**. `registerType: 'prompt'`: el service worker nuevo espera y `ActualizacionPwa` (usa el módulo virtual `virtual:pwa-register/react`, que en los tests se sustituye con `vi.mock`) muestra `AvisoActualizacion` («Hay una versión nueva de la aplicación», «Actualizar» recarga con ella, «Más tarde» lo oculta) y busca versiones nuevas cada hora; se monta en `main.tsx`. En desarrollo, `?aviso` en la URL fuerza a mostrarlo para diseñarlo (#84). **Botón «Instalar»** (#77, `BotonInstalar` + `useInstalar`): sale arriba a la derecha, a la izquierda del botón del usuario (`Sesion`, contenedor `.sesion__esquina`), solo cuando el navegador lanza `beforeinstallprompt` (Chrome, Edge, Android; **iOS no lo tiene**: allí `useInstalar` detecta el dispositivo (`esIos`: iPhone/iPod/iPad, incluido el iPad que se presenta como Mac, que se delata por la pantalla táctil) y el mismo botón abre una ventana «Instalar en iOS» con los pasos «Compartir → Añadir a pantalla de inicio → Añadir», #79; no sale si `navigator.standalone`) y la app no está ya abierta como instalada (`display-mode: standalone`); al pulsarlo abre el diálogo del navegador y desaparece (el evento solo sirve una vez; también con `appinstalled`). Para verlo hay que usar la compilación (`vite preview`), no `npm run dev`. **El service worker solo existe en la compilación, no en `npm run dev`**: para probarlo, `npm run build` y `npx vite preview --port 39726 --strictPort`. En los tests, `import.meta.url` con rutas a `public/` no sirve (Vite lo trata como un recurso): usar `import.meta.dirname`.
- **Pestañas** (#55, `src/ui/Pestanas.tsx`, accesible: `role="tablist"`, flechas/Inicio/Fin, solo se monta el panel activo): `VistaQuedada` divide la quedada en **La casa** (`DatosCasa` y `Asistentes`; la pestaña que se abre al entrar, #89), **Lista de la compra** (`ListaCompra`), **Pagos** (`Pagos`: pagos de la casa por familia, #91, y gastos de cada uno, #95) y **Resumen** (`Cuentas`). Ya no hay dos columnas. La pestaña activa es estado local (no va en el hash). En los tests hay que pulsar la pestaña (`getByRole('tab', …)`) antes de buscar su contenido; un elemento de otra pestaña se desmonta al cambiar.
- **La casa** (#56, `src/casa/`, `dominio/casa.ts`): `Quedada.casa` (título, descripción, dirección, coordenadas, `precio` en
  céntimos) vive en columnas `casa_*` de `quedadas` (`0004_casa.sql`; en SQLite, `ALTER` en bases antiguas).
  `DatosCasa` muestra la ficha y, con «Editar la casa», cambia a un formulario que guarda todo a la vez con «Guardar» (o descarta con «Cancelar») y vuelve a la ficha; los enlaces `http(s)` de la descripción se muestran como enlaces
  (`enlaces.ts`, nunca HTML) y el mapa de la ficha es `MapaCasa` (#101: Leaflet de solo lectura con marcador fijo, zoom y desplazamiento libres, «Centrar» y «Navegar»; antes un `iframe` del embed de OpenStreetMap, cuyo pie de «Donar» o «Reportar un problema» no se podía ocultar) a partir de coordenadas que se obtienen
  **solo al pulsar «Situar en el mapa»** (Nominatim, inyectable con la prop `geocodificar` de `App`; cambiar la dirección
  borra las coordenadas). `leafletMapa.ts` crea ambos mapas con el único pie «© OpenStreetMap» (atribución exigida por la licencia ODbL; no quitarla) y sin el prefijo «Leaflet»; un único botón `BotonCapa` (#108/#109, Esri World Imagery, con su atribución mientras se ve) alterna «Mapa» y «Satélite» en los dos (se llama como la capa a la que cambia). **Solo al editar** el mapa es `MapaAjustable` (Leaflet, cargado bajo demanda; el marcador es una
  gota CSS, sin imágenes): se arrastra el marcador o se pulsa en el mapa para ajustar la posición (en los tests, `src/test/leafletFalso.ts`).
  En el móvil, la ficha ofrece «Navegar» (`urlAppMapas`: `geo:` en Android, Apple Maps en iOS; oculto en el ordenador). **Familias y personas** (en la interfaz «Añadir persona»; en el código, componentes; sin desplegable para cambiar de familia): un componente es un `Participante` con `familiaId` (id de un
  `Asistente`); `Asistente.personas` se mantiene igual al número de componentes y `personasDe` cuenta los componentes si los
  hay. **Asistentes** (`src/asistentes/`): cada familia es una ficha de solo lectura (`FichaFamilia`), **contraída por defecto** (solo nombre, datos y botones de la familia; el nombre es un botón con `aria-expanded` que muestra u oculta las personas) y todo se edita en ventanas modales con `ui/FormularioModal` (Guardar/Cancelar; se cierra al enviar): «Añadir familia» (arriba, alineado con el título), «Editar familia», «Añadir persona» y, por cada persona, `casa/FichaPersona` con «Editar» (nombre, % casa, % demás gastos). Con componentes, el número de personas no se edita (sale de ellos). Los botones de borrar muestran siempre «Borrar»; el nombre de lo que borran va solo en `aria-label` (`BotonBorrar.etiqueta`). Borrar una familia deja a sus componentes sin familia; quitar un componente lo suelta como comprador.
  **Reparto**: `Participante.porcentajeCasa` (100 por defecto; si falta, `pagaCasa: false` = 0) da el peso en el reparto de
  la casa y `porcentajeComida` el de los demás gastos. **Pagos de la casa** (#91, `dominio/pagos.ts`, `Quedada.pagos`, tabla `pagos`; sustituye al antiguo `casa.pagadorId`, que ya no se lee ni se escribe y se conserva en la columna `casa_pagador_id`): cada `Pago` es de una **familia** (`familiaId`), con importe en céntimos y concepto libre («Reserva», «Resto»). La pestaña «Pagos» muestra Precio, Pagado y Falta, lista los pagos y ofrece «Añadir pago», «Editar», «Borrar» y «Repartir entre familias» (un pago por familia proporcional a sus personas con `repartirProporcional`, sin perder céntimos). **En las cuentas entra solo lo pagado** (la suma de los pagos **marcados como «Pagado»** (#128), no el precio: puede haber quien aún no haya pagado la reserva; los pagos sin marcar no cuentan en el Resumen): se acredita a los componentes de la familia según su % casa (una familia sin componentes figura ella misma) y se reparte entre todos por % casa; así los saldos siguen sumando 0 con un pago parcial. Borrar una familia borra sus pagos; al reimportar el Excel se conservan los de las familias que siguen. **Pagado** (#120, `Pago.pagado`, columna `pagos.pagado`, `0010_pago_pagado.sql`; `marcarPagado` en `dominio/pagos.ts`): cada pago de la lista lleva una casilla «Pagado» para saber si quien debía ese pago ya lo ha pagado. Es solo un recordatorio: no cambia las cuentas. **Al desplegar**: ejecutar `0010_pago_pagado.sql` en el editor SQL de Supabase antes de fusionar (añade una columna con valor por defecto; la `0009_casa_enviada.sql` de un primer intento quedó sin uso y la `0010` retira su columna).
  (el precio solo cuenta si hay pagos). Los porcentajes se editan en «La casa» (ventana «Editar persona» de `FichaPersona`);
  `Cuentas` (Resumen) es de solo lectura. **Importación**: cada comprador del Excel entra como una familia (`asistentes`, id `<hoja>-familia-<nombre>`) con él como primer
  componente; luego se añaden a mano los demás componentes de la unidad familiar. Al reimportar se conservan la casa, las familias
  (más las de los compradores nuevos), `familiaId` y `porcentajeCasa`.
  **Adulto o menor** (#119, `Participante.adulto`, `false` = menor (niños y adolescentes: quien no compra ni paga), adulto por defecto; columna `adulto` en `participantes`, `0008_adulto.sql`): se elige en «Nueva persona» y «Editar persona» (desplegable «Tipo») y se ve en la ficha. **Un menor no puede comprar ni pagar**: `compradores(q)` lo excluye (lista de la compra y «Quién pagó» de los gastos; `{ conNinos: true }` lo incluye solo para poner su nombre en las cuentas). `editarParticipante(…, { adulto: false })` suelta sus productos y **no hace nada si ya tiene gastos registrados** (hay que borrarlos o reasignarlos antes). El reparto de gastos sigue por porcentajes. **Al desplegar #119**: ejecutar `0008_adulto.sql` (solo añade una columna) antes de fusionar.
  **Al desplegar**: ejecutar `0004_casa.sql` en el editor SQL de Supabase antes de fusionar (solo añade columnas).
  **Al desplegar #91**: ejecutar `0005_pagos.sql` (tabla `pagos` con RLS y aviso en tiempo real; convierte el pagador antiguo en un pago de su familia por el precio completo, si la persona tenía familia; se puede repetir sin duplicar) antes de fusionar: sin la tabla la app nueva no puede leer las quedadas.
- Interfaz de cuentas (`src/cuentas/`, #128): `Cuentas` (pestaña «Resumen», de solo lectura, con fichas como las de «La casa») muestra arriba los totales (total pagado, casa pagada, **lo que falta de la casa** —si hay precio; resaltado mientras falte algo— y gastos), una **ficha por familia** (`dominio/resumen.ts`, `resumenPorFamilia`: contraída por defecto, con «Ha pagado», «Le toca» y el saldo «Le deben»/«Debe»/«Al día»; al desplegarla, cada persona con su desglose de casa y gastos; quien no tiene familia sale como ficha propia, sin desplegable, y una familia sin componentes figura ella misma) y «Quién paga a quién» (**entre familias** o personas sueltas, no entre personas de una familia: `resumenPorFamilia` liquida sobre los saldos de los grupos). `liquidacion.ts` exporta `partesDeCadaUno` (lo que toca a cada uno de casa y gastos). Los porcentajes de reparto se ajustan en «La casa» (#56). La interfaz ya no ofrece marcar una
  sección como «gasto de la casa» (#67; `Grupo.reparto` y `cambiarReparto` se conservan en el dominio y en los datos). `App` llama a
  `useQuedada` y reparte el estado entre `ListaCompra` y `Cuentas`. Los interruptores usan
  `role="switch"` para no mezclarse con las casillas «comprado» de los productos.
- **Gastos y cuentas** (#95, `dominio/gastos.ts`, `casa/Gastos.tsx`, tabla `gastos`, `0006_gastos.sql`; sustituye a la regla de #4): **los precios y compradores de la lista de la compra son solo orientativos y no entran en las cuentas**; es normal comprar cosas que no están en la lista. Las cuentas salen de lo realmente pagado: `Quedada.gastos` (`Gasto`: `pagadorId` —participante o familia—, `concepto`, `importe` en céntimos; se añaden, editan y borran en la sección «Gastos» de la pestaña «Pagos») y los pagos de la casa de #91. Cada gasto se reparte según `porcentajeComida` de cada participante (100 por defecto; menos o 0 para niños); el alquiler, según `porcentajeCasa`. `Grupo.reparto` ya no influye en las cuentas. Borrar a quien pagó borra sus gastos; reimportar el Excel conserva los gastos. Las quedadas existentes muestran solo el alquiler en el Resumen hasta registrar gastos. **Al desplegar**: ejecutar `0006_gastos.sql` en el editor SQL de Supabase antes de fusionar (solo crea una tabla). Pendiente (#100): importar el bloque de tickets del Excel como gastos.
- **Fotos de tiques** (#118, `src/tiques/`, `0007_tiques.sql`): un `Gasto` puede llevar `imagen` (ruta `<quedada>/<gasto>.jpg` en el bucket privado `tiques` de Supabase Storage; columna `gastos.imagen`). **El total y el pagador se escriben a mano** (no hay lectura automática: OCR o IA con visión sería otra issue, que solo propondría el total para confirmarlo). En el formulario del gasto, «Foto del tique» (`accept="image/*"`: cámara o galería) y, al editar, «Quitar la foto»; sin concepto un gasto con foto se llama «Tique». `reducirImagen` la pasa a JPEG de 1600 px como máximo en el cliente (límite del bucket: 2 MB). Todo va detrás de `AlmacenImagenes` (`AlmacenSupabase`; `src/test/almacenMemoria.ts` en los tests) y `App` recibe `imagenes?: Imagenes` (almacén + reducción): **sin él (modo local) no se ofrece la foto**. Se sube antes de guardar el gasto (si falla, aviso y no se crea); `MiniaturaTique` pide una URL firmada de 1 h y abre la foto grande en una ventana. Borrar el gasto o quitar la foto borra el fichero (si falla, queda suelto e invisible); **borrar una quedada entera no borra sus fotos** (pendiente). La RLS del bucket usa `puede_acceder` sobre la primera carpeta de la ruta. **Al desplegar**: ejecutar `0007_tiques.sql` en el editor SQL de Supabase antes de fusionar (columna nula y bucket nuevo).
- Asistentes (#7): `Quedada.asistentes` (familia, personas ≥ 1, llegada `HH:MM` o `null`) y
  `Quedada.basicos` (**en desuso**: la sección de básicos se quitó en #56, lo que haya que llevar va en la lista de la compra; el
  campo y las tablas se conservan para no borrar datos ni migrar). Lógica pura en
  `dominio/asistentes.ts` (alta, edición, baja, total, orden alfabético con `ordenarPorNombre`, #65: familias y personas); tablas
  `asistentes` y `basicos` en SQLite (`CREATE TABLE IF NOT EXISTS`, así que las bases antiguas se
  abren sin migrar). Interfaz en `src/asistentes/` (`Asistentes`, `CampoEntero`); el total
  («Vienen N personas») sale también en la lista de la compra. **Los asistentes no cambian el
  reparto de gastos**: sigue la regla de #4 (test en `liquidacion.test.ts`). Al reimportar el
  Excel se conservan los asistentes de la quedada.
- Sesión con Google y enlace (#19, `src/autenticacion/`): la autenticación va detrás de la interfaz
  `Autenticacion` (`tipos.ts`; fake en `src/test/autenticacionMemoria.ts`). `autenticacionGoogle.ts`
  usa Google Identity Services (ventana OAuth con `initTokenClient`, scopes `openid profile email`) y
  consulta `userinfo`; guarda solo id, nombre y foto (nunca el correo) en `localStorage` 30 días.
  **Es una sesión del navegador, sin servidor que valide la identidad: sirve para saber quién es
  quién, no para proteger datos.** `Sesion` muestra entrar y, con sesión, un botón arriba a la derecha que solo lleva la foto o, sin foto, la inicial (#113; el nombre va en su `aria-label`) y que abre un menú (#43, `role="menu"`; arriba muestra el nombre completo de la cuenta (#52; Google no da `given_name` vía Supabase y adivinar el nombre de pila fallaba con nombres compuestos) y el correo (#113; `Usuario.email` es opcional, lo rellena Supabase y **nunca se guarda en el navegador**, así que la sesión de Google de respaldo no lo trae) y debajo «Cerrar sesión»; se cierra con Escape o al pulsar fuera; al cerrar sesión `main.tsx` recarga la página, que sin sesión muestra `PantallaEntrada` vía la prop `alSalir` de `App`), y «Este soy yo»
  (`Participante.cuentaId`, columna `cuenta_id` en SQLite añadida con `ALTER` en bases antiguas;
  lógica en `dominio/vinculos.ts`). `ruta.ts` + `useHashQuedada` mantienen `#/<id>` (#40; antes `#/quedada/<id>`, que se sigue entendiendo para no romper enlaces ya compartidos: un id nuevo nunca lleva `/` sin codificar) y
  `CopiarEnlace` copia ese enlace. Hoy los datos siguen siendo locales: un enlace abierto en otro
  navegador no trae la quedada (la app lo avisa); para eso hace falta el almacenamiento compartido
  (pendiente).
  **Configuración**: `VITE_GOOGLE_CLIENT_ID` (ver `.env.example`; en CI, variable de repositorio
  `GOOGLE_CLIENT_ID`). Sin ella no se muestra «Entrar con Google» y la app sigue en modo local. En
  Google Cloud Console: cliente OAuth de tipo «Aplicación web», orígenes JavaScript autorizados
  `https://onzebol.github.io` y `http://localhost:<puerto>` de desarrollo; no hacen falta URI de
  redirección (flujo con ventana emergente).
- Supabase (#25, `src/supabase/`, `supabase/migrations/`): identidad y datos compartidos en
  Supabase (GitHub Pages es solo estático y SQLite no se puede compartir entre personas).
  `AutenticacionSupabase` implementa `Autenticacion` con Supabase Auth (Google): `abrir` resuelve la
  sesión una vez antes de pintar y `entrar` redirige a Google (la página se recarga al volver; el
  enrutado por hash no choca con el flujo PKCE, que usa `?code=`). `RepositorioSupabase` (#30, paso 1 de #29) guarda **una fila por cosa**: `quedadas` y las tablas
  `participantes`, `grupos`, `productos`, `asistentes` y `basicos` (`0002_tablas.sql`, con `quedada_id`
  y `posicion`). Lee con una sola consulta con las hijas incrustadas y guarda **por diferencias**
  contra lo último leído o guardado (`vistas`): filas nuevas completas, solo las columnas que
  cambian en las existentes y solo los ids que ya no están; así dos personas que tocan cosas
  distintas no se pisan (tests con dos instancias sobre `src/test/backendSupabaseFalso.ts`). Todo
  es idempotente: si un guardado falla a medias, `vistas` no avanza y reintentar lo repara. Quién ve
  qué lo decide la RLS (`0001`/`0002`): las tablas hijas pasan por `puede_acceder(quedada_id)`, que
  hoy comprueba el propietario y se redefinirá en el paso 3 (miembros). `quedadas.datos` (jsonb de
  antes) se conserva, ya nullable, hasta comprobar los recuentos; `convertir_quedadas_desde_datos()`
  lo pasa a filas y solo reconvierte lo que la versión anterior haya cambiado en `datos`. `cliente.ts` crea el cliente y
  devuelve `null` sin configuración. `main.tsx` exige sesión: sin ella (o sin configuración) solo
  pinta `PantallaEntrada` (`src/autenticacion/`); con ella, `App` con `RepositorioSupabase`. El modo
  local (`abrirRepositorio`, SQLite del navegador) ya no se usa en la app y queda para migrar datos. Las clases reciben interfaces mínimas (`ClienteAuth`, `ClienteDatos`) para probarlas con
  clientes falsos. `migraciones.test.ts` ejecuta las migraciones de verdad con PGlite (Postgres en
  WebAssembly, solo en tests): prueba la conversión de `datos` y que una cuenta no ve ni toca las
  filas de otra. **Orden al desplegar una migración** (se aplica a mano en el editor SQL): ejecutarla,
  fusionar la PR y volver a ejecutar `select public.convertir_quedadas_desde_datos();` una vez.
  **Tiempo real** (#32, paso 2 de #29): `0003_tiempo_real.sql` crea triggers por fila en `quedadas` y sus
  cinco tablas hijas que llaman a `realtime.broadcast_changes` hacia el canal privado
  `quedada:<id>`, y una política en `realtime.messages` basada en `puede_acceder` (así el paso 3 la
  amplía a los miembros sin tocarla). Se usa Broadcast y no Postgres Changes porque los DELETE de este
  último no se filtran ni pasan por RLS. `Repositorio.suscribir?(id, alCambiar)` es opcional (solo
  Supabase); `RepositorioSupabase` autentica (`realtime.setAuth`) y abre el canal privado. El aviso
  solo dice «algo cambió»: `useQuedada` espera `ESPERA_AVISOS_MS`, vuelve a leer la quedada y la
  sustituye si es distinta, **sin pisar lo local**: no lee mientras haya guardados en curso o
  pendientes y descarta una lectura anterior a un cambio local. Avisa también al quedar suscrito
  (primera vez y reconexiones) para recoger lo ocurrido en el hueco. En Supabase: Realtime activado y
  sin «Allow public access» en los canales. Los tests de la migración usan un `realtime` falso en
  PGlite; lo que no se prueba en CI es la entrega real por websocket (se comprueba a mano con dos
  navegadores).
  **Configuración**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_CLAVE_PUBLICA` (ver `.env.example`; en CI,
  variables de repositorio `SUPABASE_URL` y `SUPABASE_CLAVE_PUBLICA`), públicas. Nunca la
  `service_role`. Pendiente (issues propias): conocidos, compartir/invitar por email, vincular un
  participante manual a una cuenta y subir los datos locales. `autenticacionGoogle.ts` (GIS) queda
  como respaldo sin Supabase y se retirará.
- **Miembros y permisos** (#132, paso 3 de #29, `0011_miembros.sql`): tabla `quedada_miembros(quedada_id, usuario_id)`. `puede_acceder` es ahora «propietario o miembro» (así se abren solas las tablas hijas, el bucket de tiques y Realtime) y `es_propietario` identifica al dueño. **Todos los miembros ven y editan la quedada; solo el propietario la borra y añade o retira miembros** (un miembro puede salirse); un trigger impide cambiar `propietario_id`. `quedadas` se lee y se actualiza con `puede_acceder`; crear y borrar siguen siendo del propietario. `Repositorio.puedeBorrar?(id)` (en `RepositorioSupabase`, que recibe el id de la cuenta y lee `propietario_id`) hace que `Inicio` oculte «Borrar quedada» en las compartidas. Siguientes pasos: invitación por enlace (token, caducidad 30 días, `#/unirse/<token>`), no perder el enlace tras el login, «Este soy yo» al unirse y «Mis cosas». **Al desplegar**: ejecutar `0011_miembros.sql` en el editor SQL de Supabase antes de fusionar (solo añade una tabla y redefine funciones y políticas).
- Importación del Excel (`src/importacion/`): `importarHoja.ts` (puro: filas de celdas a
  `Quedada`; detecta los formatos de 2023 a 2026, usa ids estables derivados del nombre de la
  hoja para que reimportar sustituya y no duplique, y avisa de lo que descarta). **Con sesión, `ImportarExcel`
  antepone el id de la cuenta al de la quedada** (`<idCuenta>-import-compras-2026`, #34): en Supabase
  `quedadas.id` es clave primaria global y, si no, dos cuentas que importaran el mismo Excel chocarían.
  Si la cuenta ya tenía la quedada con el id antiguo (sin prefijo) se sigue usando ese, para sustituirla
  y no duplicarla; sin sesión el id no cambia,
  `leerExcel.ts` (lee el `.xlsx` con `read-excel-file`, cargada solo al importar; devuelve los
  valores ya calculados de las fórmulas) y `ImportarExcel.tsx` (botón e informe). Solo se
  importan las hojas «Compras AAAA». El bloque de **tickets** del final de cada hoja (filas con
  «SUMA ARTICULOS | TICKETS», #100) se importa como `Gasto`: pagador (primera columna), concepto (la tienda) e importe (columna «TICKETS»);
  las filas «TOTAL» y las de sin pagador o sin importe no (las segundas avisan). Ids `<quedada>-gasto-<fila>`: al reimportar se sustituyen
  los del Excel y se conservan los apuntados a mano. La lista de asistentes no se importa. En las hojas de 2023 y
  2024 la columna del precio es el total de la línea, no el precio por unidad. Ojo: sumar la
  columna «total» de toda la hoja cuenta dos veces lo comprado (líneas más tickets).
- **Página inicial** (#44, `src/inicio/Inicio.tsx`): `App` enruta por el hash. Sin `#/<id>` muestra `PaginaInicial`
  (lista de quedadas con elegir, eliminar y, en ventanas modales (`FormularioModal`, #103), «Añadir quedada» (arriba) y «Editar» (renombrar) en cada una, más `ImportarExcel`); con él, `VistaQuedada`;
  el título «Quedada» (un botón, #97) pone el hash a vacío y vuelve a ella; `VistaQuedada` muestra el nombre de la quedada como `h2`. Elegir una quedada pone `#/<id>`; crear usa
  `quedadaInicial(crearId, nombre)`, la guarda y la abre; importar un Excel con una sola quedada la abre y con
  varias deja la lista. **La app ya no crea una quedada sola al abrirse vacía** (solo `useQuedada` sin id, que
  usan los tests del hook). `useQuedada` con un id que no existe o al que no se tiene acceso devuelve
  `error: 'noEncontrada'` y `App` lo avisa en vez de mostrar otra distinta. En los tests de `App`,
  `src/test/abrirPrimera.ts` apunta la URL a la primera quedada del repositorio para saltarse la página inicial.
- **Todos los borrados piden confirmación en una ventana modal** (#42, `src/ui/`): `Modal` (propia, no el `<dialog>` nativo, para
  controlar el estilo «Sierra» en `modal.css` y poder probarla: rol `dialog` + `aria-modal`, Esc, clic fuera, foco contenido y
  devuelto al botón, bloqueo del scroll, foco inicial en el elemento con `data-autofocus`) y `BotonBorrar` (botón + modal; si el
  borrado rechaza deja la ventana abierta con el aviso, y no se confirma dos veces). Se usa en los cinco borrados: quedada, comida, producto, asistente y básico.
- **Controles compartidos** (#63, `src/ui/controles.css`, importado desde `index.css`): botones (píldora; `type="submit"` = principal; hover, `:active` y `disabled` iguales en toda la app), campos, selector de archivo (#124: campo como los demás con `::file-selector-button` en píldora, como los botones), etiquetas, la caja de los paneles (`.compra`, `.casa`, `.asistentes`, `.importar`) y el ritmo de espaciado (`--esp-1…6`; `.pagina`, `.inicio` y `.pestanas__panel` separan sus secciones con `gap`, sin márgenes sueltos). Todo va en `:where()` (especificidad 0): **los CSS de cada componente no deben redefinir botones, campos ni etiquetas**, solo matizar con su clase.
- **Iconos** (#57, `lucide-react`): los botones con texto usan `ui/ConIcono` (`icono` + texto; el SVG lleva `aria-hidden`). `ui/icono.css` oculta el texto visualmente por debajo de 40 rem (queda en el DOM como nombre accesible), así que en móvil solo se ve el icono. Las fichas de familia (`.familia`, `container: ficha`) hacen lo mismo según **su propio ancho** (`@container` en `icono.css`): si el texto no cabe, solo el icono. Excepción (#85): «Centrar» y «Navegar» (`.casa__mapa-acciones`) van en una línea, con navegar a la derecha, y mantienen el texto en móvil. Excepción (#120): «Añadir pago» y «Repartir entre familias» (`.pagos__acciones`) mantienen el texto en móvil. Excepción (#81): los botones de las personas (`.persona__acciones`) y «Añadir persona» (`.familia__anadir`) van en su propia línea, bajo los datos y a la derecha, y mantienen el texto también en móvil; en el producto la casilla va sola en la columna izquierda. Los botones nuevos deben usarlo.
- **Eliminar quedada** (#36, `src/compra/EliminarQuedada.tsx`, ahora en la página inicial, uno por quedada): `BotonBorrar` con la
  ventana modal de confirmación. `PaginaInicial.eliminar`
  llama a `Repositorio.borrar` y refresca la lista. Si falla, avisa y no cambia nada. En Supabase el borrado es en
  cascada y solo puede el propietario (RLS `borrar las propias`); al compartir (paso 3 de #29) el botón solo se
  ofrecerá a él.
- Datos reales: el Excel original de los usuarios no se sube al repo (es público). Los tests
  usan fragmentos con nombres inventados y `src/importacion/fixtures/ejemplo.xlsx`.
- Dinero: siempre en **céntimos enteros** (`Centimos`) dentro del dominio; solo se convierte a
  euros al mostrarlo. Las entradas de precio y descuento del producto están en euros.
- Los datos se guardan siempre a través de la interfaz `Repositorio`, nunca con
  `localStorage` directo desde los componentes, para poder cambiar a un servicio compartido.
- La TypeScript de la plantilla activa `erasableSyntaxOnly`: nada de propiedades de parámetro
  en constructores ni `enum`.
- Estilo: TypeScript estricto, componentes de función, consultas de Testing Library por rol y
  nombre accesible antes que por texto o `data-testid`.

## Flujo de trabajo

- Cada hito es una **issue documentada** (contexto, criterios de aceptación y, cuando ayude a
  entenderlo, imágenes: capturas, bocetos o diagramas).
- Una issue por cambio, rama `issue-<n>-<slug>` en su propio git worktree; nunca cambiar de
  rama en la carpeta principal.
- **Cada issue tiene su worktree**, siempre dentro del proyecto, en `.worktrees/` (ignorada
  por git); no se trabaja fuera de la carpeta del repositorio:
  `git worktree add .worktrees/issue-<n>-<slug> -b issue-<n>-<slug> origin/main`.
  Dentro hay que ejecutar `npm install` y levantar su propio servidor de desarrollo.
- Al fusionar la PR: parar el servidor (y su proceso `node`), borrar el worktree con
  `git worktree remove` y la rama local y remota.
- **Documentación al día**: cada PR actualiza `AGENTS.md` y `README.md` cuando cambian
  comandos, estructura, hitos, decisiones o la URL, en la misma PR del cambio.
- **Siempre PR**, nunca push directo a `main`. La PR cierra la issue con `Closes #<n>`.
- La PR solo se fusiona con la CI en verde.
