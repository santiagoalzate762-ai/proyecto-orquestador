# 04. Arquitectura y Herramientas del MVP — Proyecto Orquestador (Nombre Provisional)

## 1. Propósito de este Documento
Definir las tecnologías definitivas con versiones fijadas, la arquitectura de sesiones OAuth entre Frontend y Backend, el aislamiento de servicios de GitHub, la configuración del monorepo compartido y las reglas de seguridad obligatorias desde el día uno.

> **Nota de separación:** Este documento describe la arquitectura **del producto web que vamos a construir**. Los documentos del proyecto abarcan `01` al `05` dentro de `/docs` más `agents.md` en la raíz del repositorio.

---

## 2. Arquitectura General (Las 4 Zonas del Sistema)
El proyecto se estructura como un **monorepo en TypeScript** organizado por capas estrictas:

1. **Contratos Compartidos (`contracts/`):** Única fuente de verdad con las interfaces TypeScript que definen peticiones, respuestas y códigos de error entre Frontend y Backend.
2. **Cliente Web (`frontend/`):** Aplicación visual que corre en el navegador. Dibuja las 6 pantallas del MVP, muestra la vista previa `.ts` en solo lectura y consume el Backend mediante rutas relativas `/api/v1/*`. Nunca almacena claves de API ni se conecta directamente a GitHub o proveedores de IA.
3. **Servidor API (`backend/`):** El núcleo de la plataforma. Gestiona OAuth/sesiones, valida todas las entradas con Zod, administra Neon vía Prisma, ejecuta el motor de plantillas dinámicas (`agents.md`, prompts de construcción y prompts de arreglo), cifra/descifra secretos y aísla las operaciones de GitHub en dos servicios separados.
4. **Servicios Externos:**
   * **Base de Datos (PostgreSQL en Neon):** Persiste usuarios, proyectos, versiones inmutables del Prompt Padre y contratos, bóveda cifrada e historial reproducible de auditorías.
   * **API de GitHub (OAuth App + Octokit):** Fuente de repositorios, ramas, PRs y diffs; destino controlado de contratos aprobados, `.orquestador/prompt-padre.md` y `agents.md`.
   * **APIs de IA (Etapa 1B):** Proveedores externos (Google Gemini, OpenAI, DeepSeek) llamados exclusivamente desde el Backend con la clave descifrada en memoria del usuario.

---

## 3. Stack Tecnológico Definitivo (Versiones Fijadas)

### Entorno Global
* **Node.js:** `22 LTS`
* **TypeScript:** `5.x` en modo estricto (`"strict": true`, prohibido `any`).
* **Gestión de Monorepo:** `npm workspaces` desde la raíz (`workspaces: ["contracts", "frontend", "backend"]`) exponiendo los tipos como paquete interno `@orquestador/contracts`.

### Capa de Frontend (`frontend/`)
* **Framework UI:** React `19` + TypeScript.
* **Empaquetador:** Vite `6`.
* **Estilos:** Tailwind CSS `v4` (`@tailwindcss/vite`).
* **Navegación y peticiones:** React Router `7` + cliente `fetch` tipado con `@orquestador/contracts` enviando siempre `credentials: "include"` y cabecera `X-CSRF-Token` en mutaciones.

### Capa de Backend (`backend/`)
* **Servidor web:** Express `4.21 LTS` + TypeScript.
* **Validación en vivo:** Zod `3.x` (cada esquema de entrada debe tiparse contra su contrato usando `satisfies z.ZodType<Tipo>` para impedir divergencias).
* **Seguridad HTTP base:** `helmet`, `cors` estricto a `APP_ORIGIN`, `cookie-parser`, `express-rate-limit` y límite de cuerpo JSON (`1mb`).
* **Integración con GitHub:** GitHub OAuth App (scopes mínimos: `read:user`, `repo`) + `@octokit/rest` dividido en dos servicios independientes:
  * `services/github/githubReadOnlyService.ts`: **Únicamente métodos `GET`** (listar repos, ramas, PRs, comparar commits y leer diffs). Es el único servicio permitido para el módulo auditor.
  * `services/github/githubSyncService.ts`: Controla lectura de `SHA` y escritura (`createOrUpdateFileContents`) exclusivamente para contratos aprobados, `.orquestador/prompt-padre.md` y `agents.md`.
