# 03. Flujos de Usuario del MVP — Proyecto Orquestador (Nombre Provisional)

## 1. Propósito de este Documento
Describir el recorrido paso a paso que sigue una persona dentro de la aplicación web para completar cada tarea principal del MVP, definiendo las pantallas mínimas necesarias, el manejo de sincronización parcial y las respuestas ante errores.

---

## 2. Mapa de Pantallas Mínimas del MVP
Toda la aplicación web se organiza en **6 pantallas concretas**:

1. **Pantalla de Inicio / Acceso:** Presentación breve y botón **"Continuar con GitHub"**.
2. **Panel de Proyectos (Dashboard):** Tarjetas con los repositorios conectados, versión vigente del Prompt Padre, estado de sincronización de `agents.md`, último semáforo de auditoría (vacío en Etapa 1A), botón **"+ Conectar repositorio"** y menú de usuario con **"Cerrar sesión"**.
3. **Asistente de Configuración del Proyecto:** Listado de repositorios de GitHub del usuario, mapeo de las 3 carpetas normalizadas (`contracts`, `frontend`, `backend`) y carga inicial del **Prompt Padre `v1`**.
4. **Espacio del Proyecto — Pestañas "Prompt Padre" y "Contratos / Memoria":**
   * Historial, estado de sincronización y editor de versiones del Prompt Padre (`v1`, `v2`...).
   * Lista de contratos (`Borrador` / `Aprobado` / `Desactualizado`) con insignia de sincronización con GitHub (`Sincronizado` / `Pendiente` / `Conflicto` / `Error`), formulario guiado + vista previa `.ts` de **solo lectura**, asistente IA (Etapa 1B), vista previa de `agents.md`, botones **"Reintentar sincronización"** y **"Copiar prompt"**.
5. **Espacio del Proyecto — Pestaña "Auditorías" (Etapa 1B):** Selector explícito de **Rama** o **Pull Request** de GitHub, panel previo de fronteras/archivos/consentimiento de proveedor, botón **"Auditar ahora"**, historial reproducible con commit `SHA` y semáforo, y tarjetas de hallazgos con **"Copiar prompt de arreglo"**.
6. **Configuración de Claves de IA (Cuenta — Etapa 1B):** Bóveda cifrada para guardar, probar y borrar claves de API propias y asignar el modelo correspondiente a cada rol.

---

## 3. Flujo 1: Primer ingreso, conexión de proyecto, Prompt Padre `v1` y cierre de sesión (Etapa 1A)
**Objetivo:** Autenticar de forma segura y dejar un proyecto conectado con su base sincronizada en menos de 5 minutos.

1. El usuario entra a la web y hace clic en **"Continuar con GitHub"**.
2. El Backend genera un parámetro `state` aleatorio, redirige a GitHub OAuth (`read:user`, `repo`), valida el regreso, guarda el token cifrado, emite la cookie de sesión segura (`HttpOnly`) y lleva al usuario al **Panel de Proyectos**.
3. El usuario hace clic en **"+ Conectar repositorio"**. La plataforma lista sus repositorios reales desde GitHub.
4. Elige un repositorio y configura las tres carpetas (por defecto: `contracts`, `frontend`, `backend`, sin barra inicial ni solapamientos).
5. Pega o redacta el texto inicial de su **Prompt Padre (`v1`)**.
6. Presiona **"Crear proyecto y sincronizar base"**.
7. **Proceso en dos pasos seguros:**
   * *Paso A (Base de datos):* Dentro de una transacción atómica en Neon, se crea el `Project` (vinculado por `githubRepoId`) y la `v1` del Prompt Padre directamente en estado **`ACTIVE`** con `syncStatus = PENDING`.
   * *Paso B (GitHub):* El servicio de sincronización intenta publicar `.orquestador/prompt-padre.md` y `agents.md` en `defaultBranch`.
   * Si en el repositorio ya existía un `agents.md` creado manualmente, se marca `CONFLICT` sin sobrescribirlo y se pide confirmación al usuario antes de reemplazarlo.
   * Si todo sale bien, ambos quedan en `SYNCED` y el usuario entra al **Espacio del Proyecto**.
8. **Cierre de sesión:** En cualquier momento el usuario puede hacer clic en **"Cerrar sesión"** desde el menú superior; el Backend invalida su sesión activa y limpia las cookies. *(La eliminación permanente de cuenta queda fuera del MVP).*

---

