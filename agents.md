# agents.md — Reglas de Ingeniería y Fronteras del Proyecto Orquestador

> **Lectura obligatoria:** Cualquier agente de IA (constructor o auditor) debe leer y respetar este documento antes de proponer, escribir o revisar código en este repositorio.
> **Nota importante:** Este archivo gobierna el repositorio donde **construimos Proyecto Orquestador** (cuyas carpetas propias son fijas: `contracts`, `frontend`, `backend`). En cambio, la plantilla que nuestro producto genera para los repositorios de sus usuarios finales debe leer dinámicamente `Project.contractsPath`, `Project.frontendPath` y `Project.backendPath`.

---

## 1. Resumen del Proyecto y Criterio de Avance de Fase
**Proyecto Orquestador** es una plataforma web conectada a GitHub que automatiza una metodología de desarrollo por capas estrictas: Prompt Padre versionado, contratos en TypeScript (*Contract-First*), sincronización segura de `agents.md` con control de `SHA` y auditorías manuales en modo solo lectura.

### Fase Activa Actual
* **Fase en construcción:** **Etapa 1A — Base Organizadora** (programación tradicional sin llamadas a APIs de IA).
* **Tablas activas en Etapa 1A:** `User`, `Project`, `ParentPromptVersion`, `Contract`.
* **Fase bloqueada por ahora:** **Etapa 1B — Motor Inteligente** (`UserApiKey`, `UserAiRoleConfig`, `AuditRun`, `AuditFinding`, adaptadores de Gemini/OpenAI/DeepSeek). **No implementar código de Etapa 1B** hasta cumplir el criterio de cierre de 1A.

### Criterio de Cierre de Etapa 1A (Requisito para habilitar 1B)
1. Todos los contratos de la Etapa 1A (Sección 6) están aprobados e implementados con compilación limpia (`tsc --noEmit` sin errores ni `any`).
2. Migraciones de Prisma aplicadas en Neon incluyendo ambos índices únicos parciales SQL (`unique_active_prompt_per_project` y `unique_approved_contract_per_module`).
3. Auditoría cruzada completa aprobada: Frontend revisado por **Claude** y Backend revisado por **ChatGPT** con 0 hallazgos `CRITICAL` y 0 `HIGH`.
4. Prueba manual de punta a punta exitosa: Login GitHub OAuth → listar/conectar repo → crear Prompt Padre `v1` → crear y aprobar contrato → sincronizar con GitHub verificando `SHA` → copiar prompt → Logout.

### Documentación Fuente de Verdad (`docs/`)
* `docs/01-vision-y-alcance-mvp.md`
* `docs/02-requerimientos-mvp.md`
* `docs/03-flujos-de-usuario-mvp.md`
* `docs/04-arquitectura-y-herramientas-mvp.md`
* `docs/05-modelo-de-datos/` (subdocumentos `05.1` al `05.6`)

---

## 2. Stack Tecnológico Oficial (Versiones Fijadas)
* **Runtime y Lenguaje:** Node.js `22 LTS` + TypeScript `5.x` (`"strict": true`, cero `any`).
* **Monorepo:** `npm workspaces` con paquete compartido `@orquestador/contracts`.
* **Frontend (`frontend/`):** React `19` + Vite `6` + Tailwind CSS `v4` + React Router `7`.
* **Backend (`backend/`):** Express `4.21 LTS` + Zod `3.x` + Prisma `6` + `helmet` + `cors` + `cookie-parser` + `express-rate-limit`.
* **Base de Datos:** PostgreSQL en **Neon** (`DATABASE_URL` pooled + `DIRECT_URL` directo para migraciones).
* **GitHub:** GitHub OAuth App (`read:user`, `repo`) + `@octokit/rest` aislado en `githubReadOnlyService` y `githubSyncService`.
* **Cifrado:** Node `crypto` `AES-256-GCM` en `base64` con `AAD` y `keyVersion`.

---

## 3. Mapa de Carpetas y Propiedad de Archivos (Fronteras Estrictas)

```text
/
├── agents.md, docs/, package.json, tsconfig.base.json, .gitignore, .env.example, vercel.json  [SOLO HUMANO]
├── contracts/       # ÚNICA fuente de verdad de tipos (@orquestador/contracts) [SOLO APROBACIÓN HUMANA]
├── frontend/        # Solo interfaz visual, estado UI y llamadas a /api/v1/*   [AGENTE FRONTEND]
└── backend/         # Solo API Express, Zod, Prisma (Neon), Octokit y cifrado  [AGENTE BACKEND]
```

### Leyes de Frontera (Violación = Auditoría en ROJO)
1. **Archivos de raíz y documentación:** Pertenecen exclusivamente al desarrollador humano. Ningún agente constructor debe modificar `package.json` raíz, `tsconfig.base.json`, `.gitignore`, `.env.example`, `vercel.json`, `docs/` ni `agents.md`.
2. **Agente de Frontend (`frontend/`):**
   * **Permitido:** Editar únicamente archivos dentro de `frontend/`. Importar tipos desde `@orquestador/contracts`.
   * **Prohibido:** Crear o modificar archivos en `backend/`, `contracts/` o raíz. Almacenar secretos o llamar directamente a GitHub o APIs de IA desde el navegador.
3. **Agente de Backend (`backend/`):**
   * **Permitido:** Editar únicamente archivos dentro de `backend/` (incluyendo `backend/prisma/`). Importar tipos desde `@orquestador/contracts`.
   * **Prohibido:** Crear o modificar archivos en `frontend/`, `contracts/` o raíz.