* **Cifrado de secretos:** Módulo nativo `crypto` de Node.js con **AES-256-GCM**, codificación fija en `base64`, `AAD` por usuario y versionado de llave (`keyVersion`).
* **Conectores de IA (Etapa 1B):** Adaptadores internos usando `@google/genai` (Gemini) y `openai` (ChatGPT y DeepSeek).

### Base de Datos
* **Motor y alojamiento:** PostgreSQL en **Neon** (plan gratuito).
* **ORM:** Prisma `6` configurado con `url = env("DATABASE_URL")` (conexión *pooled* para runtime) y `directUrl = env("DIRECT_URL")` (conexión directa obligatoria para migraciones SQL en Neon).

---

## 4. Autenticación, Sesión y Comunicación Vercel ↔ Render

Dado que el Frontend (Vercel) y el Backend (Render) corren en infraestructura separada, la arquitectura evita problemas de cookies *cross-site* de la siguiente forma:

1. **Proxy `/api` en el dominio del Frontend:**
   * En desarrollo local: Vite proxy (`/api` → `http://localhost:4000`).
   * En producción (Vercel): Regla `rewrites` en `vercel.json` que redirige `/api/:path*` al dominio del Backend en Render. Así el navegador percibe todas las peticiones como **mismo origen (*first-party*)**.
2. **Flujo GitHub OAuth completo:**
   * `GET /api/v1/auth/github`: Genera un `state` aleatorio de 32 bytes, lo guarda en una cookie efímera (`orq_oauth_state`, `HttpOnly`, `Secure`, `SameSite=Lax`, 10 min) y redirige a GitHub con `scope=read:user repo`.
   * `GET /api/v1/auth/github/callback`: Valida `state` con comparación segura en tiempo constante, intercambia `code` por el `access_token`, consulta el perfil de GitHub, cifra el token con AES-256-GCM (`AAD = userId`) y crea/actualiza el usuario en Neon.
3. **Sesión y Cookies:**
   * El servidor firma un token de sesión (`HS256` con `SESSION_SECRET`) que incluye `{ userId, sessionVersion }` y lo guarda en cookie **`orq_session`** (`HttpOnly`, `Secure` en producción, `SameSite=Lax`, `Path=/`, expiración `7 días`).
   * Cada petición autenticada verifica la firma y que `sessionVersion` coincida con `User.sessionVersion` en Neon.
4. **Protección CSRF (Doble Envío + Origen):**
   * Al crear la sesión, el servidor emite también la cookie no-HttpOnly **`orq_csrf`** (`SameSite=Lax`, `Secure` en prod).
   * Toda petición mutadora (`POST`, `PUT`, `PATCH`, `DELETE`) debe incluir la cabecera `X-CSRF-Token` coincidente con `orq_csrf` y pasar validación de cabecera `Origin` contra `APP_ORIGIN`.
5. **Cierre de sesión y revocación:**
   * `POST /api/v1/auth/logout` incrementa `User.sessionVersion` en Neon (revocando de inmediato cualquier token previo) y borra `orq_session` y `orq_csrf`.
   * Si el usuario revoca la app desde GitHub y Octokit devuelve `401`, el Backend responde `401 GITHUB_TOKEN_REVOKED` para solicitar reconexión.

---

## 5. Protocolo de Sincronización Segura con GitHub (SHA y Fallos Parciales)

Las transacciones de Prisma (`$transaction`) solo garantizan atomicidad dentro de Neon, nunca sobre GitHub. Por ello se aplica un protocolo en dos fases:

