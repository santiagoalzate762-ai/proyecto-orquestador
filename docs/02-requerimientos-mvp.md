# 02. Requerimientos Básicos del MVP — Proyecto Orquestador (Nombre Provisional)

## 1. Propósito de este Documento
Definir con precisión las funciones que debe cumplir la plataforma en su Versión 1 (MVP), las reglas de seguridad obligatorias, las fronteras exactas y las leyes internas del sistema.

> **Nota de alcance:** Todo lo descrito aquí aplica a **la plataforma producto** que usarán los usuarios finales (no a las herramientas manuales con las que la vamos a construir).

---

## 2. Requerimientos Funcionales (Qué hace la plataforma)

### Etapa 1A: Base Organizadora (Sin IA interna)

#### Acceso, sesión, repositorios y fronteras
* **RF-01 — Inicio y cierre de sesión con GitHub:** El usuario debe poder autenticarse mediante **GitHub OAuth** (con validación obligatoria de `state`, cookies seguras `HttpOnly`/`Secure`/`SameSite=Lax` y protección CSRF) y cerrar sesión de forma explícita invalidando su sesión activa.
* **RF-02 — Listado y vinculación de repositorios:** El usuario debe poder consultar los repositorios disponibles de su cuenta de GitHub, seleccionar uno o varios para registrarlos como proyectos (identificados internamente por su `githubRepoId` inmutable) y desconectar un proyecto de la plataforma cuando lo desee (sin borrar el repositorio en GitHub).
* **RF-03 — Mapeo y ajuste de carpetas por capa:** Para cada proyecto, el usuario debe poder asignar y actualizar las rutas exactas de las carpetas de **Contratos**, **Frontend** y **Backend** (normalizadas sin barra inicial ni final, ej. `contracts`, `frontend`, `backend`, y validando que no se solapen ni contengan `..`).

#### Gestión del Prompt Padre por versiones
* **RF-04 — Editor y versionado del Prompt Padre:** El usuario debe poder crear borradores, consultar historial, eliminar borradores no publicados y publicar nuevas versiones (`v1`, `v2`, `v3`...) del **Prompt Padre** de cada proyecto, manteniendo una única versión marcada como **Vigente (`ACTIVE`)** y conservando las anteriores como historial inmutable de solo lectura (`ARCHIVED`). Al crear el proyecto, la `v1` nace directamente como `ACTIVE`.

#### Gestión de Contratos y Memoria Viva
* **RF-05 — Creación de contratos por formulario guiado (vista `.ts` de solo lectura):** El usuario debe poder crear y editar borradores de contratos llenando campos simples (nombre del módulo, método HTTP, ruta, campos de entrada con tipo y obligatoriedad, campos de respuesta y errores esperados). La plataforma genera automáticamente una vista previa en TypeScript (`.ts`) en **modo estrictamente de solo lectura** para impedir desincronizaciones con `schemaJson`.
  * *Alcance de tipos del MVP:* Se admiten únicamente estructuras planas con los tipos base definidos en el subdocumento `05.6` (`string`, `number`, `boolean`, `string[]`, `number[]`, `iso-date`). Los campos se marcan como obligatorios u opcionales (`required: true/false`); no se soportan objetos anidados, valores `null` ni uniones personalizadas en la Versión 1, rechazándose explícitamente cualquier estructura fuera de este alcance.
