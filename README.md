# Quedada

Aplicación web para organizar las quedadas anuales en una casa rural: la lista de la compra y los gastos, que hasta ahora vivían en un Excel.

**Web publicada:** https://onzebol.github.io/quedada/

## Estado

El proyecto está en sus primeros hitos. Cada hito es una [issue](https://github.com/Onzebol/quedada/issues) con su contexto y criterios de aceptación.

| Hito | Resultado |
|---|---|
| 1 | Andamiaje con Vite, React, TypeScript, Vitest y CI (hecho) |
| 2 | Modelo de datos y almacenamiento (hecho): tipos, totales en céntimos y repositorio SQLite en el navegador (`sql.js` + IndexedDB; migra los datos antiguos de `localStorage`) |
| 3 | Lista de la compra (hecho): comidas, productos, comprador, comprado, observaciones y filtros |
| 4 | Gastos y liquidación |
| 5 | Despliegue continuo en GitHub Pages |
| 6 a 9 | Importar el Excel, asistentes, memoria entre años y tickets |

## Requisitos

- Node.js 22 o superior
- npm

## Empezar

```bash
npm install
npm run dev
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests (una pasada) |
| `npm run test:watch` | Tests en modo vigilancia |
| `npm run coverage` | Tests con cobertura |
| `npm run lint` | Lint con oxlint |
| `npm run typecheck` | Comprobación de tipos |
| `npm run build` | Build de producción |

## Estructura

- `src/dominio/`: modelo y lógica sin React (tipos, totales, repositorio). Dinero en céntimos.
- `src/compra/`: la lista de la compra (React).
- `src/`: `App` y arranque de la interfaz.
- `.github/workflows/`: CI y despliegue.

## Cómo se trabaja

- Cada cambio parte de una issue y se hace en su propio git worktree, en `.worktrees/`.
- Los tests se escriben antes que el código (TDD).
- Todo entra por pull request, que cierra su issue con `Closes #<n>` y debe pasar la CI.
- Al fusionar en `main` se despliega en GitHub Pages.

Las normas detalladas, también para agentes de IA, están en [`AGENTS.md`](AGENTS.md).

## Stack

Vite, React, TypeScript, Vitest, React Testing Library, oxlint y GitHub Actions.
