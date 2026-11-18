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
| 4 | Gastos y liquidación (hecho): precio y descuento por producto, reparto (casa a partes iguales, comida por porcentaje) y quién paga a quién |
| 5 | Despliegue continuo en GitHub Pages |
| 6 | Importar el Excel (hecho): hojas «Compras 2023 a 2026» a quedadas, con la lista de quedadas |
| 7 | Asistentes y llegadas (hecho): familias con personas y hora de llegada, total de asistentes (los básicos se quitaron en #56: van en la lista de la compra) |
| 19 | Sesión con Google y enlace de la quedada (`#/<id>`): entrar/salir, nombre y foto, «Este soy yo» |
| 25 | Supabase: login con Google y quedadas por usuario (primer trozo; compartir, conocidos e invitaciones, después). Configuración: ver abajo |
| 30 | Supabase: una fila por cosa (participantes, comidas, productos…) y guardado por diferencias, para que varias personas editen sin pisarse (paso 1 de #29) |
| 32 | Tiempo real: los cambios de otra persona aparecen sin recargar (Broadcast desde la base de datos, canal privado por quedada; paso 2 de #29) |
| 36 | Eliminar quedadas, con confirmación |
| 55 | Pestañas en la quedada: La casa, Lista de la compra, Pagos (pagos de la casa por familia; tiques, pendiente) y Resumen |
| 56 | La casa: título, descripción con enlaces, dirección, precio y mapa (marcador ajustable y botón «Centrar» al editar; botón de la app de mapas en el móvil), familias con sus personas (cada comprador del Excel entra como una familia) y lo que paga cada una de casa y de los demás gastos; en «Pagos», quién pagó la casa; en el Resumen, lo que paga cada uno de la casa |
| 40 | Enlace de la quedada más corto: `#/<id>` (los antiguos `#/quedada/<id>` siguen funcionando) |
| 42 | Todos los borrados (quedada, comida, producto, asistente y básico) piden confirmación en una ventana modal con el estilo de la web |
| 43 | Menú de usuario: arriba a la derecha solo nombre de pila y foto; al pulsar se abre un menú con «Cerrar sesión» |
| 44 | Página inicial (sin `#/<id>`): añadir (modal), editar (modal), elegir y eliminar quedadas e importar el Excel; el título «Quedada» vuelve a ella (#97) y cada quedada muestra su nombre |
| 57 | Iconos (`lucide-react`) en los botones; en móvil (< 40 rem) solo se ve el icono, el texto queda como nombre accesible |
| 67 | Lista de la compra como «La casa»: secciones plegables y por orden alfabético, añadir y editar en ventanas modales, asignar también a familias sin personas, filtro «Mostrar» y totales; sin «Añadir participante» (se definen en «La casa») |
| 70 | Con un filtro activo en «Mostrar», la lista de la compra no muestra botones de añadir, renombrar, editar ni borrar |
| 72 | Botón de usuario: en pantallas estrechas se oculta el nombre y queda la foto |
| 113 | Botón de usuario solo con la foto (o la inicial); el nombre y el correo salen dentro del menú |
| 69 | App instalable (PWA): icono y favicon propios, manifiesto, funciona sin conexión (la interfaz) y avisa cuando hay una versión nueva con «Actualizar» |
| 77 | Botón «Instalar» junto al icono del usuario cuando el navegador permite instalar la aplicación |
| 79 | Pista para instalar en iOS: el botón «Instalar» abre los pasos «Compartir → Añadir a pantalla de inicio» |
| 8 y 9 | Memoria entre años y tickets |
| 95 | Las cuentas salen de lo que ha pagado cada uno (sección «Gastos» de «Pagos», aunque no esté en la lista) y de los pagos de la casa; los precios de la lista de la compra son solo orientativos |
| 118 | Tiques por foto: un gasto puede llevar la foto del tique (cámara o galería, reducida y guardada en Supabase Storage), con el total y el pagador escritos a mano |
| 120 | En «Pagos», casilla «Enviado» para cada persona que debe parte de la casa: el Resumen descuenta lo que ya ha enviado a quien la pagó |

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

## Cuentas y datos en Supabase

Con Supabase configurado, la gente entra con su cuenta de Google y sus quedadas se guardan en la nube, cada una visible solo para su propietaria (seguridad por fila). **Hay que entrar con Google para usar la app**: sin sesión solo se ve la pantalla de entrada (y, sin configuración de Supabase, un aviso).

1. Crea un proyecto en supabase.com y ejecuta en el editor SQL, por orden, `supabase/migrations/0001_quedadas.sql`, `0002_tablas.sql` y `0003_tiempo_real.sql` (la segunda pasa las quedadas existentes a tablas; si ya tenías datos, después de fusionar la PR del cambio vuelve a ejecutar una vez `select public.convertir_quedadas_desde_datos();`).
2. En Google Cloud Console crea un cliente OAuth «Aplicación web» con la URI de redirección que muestra Supabase (*Authentication → Providers → Google*) y pega su Client ID y secret en Supabase.
3. En *Authentication → URL Configuration* añade `https://onzebol.github.io/quedada/` y la URL de desarrollo.
4. Local: copia `.env.example` a `.env.local` y rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_CLAVE_PUBLICA`. Despliegue: variables de repositorio `SUPABASE_URL` y `SUPABASE_CLAVE_PUBLICA` (Settings → Secrets and variables → Actions → Variables).

En *Project Settings → Realtime* deja activado Realtime y desmarcado «Allow public access» (los canales son privados). La URL y la clave publishable son públicas; nunca pongas la `service_role` en la app ni en el repo. Los datos locales anteriores (SQLite del navegador) ya no se muestran y no se suben solos; la migración queda pendiente.

## Estructura

- `src/dominio/`: modelo y lógica sin React (tipos, totales, liquidación, repositorio). Dinero en céntimos.
- `src/compra/`: la lista de la compra (React).
- `src/cuentas/`: pagado por persona, ajustes de reparto y transferencias (React).
- `src/inicio/`: página inicial con la lista de quedadas (crear, elegir, eliminar).
- `src/importacion/`: importación del Excel de compras (`.xlsx`) a quedadas.
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