4. **Contratos (`contracts/`):**
   * Solo contienen tipos, interfaces, códigos de error y constantes de validación puras (sin lógica ejecutable ni dependencias externas).
   * Para evolucionar un contrato aprobado nunca se altera de forma silenciosa: se propone una nueva versión o cambio en borrador que requiere aprobación explícita del humano y actualización de la Sección 6.

---

## 4. Roles Lógicos y Asignación de Herramientas (Auditoría Cruzada Real)
Se separa el **rol lógico** de la herramienta concreta para garantizar que el modelo auditor pertenezca siempre a una familia distinta al constructor:

| Capa | Rol Lógico Constructor | Herramienta Asignada | Rol Lógico Auditor (Solo Lectura) | Herramienta Auditora Asignada |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | Constructor de UI y consumo tipado | Google AI Studio / Edición en VS Code | Auditor de Contratos, Tipos y Manejo de Errores | **Claude** (familia distinta a Gemini/AI Studio) |
| **Backend** | Constructor de API, Prisma y Seguridad | OpenCode / DeepSeek en VS Code | Auditor de Seguridad, Zod, Prisma y Contratos | **ChatGPT** (modo estrictamente de solo lectura) |

---

## 5. Reglas de Ingeniería Obligatorias

### Generales y de Contratos
1. **Contract-First estricto:** No se programa ningún endpoint ni pantalla conectada al API hasta que su archivo de contrato esté aprobado y registrado en la Sección 6.
2. **Cero `any`:** Todo dato de entrada, salida, estado y error debe estar tipado explícitamente.
3. **Estructura global de errores:** Todo error HTTP del Backend usa `ApiErrorResponse` de `contracts/common.contract.ts`.
4. **Alineación Zod ↔ Contratos:** Cada esquema Zod del Backend debe verificarse en compilación contra su interfaz de contrato (`satisfies z.ZodType<TipoDelContrato>`).

### Autenticación, Sesión y Línea Base HTTP
5. **Sesión y OAuth seguros:** Autenticación mediante cookie `orq_session` (`HttpOnly`, `Secure` en prod, `SameSite=Lax`, expiración 7 días) servida bajo el proxy `/api`, validación de `state` en OAuth, protección CSRF (`orq_csrf` + cabecera `X-CSRF-Token` + validación de `Origin` en mutaciones) y cierre de sesión con incremento de `User.sessionVersion`.
6. **Línea base de seguridad HTTP:** Obligatorio activar `helmet`, `cors` restringido a `APP_ORIGIN`, límite de tamaño JSON (`1mb`), `express-rate-limit` (Auth: 20 req/15 min; Sincronización GitHub: 30 req/15 min; API general: 120 req/min), redacción automática de secretos en logs (jamás loguear cookies, tokens, claves ni encabezados `Authorization`) y mantener `.env.example` actualizado sin valores reales.

### Base de Datos (Neon/Prisma), Secretos y GitHub
7. **Prohibido `prisma db push`:** Usar exclusivamente `prisma migrate dev` (local) y `prisma migrate deploy` (producción) con `DIRECT_URL` para preservar los índices únicos parciales SQL.
8. **Transacciones atómicas con orden estricto:** Dentro de `prisma.$transaction`, siempre archivar/deprecar la versión vigente anterior **antes** de activar/aprobar la nueva versión. Capturar colisiones de unicidad (`P2002`) y responder `409 VERSION_CONFLICT`.
9. **Inmutabilidad de contenido:** Nunca sobrescribir los campos de contenido de un `ParentPromptVersion` (`ACTIVE`/`ARCHIVED`) ni de un `Contract` (`APPROVED`/`DEPRECATED`). Solo se actualizan metadatos de estado y sincronización.
10. **Aislamiento de GitHub y control SHA:** Los flujos de lectura y auditoría solo pueden importar `githubReadOnlyService`. Solo `githubSyncService` escribe en GitHub y debe verificar el `SHA` remoto antes de cada actualización sin sobrescribir cambios externos.
11. **Verificación de propiedad (Autorización):** Toda consulta o mutación sobre `Project`, `ParentPromptVersion`, `Contract` o `AuditRun` debe validar que el recurso pertenece al `userId` autenticado.
12. **Cero código fuente del usuario en Neon:** Los diffs leídos de GitHub se procesan en memoria y se descartan; ningún campo persistido guarda extractos de código del repositorio.

---

## 6. Registro de Contratos (Etapa 1A)
*Regla de mantenimiento:* Cada vez que se apruebe o evolucione un contrato, el desarrollador humano actualiza esta tabla antes de habilitar su programación en Frontend o Backend.

| Módulo | Archivo | Endpoints / Alcance | Estado | Versión |
| :--- | :--- | :--- | :--- | :--- |
| **Común** | `contracts/common.contract.ts` | Tipos compartidos, `ApiErrorResponse`, `SyncStatus`, códigos comunes | **Aprobado** | `v1` |
| **Autenticación** | `contracts/auth.contract.ts` | Login GitHub OAuth, `/auth/me`, `/auth/csrf`, `/auth/logout` | **Aprobado** | `v1` |
| **Proyectos** | `contracts/projects.contract.ts` | Listar repos GitHub, listar/conectar/editar rutas/desconectar proyectos | **Aprobado** | `v2` |
| **Prompt Padre** | `contracts/parent-prompts.contract.ts` | Listar versiones, crear/editar/borrar `DRAFT`, publicar `ACTIVE`, reintentar sync | **Aprobado** | `v1` |
| **Gestor de Contratos** | `contracts/contracts-manager.contract.ts` | CRUD borradores (`schemaJson`), vista previa `.ts`, aprobar/retirar, `agents.md`, prompts | **Aprobado** | `v1` |