1. **Fase 1 — Persistencia Atómica en Neon:** Se guarda el cambio de estado (`APPROVED` o `ACTIVE`) con `syncStatus = PENDING` dentro de `prisma.$transaction`. El contenido queda inmutable desde ese instante.
2. **Fase 2 — Publicación Controlada por Archivo en `defaultBranch`:**
   * Antes de escribir cada archivo (`{contractsPath}/{moduleName}.contract.ts`, `.orquestador/prompt-padre.md` o `agents.md`), `githubSyncService` consulta su `SHA` actual en GitHub.
   * **Detección de conflictos:** Si existe un `SHA` almacenado previamente en Neon y difiere del `SHA` remoto (edición manual externa), o si es la primera sincronización y el archivo ya existía en GitHub sin confirmación de reemplazo, **se cancela la escritura** y se marca `syncStatus = CONFLICT` (nunca se sobrescribe a ciegas).
   * **Rama protegida:** Si GitHub rechaza el commit (`403`/`409`/`422`), se marca `syncStatus = FAILED` y se informa `GITHUB_BRANCH_PROTECTED`.
   * **Fallo parcial e idempotencia:** Cada archivo registra su propio `syncStatus` y `githubFileSha`. Si el contrato se publica (`SYNCED`) pero `agents.md` falla (`FAILED`), el usuario puede pulsar **"Reintentar sincronización"** de forma segura sin crear nuevas versiones.

---

## 6. Despliegue de Monorepo y Propiedad de Archivos Raíz

* **Dueño de archivos de raíz y configuración:** Los archivos en la raíz del repositorio (`package.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `vercel.json`, `agents.md`, `docs/`) pertenecen exclusivamente al **desarrollador humano** (ni el agente de Frontend ni el de Backend los modifican).
* **Despliegue en Vercel (Frontend):** Directorio del repositorio en raíz; comando de construcción compila `@orquestador/contracts` (solo tipos) y `frontend/` (`npm run build --workspace=frontend`), publicando `frontend/dist` junto con `vercel.json` para el proxy `/api/*`.
* **Despliegue en Render (Backend):** Servicio Web desde la raíz del repositorio; comando de instalación `npm ci`, migración `npx prisma migrate deploy --schema=backend/prisma/schema.prisma`, construcción `npm run build --workspace=backend` y arranque `npm run start --workspace=backend`.

---

## 7. Estructura de Carpetas del Repositorio
```text
/
├── agents.md                        # Reglas globales para las IAs que construyen esta plataforma
├── package.json                     # npm workspaces (contracts, frontend, backend) [Humano]
├── tsconfig.base.json               # Configuración TypeScript estricta compartida [Humano]
├── .gitignore                       # Ignora .env, node_modules, dist [Humano]
├── .env.example                     # Plantilla de variables sin secretos [Humano]
├── vercel.json                      # Proxy /api/* hacia Render en producción [Humano]
├── docs/                            # Documentos 01 al 05 (incluyendo 05-modelo-de-datos/)
├── contracts/                       # Paquete interno @orquestador/contracts (solo tipos TS)
│   ├── package.json
│   ├── common.contract.ts
│   ├── auth.contract.ts             # Aprobado (v1)
│   ├── projects.contract.ts
│   ├── parent-prompts.contract.ts   # Aprobado (v1)
│   └── contracts-manager.contract.ts# Aprobado (v1)
├── frontend/                        # React 19 + Vite 6 + Tailwind v4 + TypeScript
│   └── src/
│       ├── pages/                   # Las 6 pantallas del MVP
│       ├── components/              # Semáforos, tarjetas, formulario guiado, visor TS solo lectura
│       └── services/                # Cliente HTTP tipado hacia /api/v1/*
└── backend/                         # Node.js 22 + Express 4.21 + Prisma 6 + Zod 3
    ├── prisma/
    │   ├── schema.prisma            # Definición de tablas en Neon (url + directUrl)
    │   └── migrations/              # Migraciones SQL (incluye índices únicos parciales)
    └── src/
        ├── middleware/              # Auth cookie, CSRF, rate limit, redacción de logs, errores
        ├── routes/                  # Rutas /api/v1/*
        ├── controllers/             # Validación con Zod tipado contra @orquestador/contracts
        ├── services/
        │   ├── github/
        │   │   ├── githubReadOnlyService.ts  # Solo GET (usado por auditorías y listados)
        │   │   └── githubSyncService.ts      # Escritura con SHA (usado solo por sincronización)
        │   ├── templates/           # Generador dinámico de agents.md, .ts y prompts fijos
        │   ├── security/            # Cifrado AES-256-GCM (AAD + keyVersion + base64)
        │   └── ai/                  # Adaptadores Gemini, OpenAI y DeepSeek (Etapa 1B)
        └── db/                      # Cliente Prisma conectado a Neon
```