## 4. Flujo 2: Crear un contrato, aprobarlo, sincronizarlo y llevarlo a programar (Etapas 1A y 1B)
**Objetivo:** Definir y congelar un contrato antes de escribir código, manteniendo `schemaJson` y `.ts` siempre alineados.

1. En la pestaña **Contratos**, el usuario presiona **"+ Nuevo contrato"**.
2. Elige cómo armar el borrador:
   * **Modo Formulario (Etapa 1A):** Llena casillas simples (módulo, método HTTP, ruta, campos planos de entrada/salida con obligatoriedad y errores). En el panel derecho ve el archivo `.ts` generado en **solo lectura**.
   * **Modo Asistido por IA (Etapa 1B):** Describe en español lo que necesita (o pide sugerencias basadas en el Prompt Padre vigente). La IA genera un `schemaJson` validado con Zod y la plataforma dibuja el `.ts` en solo lectura. Puede pedir ajustes en español las veces que quiera.
3. El contrato se guarda en estado **`DRAFT`** (puede editarse o eliminarse libremente mientras siga en borrador).
4. Cuando el usuario confirma que está correcto, presiona **"Aprobar y sincronizar con GitHub"** (aprobación humana obligatoria).
5. La plataforma muestra una vista previa de los dos archivos que sincronizará en `defaultBranch`:
   * `{contractsPath}/{moduleName}.contract.ts`
   * `agents.md` (regenerado por plantilla con las rutas del proyecto y la lista actualizada de contratos aprobados).
6. Al confirmar:
   * Primero se ejecuta la transacción en Neon: cualquier versión `APPROVED` previa del mismo módulo pasa a `DEPRECATED` y la nueva queda `APPROVED` (contenido inmutable) con `syncStatus = PENDING`.
   * Luego el servicio de sincronización sube el contrato y actualiza `agents.md` verificando el `SHA` de cada archivo.
   * Si un archivo sube y el otro falla (fallo parcial), el contrato permanece `APPROVED` y la interfaz muestra exactamente cuál archivo quedó `SYNCED` y cuál quedó `FAILED` o `CONFLICT`, con el botón **"Reintentar sincronización"**.
7. Con el contrato aprobado, aparecen los dos botones listos para copiar:
   * **"Copiar prompt para Frontend"** (Prompt Padre vigente + contrato aprobado + reglas de `frontendPath`).
   * **"Copiar prompt para Backend"** (Prompt Padre vigente + contrato aprobado + reglas de `backendPath`).
8. El usuario pega cada prompt en sus herramientas externas (Google AI Studio, OpenCode en VS Code), programa la capa correspondiente y sube sus cambios a una rama o PR en GitHub.

---

## 5. Flujo 3: Evolucionar o retirar el Prompt Padre o un contrato (Etapa 1A)
**Objetivo:** Hacer crecer el proyecto o retirar endpoints viejos sin perder trazabilidad.

1. **Nueva versión:** Desde un Prompt Padre `ACTIVE` o un Contrato `APPROVED`, el usuario presiona **"Crear nueva versión"** (`v2`, `v3`...). Se crea un `DRAFT` con el contenido copiado como base mientras la versión anterior sigue intacta.
2. Al publicar/aprobar la nueva versión, la transacción archiva (`ARCHIVED`) o marca como desactualizada (`DEPRECATED`) la versión anterior primero y activa/aprueba la nueva después, sincronizando GitHub (`agents.md` y el archivo `.ts` / `.orquestador/prompt-padre.md`).
3. **Retirar un contrato sin reemplazo:** Desde un contrato `APPROVED`, el usuario puede presionar **"Retirar contrato"**, pasando su estado a `DEPRECATED` y regenerando `agents.md` para que las IAs sepan que ese endpoint ya no está vigente.
4. **Cambio de rutas del proyecto:** Si el usuario edita `contractsPath`, `frontendPath` o `backendPath` en la configuración del proyecto, la plataforma marca `agents.md` como pendiente de resincronización y avisa si hay contratos cuya ruta destino cambió.

---

## 6. Flujo 4: Configurar claves de API propias (Etapa 1B)
**Objetivo:** Conectar claves personales de forma segura y asignar roles de IA.

