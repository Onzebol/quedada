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

_Pendiente: almacenamiento compartido entre varias personas (hoy solo `localStorage`, por navegador)._

## Convenciones

- Idioma de la interfaz, issues, PRs y commits: español.
- **TDD obligatorio**: primero un test que falla (rojo), luego el código mínimo para que pase
  (verde), luego refactor. Ningún cambio de comportamiento sin test previo.
- Estructura: `src/` con `App.tsx` y `main.tsx`; los tests van junto al código como
  `*.test.ts(x)`; la configuración común de tests está en `src/test/setup.ts`.
- Dominio (`src/dominio/`, sin React): `tipos.ts` (Quedada, Grupo, Producto, Participante),
  `totales.ts` (funciones puras de totales), `repositorio.ts` (interfaz asíncrona) y
  `repositorioLocalStorage.ts` (implementación actual). `fabrica.ts` crea datos de prueba.
  `operaciones.ts` (altas, ediciones y borrados de participantes, comidas y productos, siempre
  devolviendo una quedada nueva), `filtros.ts` (filtros de la lista) y `numeros.ts` (leer y
  mostrar cantidades con coma decimal).
- Interfaz de la compra (`src/compra/`): `ListaCompra` (filtro, participantes, comidas),
  `GrupoCompra`, `FilaProducto` y el hook `useQuedada`, que carga la primera quedada del
  repositorio (o crea una con las comidas habituales) y guarda cada cambio. `App` recibe el
  repositorio y el generador de ids por props para poder probarlo con un repositorio en memoria
  (`src/test/repositorioMemoria.ts`). Los estilos de `compra.css` son mínimos a propósito: la
  dirección visual definitiva es la issue #11.
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
