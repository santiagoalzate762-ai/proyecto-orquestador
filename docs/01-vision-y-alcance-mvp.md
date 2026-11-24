# 01. Visión y Alcance del MVP — Proyecto Orquestador (Nombre Provisional)

## 1. Resumen del Producto
**Proyecto Orquestador** es una aplicación web conectada a GitHub diseñada para automatizar una metodología propia de desarrollo de software asistido por múltiples inteligencias artificiales bajo separación estricta por capas.

Su propósito no es generar código desordenado más rápido, sino imponer disciplina de ingeniería: un **Prompt Padre versionado**, contratos obligatorios en TypeScript antes de programar, fronteras claras entre Frontend y Backend, auditorías realizadas por IAs distintas a las que escribieron el código y documentación siempre sincronizada en el repositorio.

---

## 2. El Problema que Resuelve
Cuando un desarrollador o equipo pequeño programa usando varias IAs de forma manual, suele enfrentarse a cuatro problemas repetitivos:
1. **Mezcla de responsabilidades:** Una IA encargada de lo visual termina tocando lógica del servidor o viceversa.
2. **Desincronización entre capas:** El Frontend espera datos o rutas con nombres distintos a los que implementó el Backend.
3. **Falsa sensación de seguridad:** La misma IA que escribe el código es la que lo revisa, dejando pasar vulnerabilidades y errores de tipado.
4. **Fricción manual y pérdida de contexto:** El desarrollador pierde tiempo manteniendo chats separados, actualizando a mano el Prompt Padre o `agents.md` y redactando prompts largos para cada corrección.

---

## 3. Visión a Largo Plazo (Evolución del Producto)
El producto crecerá en tres escalones claros sin desechar trabajo previo:

* **Versión 1 (MVP = Etapa 1A + Etapa 1B):** Plataforma web organizadora + generación de contratos con IA + auditoría manual en solo lectura + prompts de corrección generados por plantillas seguras.
* **Versión 1.5 (Post-MVP — Comodidad y Permisos Granulares):** Disparo automático de auditorías al subir cambios o abrir Pull Requests en GitHub (*Webhooks*) y migración opcional a **GitHub App** con tokens efímeros por repositorio.
* **Versión 2 (Norte del Producto — Nivel 3, Todo en Uno):** Trabajar **100% dentro de la misma plataforma**, sin salir a Google AI Studio ni copiar y pegar prompts afuera. Desde la web se gestiona el Prompt Padre, se aprueban contratos y los agentes de IA diseñan, programan Frontend y Backend en carpetas aisladas, auditan y aplican correcciones supervisadas en un solo entorno.

---

## 4. Alcance del MVP (Versión 1 — Dividido en 2 Etapas de Construcción)
El MVP completo incluye inteligencia artificial integrada y se construye en dos etapas consecutivas para mantener el desarrollo ordenado y auditable:

### Etapa 1A: Base Organizadora (Programación tradicional, sin IA interna)
Construye los cimientos sólidos de la plataforma usando código tradicional y plantillas deterministas:
* **Acceso, sesión segura y conexión con GitHub:** Inicio y cierre de sesión con cuenta de GitHub (OAuth), cookies seguras y vinculación de repositorios.
* **Mapa de capas del repositorio:** Definición visual de las rutas normalizadas (sin barra inicial) de `contracts`, `frontend` y `backend`.
* **Gestor del Prompt Padre por versiones:** Espacio para guardar, versionar (`v1`, `v2`, `v3`...) y sincronizar la guía maestra de cada proyecto en `.orquestador/prompt-padre.md`.
* **Gestor de Contratos por formulario guiado:** Formulario estructurado (con vista previa en TypeScript de **solo lectura**) que convierte casillas simples en un archivo `.ts` válido y lo sincroniza en GitHub al ser aprobado por el usuario.
* **Memoria viva (`agents.md`):** Generación y actualización automática de un único archivo `agents.md` en la raíz del repositorio del usuario usando plantillas fijas (con sus rutas configuradas), verificando siempre el `SHA` remoto para no sobrescribir cambios externos.
* **Asistente de prompts listos para copiar:** Botones que ensamblan automáticamente la versión vigente del Prompt Padre + el contrato aprobado + las reglas de la capa, listos para pegar en herramientas externas (Google AI Studio, OpenCode/VS Code).

