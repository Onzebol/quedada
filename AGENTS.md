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
- Desarrollo: `npm run dev -- --port <puerto> --strictPort` (puerto aleatorio libre, ver preferencias globales)
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
- Interfaz de la compra (`src/compra/`): `ListaCompra` (filtro, participantes, comidas),
  `GrupoCompra`, `FilaProducto` y el hook `useQuedada`, que carga la primera quedada del
  repositorio (o crea una con las comidas habituales) y guarda cada cambio, de uno en uno y en orden (#27: con un
  repositorio remoto dos guardados a la vez podrían llegar desordenados; mientras hay uno en curso solo
  se guarda el último estado). `App` recibe el
  repositorio y el generador de ids por props para poder probarlo con un repositorio en memoria
  (`src/test/repositorioMemoria.ts`). Dirección visual «Sierra» (#11; maqueta en
  `docs/diseno/c-sierra.html`): tokens de color y tipografía Bricolage Grotesque en `index.css`,
  paneles en `compra.css` (claro) y `cuentas.css` (verde), dos columnas desde 60 rem.
- Interfaz de cuentas (`src/cuentas/`): `Cuentas` muestra el total, lo pagado por persona, los
  ajustes de reparto (porcentaje de comida y «paga la casa» por participante; el interruptor
  «Gasto de la casa» está en cada comida de la lista) y las transferencias. `App` llama a
  `useQuedada` y reparte el estado entre `ListaCompra` y `Cuentas`. Los interruptores usan
  `role="switch"` para no mezclarse con las casillas «comprado» de los productos.
- Reparto de gastos (decidido en #4): los grupos con `reparto: 'casa'` se dividen a partes
  iguales entre todos los participantes aunque al final no vengan, salvo los que tengan
  `pagaCasa: false` (niños). El resto (comida) se reparte según `porcentajeComida` de cada
  participante (100 por defecto; menos o 0 para niños). Los productos sin comprador no cuentan.
- Asistentes (#7): `Quedada.asistentes` (familia, personas ≥ 1, llegada `HH:MM` o `null`) y
  `Quedada.basicos` (nombre y familia que lo trae, o `null` si queda sin asignar). Lógica pura en
  `dominio/asistentes.ts` (alta, edición, baja, total, orden por llegada, básicos); tablas
  `asistentes` y `basicos` en SQLite (`CREATE TABLE IF NOT EXISTS`, así que las bases antiguas se
  abren sin migrar). Interfaz en `src/asistentes/` (`Asistentes`, `CampoEntero`); el total
  («Vienen N personas») sale también en la lista de la compra. **Los asistentes no cambian el
  reparto de gastos**: sigue la regla de #4 (test en `liquidacion.test.ts`). Al reimportar el
  Excel se conservan los asistentes y básicos de la quedada.
- Sesión con Google y enlace (#19, `src/autenticacion/`): la autenticación va detrás de la interfaz
  `Autenticacion` (`tipos.ts`; fake en `src/test/autenticacionMemoria.ts`). `autenticacionGoogle.ts`
  usa Google Identity Services (ventana OAuth con `initTokenClient`, scopes `openid profile email`) y
  consulta `userinfo`; guarda solo id, nombre y foto (nunca el correo) en `localStorage` 30 días.
  **Es una sesión del navegador, sin servidor que valide la identidad: sirve para saber quién es
  quién, no para proteger datos.** `Sesion` muestra entrar/salir, nombre, foto y «Este soy yo»
  (`Participante.cuentaId`, columna `cuenta_id` en SQLite añadida con `ALTER` en bases antiguas;
  lógica en `dominio/vinculos.ts`). `ruta.ts` + `useHashQuedada` mantienen `#/quedada/<id>` y
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
  enrutado por hash no choca con el flujo PKCE, que usa `?code=`). `RepositorioSupabase` guarda cada
  quedada como una fila de `quedadas` con el documento en `datos` (jsonb); quién ve qué lo decide la
  RLS de `0001_quedadas.sql` (solo el propietario), no el código. `cliente.ts` crea el cliente y
  devuelve `null` sin configuración. `main.tsx` exige sesión: sin ella (o sin configuración) solo
  pinta `PantallaEntrada` (`src/autenticacion/`); con ella, `App` con `RepositorioSupabase`. El modo
  local (`abrirRepositorio`, SQLite del navegador) ya no se usa en la app y queda para migrar datos. Las clases reciben interfaces mínimas (`ClienteAuth`, `ClienteDatos`) para probarlas con
  clientes falsos; **la RLS no se prueba en CI**, se verifica a mano con dos cuentas.
  **Configuración**: `VITE_SUPABASE_URL` y `VITE_SUPABASE_CLAVE_PUBLICA` (ver `.env.example`; en CI,
  variables de repositorio `SUPABASE_URL` y `SUPABASE_CLAVE_PUBLICA`), públicas. Nunca la
  `service_role`. Pendiente (issues propias): conocidos, compartir/invitar por email, vincular un
  participante manual a una cuenta y subir los datos locales. `autenticacionGoogle.ts` (GIS) queda
  como respaldo sin Supabase y se retirará.
- Importación del Excel (`src/importacion/`): `importarHoja.ts` (puro: filas de celdas a
  `Quedada`; detecta los formatos de 2023 a 2026, usa ids estables derivados del nombre de la
  hoja para que reimportar sustituya y no duplique, y avisa de lo que descarta),
  `leerExcel.ts` (lee el `.xlsx` con `read-excel-file`, cargada solo al importar; devuelve los
  valores ya calculados de las fórmulas) y `ImportarExcel.tsx` (botón e informe). Solo se
  importan las hojas «Compras AAAA». El bloque de **tickets** del final de cada hoja (filas con
  «SUMA ARTICULOS | TICKETS») y la lista de asistentes no se importan. En las hojas de 2023 y
  2024 la columna del precio es el total de la línea, no el precio por unidad. Ojo: sumar la
  columna «total» de toda la hoja cuenta dos veces lo comprado (líneas más tickets).
- `App` muestra un selector de quedada cuando hay más de una; `ListaCompra` recibe `quedadaId`.
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