1. El usuario entra a **Configuración de Claves de IA** desde el menú superior.
2. Elige un proveedor (Google Gemini, OpenAI o DeepSeek), pega su clave y presiona **"Probar conexión"**.
3. Si pasa la prueba, la clave se cifra con `AES-256-GCM` (`keyVersion` + `AAD`) y en pantalla solo se muestra `keyHint` (ej. `...9a2f`).
4. Asigna proveedor y modelo para: **Asistente de contratos**, **Auditor de Frontend** y **Auditor de Backend**.
5. Si el usuario elimina una clave guardada, la plataforma limpia automáticamente los roles que apuntaban a ese proveedor y le muestra un aviso para reasignarlos.

---

## 7. Flujo 5: Ejecutar auditoría manual y corregir con Prompts de Arreglo (Etapa 1B)
**Objetivo:** Revisar un commit exacto en modo solo lectura y resolver fallos sin riesgo de inyección de prompts.

1. En la pestaña **Auditorías**, el usuario presiona **"Nueva auditoría"**.
2. Elige el tipo de referencia (**Rama** o **Pull Request**), selecciona cuál revisar y elige la capa (**Frontend**, **Backend** o **Ambas**).
   * *Regla de comparación:* Si es **Rama**, se compara contra `defaultBranch`. Si es **Pull Request**, se compara contra la rama base propia del PR.
3. **Paso preventivo (gratis, sin gastar IA):** La plataforma consulta GitHub en solo lectura y muestra:
   * El commit exacto (`headCommitSha` corto) y la lista de archivos modificados (con casillas para desmarcar archivos no esenciales).
   * Etiqueta visual para archivos de raíz/configuración fuera de las 3 carpetas.
   * Alerta inmediata si hay **violación mecánica de fronteras** (por ejemplo, archivos tocados en `contractsPath` o en la capa contraria).
   * Advertencia de volumen si la rama supera **25 archivos** o **100 KB de diff**.
   * **Aviso explícito de privacidad:** Indica exactamente qué proveedor(es) externo(s) (ej. OpenAI, Gemini, DeepSeek) recibirán temporalmente el *diff* seleccionado.
4. El usuario confirma y presiona **"Auditar ahora"**.
5. El Backend valida fronteras primero, ejecuta el/los auditor(es) correspondientes con los contratos aprobados y el Prompt Padre vigente, y guarda el reporte reproducible en Neon (sin almacenar código fuente).
6. Al finalizar, muestra el **Semáforo** (`GREEN`, `YELLOW`, `RED` o `ERROR`) y las tarjetas de hallazgos (archivo, línea, gravedad, explicación y recomendación).
7. En resultados `YELLOW` o `RED`, cada hallazgo y el resumen por capa ofrecen el botón **"Copiar prompt de arreglo"** (generado por plantilla fija del servidor), acompañado del recordatorio: *"Revisa el prompt antes de pegarlo en tu editor"*.
8. El usuario corrige en VS Code, sube el nuevo commit a GitHub y vuelve a presionar **"Auditar nuevamente"** hasta obtener luz **`GREEN`**.

---

## 8. Flujo 6: Caminos de Error (Respuestas claras ante fallos)
* **Auditar `FRONTEND` o `BOTH` sin contratos aprobados:** El botón se bloquea con el aviso *"Aprueba al menos un contrato antes de auditar Frontend o Ambas capas"* (ofreciendo enlace a Contratos o la opción de auditar solo `BACKEND` en modo seguridad).
* **Rama sin diferencias, rama eliminada o PR cerrado:** Antes de habilitar **"Auditar ahora"**, la plataforma informa el estado exacto sin consumir IA.
* **Conflicto de SHA en GitHub:** Si alguien editó `agents.md` o un contrato directamente en GitHub, la sincronización se detiene marcando `CONFLICT`, muestra el archivo afectado y pregunta al usuario si desea sobrescribirlo explícitamente o revisarlo primero en GitHub.
* **Rama principal protegida:** Si GitHub rechaza el commit en `defaultBranch` por reglas de protección, la plataforma guarda el estado `FAILED` con el mensaje claro indicando desactivar la restricción para el usuario o elegir otra rama destino.
* **Token de GitHub revocado o expirado:** El Backend responde `GITHUB_TOKEN_REVOKED` y la interfaz muestra el botón **"Reconectar con GitHub"**.
* **Clave de API inválida, sin saldo o fallo parcial en `BOTH`:** Si se detectó invasión de frontera, el resultado queda en `RED`; si no hubo invasión y un auditor falló, se muestra `ERROR` (preservando cualquier hallazgo válido del otro auditor en modo `BOTH`) y un enlace directo a **Configuración de Claves de IA**.