### Etapa 1B: Motor Inteligente (IA integrada con claves propias del usuario)
Conecta las APIs de IA sobre la base auditada de la Etapa 1A para completar la Versión 1:
* **Bóveda de claves de IA (*Bring Your Own Key*):** Cada usuario guarda sus propias claves cifradas (Google Gemini, OpenAI/ChatGPT, DeepSeek) y elige qué proveedor/modelo cumple cada rol.
* **Generación asistida de contratos con IA:** La IA lee el Prompt Padre vigente o una descripción en español del usuario, genera un borrador estructurado validado con Zod (dentro de los tipos soportados por el MVP), permite pedir ajustes en español y exige **1 clic de aprobación humana** antes de congelarlo y sincronizarlo con GitHub.
* **Chequeo previo mecánico de fronteras (sin consumo de IA):** Antes de auditar una rama o Pull Request de GitHub, la plataforma identifica el commit exacto (`SHA`), cuenta los archivos modificados, alerta sobre cambios fuera de frontera o ramas demasiado grandes y solicita confirmación explícita indicando qué proveedor de IA recibirá el *diff*.
* **Auditoría cruzada con botón manual ("Auditar ahora"):** Revisión en **modo de solo lectura por arquitectura de código**, disparada únicamente cuando el usuario lo decide:
  * **Auditor de Frontend:** Compara cambios visuales contra los contratos aprobados en TypeScript (nombres, tipos estrictos y manejo de errores).
  * **Auditor de Backend:** Busca fallos de seguridad, validaciones faltantes, exposición de datos sensibles y (cuando existan contratos aprobados) cumplimiento de rutas, métodos y formas de respuesta.
* **Semáforo, reportes claros y Prompts de Corrección seguros:** Resultado visual (**Verde / Amarillo / Rojo / Error**), hallazgos clasificados por gravedad (sin almacenar fragmentos de código fuente del usuario en la base de datos) y un botón de **"Copiar prompt de arreglo"** ensamblado por plantilla fija.

---

## 5. Qué queda EXPLÍCITAMENTE FUERA del MVP
Para asegurar una primera versión terminada y funcional, **no se incluirá en la Versión 1**:
* Programación o generación automática de código Frontend/Backend dentro de la plataforma (reservado para Versión 2).
* Corrección automática directa de archivos en GitHub por parte de las IAs (reservado para Versión 2).
* Disparo automático de auditorías mediante *Webhooks* de GitHub y migración a GitHub App (reservado para Versión 1.5).
* Edición libre directa del texto TypeScript de contratos (en el MVP el `.ts` es vista previa de solo lectura para garantizar sincronía con `schemaJson`).
* Objetos anidados, uniones complejas o valores `null` en el formulario de contratos (el MVP cubre estructuras planas y arreglos primitivos).
* Guías separadas adicionales en subcarpetas (en el MVP la memoria viva se concentra en `agents.md` en la raíz + `.orquestador/prompt-padre.md`).
* Pantalla de eliminación definitiva de cuenta (el MVP incluye cierre de sesión; el borrado en cascada queda preparado en base de datos para futuras versiones).
* Extensión para VS Code, aplicación de escritorio, soporte para GitLab/Bitbucket o cobros/suscripciones.

---

## 6. Público Objetivo Inicial
* Desarrolladores independientes (*solo-devs*) y emprendedores técnicos que ya trabajan con varias IAs y buscan orden, seguridad y consistencia.
* Estudiantes avanzados y equipos pequeños (2 a 4 personas) que construyen proyectos propios y quieren evitar el desorden típico del desarrollo improvisado con IA.

---

## 7. Criterios de Éxito del MVP
La Versión 1 se considerará completada cuando el creador pueda:
1. Iniciar sesión con GitHub, conectar un repositorio real, registrar la `v1` de su Prompt Padre y mapear sus tres carpetas.
2. Generar un contrato con formulario o IA, aprobarlo con un clic y verlo sincronizado de forma segura en GitHub junto con `agents.md` actualizado.
3. Subir cambios de Frontend y Backend a una rama o PR en GitHub, presionar **"Auditar ahora"**, recibir un reporte reproducible con semáforo y usar el **prompt de corrección** generado por plantilla para arreglar los fallos en VS Code hasta obtener luz verde.

---

## 8. Nota Metodológica (Separación entre "Qué" y "Cómo")
* **El Producto (este documento):** La aplicación web que automatiza el Prompt Padre, los contratos, el contexto vivo y las auditorías.
* **El Proceso de Construcción:** Este MVP se construirá aplicando manualmente la metodología por capas estrictas y auditoría cruzada real entre familias de modelos (Google AI Studio en Frontend auditado por **Claude**; OpenCode/DeepSeek en Backend auditado por **ChatGPT** en solo lectura; VS Code y GitHub como entorno compartido).