* **RF-06 — Estados, evolución y retiro de contratos:** Cada contrato maneja tres estados de ciclo de vida: **Borrador (`DRAFT`)**, **Aprobado (`APPROVED`)** y **Desactualizado (`DEPRECATED`)**. Se permite eliminar un `DRAFT`, crear una nueva versión (`v2`, `v3`...) a partir de un contrato `APPROVED`, o retirar manualmente un contrato `APPROVED` pasándolo a `DEPRECATED` sin versión sucesora.
* **RF-07 — Sincronización segura con GitHub (protocolo SHA y reintentos):** La aprobación interna en base de datos está separada de la publicación externa en GitHub. Al aprobar un contrato o publicar una versión del Prompt Padre, la plataforma intenta escribir los archivos correspondientes en `defaultBranch` (`{contractsPath}/{moduleName}.contract.ts` y `.orquestador/prompt-padre.md`) verificando previamente el `SHA` remoto para no sobrescribir ediciones manuales externas. Si ocurre un conflicto de `SHA`, un error de red o una rama protegida, el estado de sincronización queda registrado (`FAILED` o `CONFLICT`) y se ofrece reintento idempotente sin duplicar versiones.
* **RF-08 — Actualización automática de `agents.md` por plantilla dinámica:** Cada vez que cambian las carpetas configuradas del proyecto, la versión vigente del Prompt Padre o los contratos aprobados, la plataforma debe regenerar automáticamente un **único archivo `agents.md`** en la raíz del repositorio del usuario utilizando las rutas configuradas del proyecto (`contractsPath`, `frontendPath`, `backendPath`), sin consumo de IA y respetando el mismo control de `SHA` y reintento de RF-07.
* **RF-09 — Generador de prompts listos para copiar:** Para cualquier contrato aprobado, el usuario debe poder copiar con un clic prompts completos que combinen automáticamente la versión vigente del Prompt Padre, el contrato seleccionado y las reglas dinámicas de frontera de la capa correspondiente (`frontendPath` o `backendPath`).

---

### Etapa 1B: Motor Inteligente (Con IA interna vía claves propias)

#### Conexión de claves de IA del usuario
* **RF-10 — Bóveda de claves de API (*Bring Your Own Key*):** El usuario debe poder registrar, probar la conexión y eliminar sus propias claves de API (Google Gemini, OpenAI/ChatGPT, DeepSeek), y asignar qué proveedor/modelo usará para: (a) asistir en la redacción de contratos, (b) auditar Frontend y (c) auditar Backend. Si el usuario elimina una clave de un proveedor, la plataforma debe limpiar automáticamente cualquier asignación que apunte a ese proveedor en su configuración de roles.

#### Contratos asistidos por IA
* **RF-11 — Generación asistida de borradores de contratos con IA:** El usuario debe poder solicitar un contrato describiéndolo en lenguaje natural (o pidiendo sugerencias a partir del Prompt Padre vigente). La IA debe devolver un objeto `schemaJson` estricto (limitado a los tipos soportados del MVP y validado con Zod + saneamiento anti-inyección), a partir del cual el servidor genera la vista previa `.ts` de solo lectura. El usuario puede pedir ajustes en español y debe dar **aprobación manual explícita** antes de congelarlo y sincronizarlo con GitHub.

#### Control de fronteras y Auditoría Manual
* **RF-12 — Chequeo previo mecánico de fronteras, referencia y volumen:** Al seleccionar una **rama** (comparada contra `defaultBranch`) o un **Pull Request** (comparado contra su propia rama base en GitHub) —y antes de consumir saldo de IA—, la plataforma debe:
  1. Obtener el `headCommitSha` y `baseCommitSha` exactos.
  2. Mostrar la lista de archivos modificados (con casillas para desmarcar archivos no esenciales y alerta si se supera el umbral de rama grande: **> 25 archivos** o **> 100 KB de diff**).
  3. Ejecutar primero la validación mecánica de fronteras según la tabla de reglas de la Sección 4.
  4. Mostrar qué proveedor(es) externo(s) de IA recibirán temporalmente el *diff* para obtener confirmación explícita del usuario.
* **RF-13 — Auditoría manual de Frontend (Contratos y Tipos):** Al presionar **"Auditar ahora"** (requiere al menos 1 contrato `APPROVED`), el auditor de Frontend compara los cambios dentro de `frontendPath` contra los contratos aprobados y el Prompt Padre vigente para detectar nombres distintos, tipos débiles (`any`), campos faltantes o errores sin manejar.
* **RF-14 — Auditoría manual de Backend (Seguridad y Contratos en Solo Lectura):** Al presionar **"Auditar ahora"**, el auditor de Backend analiza los cambios dentro de `backendPath` exclusivamente a través del servicio de lectura, buscando fallos de seguridad comunes (falta de validación de entradas, ausencia de control de acceso, exposición de datos sensibles o errores que filtren información interna) y, **cuando existan contratos aprobados**, verificando también cumplimiento de rutas, métodos HTTP y estructura de respuesta. Si no existen contratos aprobados, el Backend puede auditarse solo en seguridad mostrando un aviso explícito.
* **RF-15 — Panel de semáforo, trazabilidad e historial de auditorías:** La plataforma debe guardar el historial reproducible de cada auditoría (`refType`, `refName`, `baseBranch`, `headCommitSha`, archivos seleccionados/excluidos, versiones de contrato y modelos usados) con un semáforo claro:
  * **Rojo (`RED` — Bloqueado):** Violación mecánica de fronteras (prioridad máxima incluso si luego falla la IA), ruptura de contrato o al menos un hallazgo `CRITICAL` o `HIGH`.
  * **Amarillo (`YELLOW` — Con observaciones):** Sin violación de fronteras ni fallos críticos/altos, pero con hallazgos `MEDIUM` o `LOW`.
  * **Verde (`GREEN` — Aprobado):** Sin violación de fronteras ni hallazgos.
  * **Error (`ERROR` — Fallo técnico):** Fallo de red, clave inválida o proveedor sin saldo cuando no existió violación previa de fronteras. En auditorías `BOTH`, si un auditor responde y el otro falla, se preservan los hallazgos obtenidos con aviso explícito del fallo parcial.
* **RF-16 — Prompts de corrección generados por plantilla segura:** Cada reporte `YELLOW` o `RED` muestra hallazgos detallados (archivo, referencia de línea, gravedad y explicación en español sencillo, **sin almacenar fragmentos de código fuente del usuario**) junto con el botón **"Copiar prompt de arreglo"** (individual y consolidado por capa). Para prevenir inyección de prompts, los prompts de arreglo son ensamblados en el Backend mediante **plantillas fijas** a partir de los campos validados con Zod (nunca texto libre de prompt dictado por la IA), e incluyen en la interfaz un aviso para revisar antes de pegar en VS Code.

---

## 3. Requerimientos No Funcionales (Calidad, Seguridad y Usabilidad)

* **RNF-01 — Aislamiento de Solo Lectura por Arquitectura en Auditorías:** En el MVP se utiliza **GitHub OAuth** (alcance mínimo: `read:user` y `repo` para soportar repositorios públicos y privados). Por ello, la garantía de solo lectura de los auditores se impone **por arquitectura estricta de código**: el servicio auditor (`githubReadOnlyService`) está físicamente separado del servicio de sincronización (`githubSyncService`), solo expone operaciones `GET` de Octokit y nunca importa ni puede invocar métodos de escritura. La migración a tokens efímeros de solo lectura a nivel de GitHub (GitHub App) queda planificada para la Versión 1.5.
* **RNF-02 — Protección y rotación de claves cifradas:** Tanto los tokens de GitHub como las claves de API de IA se almacenan cifrados en Neon con **AES-256-GCM**, formato único `base64`, **AAD** ligado al usuario (`userId` / `userId:provider`) y columna `keyVersion` para permitir rotación futura. Nunca se devuelven al navegador ni se escriben en logs.
* **RNF-03 — Privacidad y no persistencia de código fuente:** Los fragmentos de código (*diff*) leídos de GitHub durante una auditoría se procesan únicamente en memoria y se descartan al finalizar. Ni `AuditRun` ni `AuditFinding` almacenan copias ni extractos literales del código fuente del usuario (solo rutas, referencias de línea y descripciones).
* **RNF-04 — Claridad en lenguaje humano:** Todos los reportes, alertas de conflicto de sincronización y errores deben redactarse en español claro, explicando qué pasó y qué acción tomar.
* **RNF-05 — Control transparente de consumo y consentimiento de proveedor:** Antes de ejecutar cualquier acción que consuma una clave de API del usuario, la plataforma debe mostrar el alcance exacto (archivos y tamaño aproximado) y el nombre del proveedor externo que recibirá temporalmente el contenido, esperando confirmación explícita.
* **RNF-06 — Manejo seguro de fallos externos:** Si GitHub (token revocado, rama protegida, conflicto de SHA) o un proveedor de IA falla, la plataforma debe informar el motivo con códigos claros sin corromper versiones ni perder borradores guardados.

---

## 4. Reglas de Negocio y Tabla de Fronteras (Leyes internas del sistema)

1. **Aprobación humana obligatoria en contratos:** La IA solo crea o ajusta contratos en estado `DRAFT`. Ningún contrato puede pasar a `APPROVED` ni sincronizarse con GitHub sin confirmación explícita del usuario humano.
2. **Inmutabilidad de contenido publicado:** Los campos de contenido de un `ParentPromptVersion` (`ACTIVE`/`ARCHIVED`) y de un `Contract` (`APPROVED`/`DEPRECATED`) nunca se sobrescriben. Solo los metadatos de sincronización y estado (`status`, `syncStatus`, `githubFileSha`, `syncedToGithubAt`, `lastSyncError`) pueden actualizarse.
3. **Disponibilidad de auditorías por capa:**
   * `FRONTEND`: Requiere al menos 1 contrato `APPROVED`.
   * `BACKEND`: Permitida siempre (con contratos aprobados audita seguridad + contratos; sin contratos audita solo seguridad con aviso).
   * `BOTH`: Requiere al menos 1 contrato `APPROVED` (si no hay ninguno, se bloquea y se sugiere aprobar un contrato o ejecutar solo `BACKEND`).
4. **Tabla obligatoria de reglas mecánicas de frontera (evaluadas antes que la IA):**

| Capa auditada (`AuditLayer`) | Archivos permitidos | Archivos que disparan Violación de Frontera (`RED` + `BOUNDARY`) | Archivos raíz / fuera de las 3 carpetas (`package.json`, `docs/`, `.gitignore`) |
| :--- | :--- | :--- | :--- |
| **`FRONTEND`** | Dentro de `frontendPath` | Cualquier archivo dentro de `backendPath` o `contractsPath` | No disparan violación de frontera; se etiquetan como *"Raíz/Config"* para que el usuario decida si los incluye. Si se editó `agents.md` o `.orquestador/prompt-padre.md` a mano, se muestra advertencia. |
| **`BACKEND`** | Dentro de `backendPath` | Cualquier archivo dentro de `frontendPath` o `contractsPath` | Mismo tratamiento neutro que arriba. |
| **`BOTH`** | Dentro de `frontendPath` (va al auditor FE) y `backendPath` (va al auditor BE) | Cualquier archivo dentro de `contractsPath` (los contratos no se editan desde ramas de código) | Mismo tratamiento neutro que arriba. |

5. **Prioridad de violación de frontera sobre `ERROR`:** Si el chequeo mecánico detecta invasión de fronteras, el resultado de la auditoría queda en `RED` aunque posteriormente falle la API de IA.
6. **Recomendación de separación de modelos:** Al configurar roles en la Etapa 1B, el sistema recomienda usar proveedores/modelos distintos para construir y auditar, sin bloquear la configuración.
7. **Ejecución estrictamente manual en el MVP:** Ninguna auditoría de IA se ejecuta automáticamente en segundo plano sin que el usuario presione **"Auditar ahora"**.

---

## 5. Mejoras Diferidas (Post-MVP)
* **Versión 1.5:** Disparo automático de auditorías mediante *Webhooks* de GitHub y migración opcional a **GitHub App** (tokens temporales de solo lectura a nivel de API de GitHub).
* **Versión 2 (Todo en Uno — Nivel 3):** Ejecución directa de diseño, programación por capas, vista previa y aplicación de correcciones dentro de la misma plataforma web.
