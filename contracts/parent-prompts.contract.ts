/**
 * Contrato v1 — Módulo de Versionado del Prompt Padre (Etapa 1A)
 * Endpoints cubiertos:
 *  - GET    /api/v1/projects/:projectId/parent-prompts                    (Listar historial de versiones)
 *  - GET    /api/v1/projects/:projectId/parent-prompts/:promptId          (Detalle de una versión)
 *  - POST   /api/v1/projects/:projectId/parent-prompts                    (Crear nuevo borrador DRAFT)
 *  - PATCH  /api/v1/projects/:projectId/parent-prompts/:promptId          (Editar contenido/resumen de un DRAFT)
 *  - DELETE /api/v1/projects/:projectId/parent-prompts/:promptId          (Eliminar un borrador DRAFT)
 *  - POST   /api/v1/projects/:projectId/parent-prompts/:promptId/publish  (Publicar DRAFT como ACTIVE + sync GitHub)
 *  - POST   /api/v1/projects/:projectId/parent-prompts/:promptId/sync     (Reintentar sincronización GitHub del ACTIVE)
 *
 * Regla: Única fuente de verdad compartida entre /frontend y /backend.
 * Prohibido modificar sin aprobación explícita del propietario del proyecto.
 */

import type {
  ApiErrorResponse,
  FileSyncResult,
  SyncStatus,
} from './common.contract';

export type PromptStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type ParentPromptsErrorCode =
  | 'PROMPT_NOT_FOUND'
  | 'PROMPT_NOT_EDITABLE'
  | 'PROMPT_NOT_DRAFT'
  | 'PROMPT_NOT_ACTIVE'
  | 'PROMPT_ALREADY_ACTIVE';

export type ParentPromptsApiError = ApiErrorResponse<ParentPromptsErrorCode>;

/**
 * Constantes de validación compartidas para Zod (Backend) y formularios (Frontend).
 */
export const PARENT_PROMPT_VALIDATION = {
  CONTENT_MIN_LENGTH: 20,
  CONTENT_MAX_LENGTH: 50000,
  SUMMARY_MAX_LENGTH: 280,
  GITHUB_FILE_PATH: '.orquestador/prompt-padre.md',
} as const;

/**
 * Resumen de una versión del Prompt Padre para listados e historial.
 */
export interface ParentPromptSummary {
  id: string;
  projectId: string;
  versionNumber: number;
  summary: string | null;
  status: PromptStatus;
  syncStatus: SyncStatus;
  syncedToGithubAt: string | null; // ISO-8601 UTC
  lastSyncError: string | null;
  createdAt: string; // ISO-8601 UTC
}

/**
 * Detalle completo de una versión del Prompt Padre (incluye contenido íntegro).
 */
export interface ParentPromptDetail extends ParentPromptSummary {
  content: string;
  githubFileSha: string | null;
}

/**
 * Resultado de sincronización de los archivos afectados al publicar/reintentar el Prompt Padre.
 */
export interface ParentPromptSyncOutcome {
  parentPromptFile: FileSyncResult;
  agentsMdFile: FileSyncResult;
}

// ==========================================
// GET /api/v1/projects/:projectId/parent-prompts
// ==========================================

export interface ListParentPromptsResponse {
  projectId: string;
  activePromptId: string | null;
  /** Versiones ordenadas de mayor a menor versionNumber */
  versions: ParentPromptSummary[];
}

// ==========================================
// GET /api/v1/projects/:projectId/parent-prompts/:promptId
// ==========================================

export interface GetParentPromptResponse {
  prompt: ParentPromptDetail;
}

// ==========================================
// POST /api/v1/projects/:projectId/parent-prompts
// ==========================================

export interface CreateParentPromptDraftRequest {
  /** Texto Markdown del nuevo borrador (20 a 50 000 caracteres). Si se omite y viene baseVersionId, el servidor clona el contenido base. */
  content?: string;
  /** Nota breve de qué cambia en esta versión (máx. 280 caracteres) */
  summary?: string;
  /** ID opcional de una versión existente (ej. ACTIVE) desde la cual clonar el texto inicial */
  baseVersionId?: string;
}

export interface CreateParentPromptDraftResponse {
  prompt: ParentPromptDetail;
}

// ==========================================
// PATCH /api/v1/projects/:projectId/parent-prompts/:promptId
// ==========================================

export interface UpdateParentPromptDraftRequest {
  /** Solo permitido cuando status === 'DRAFT' */
  content?: string;
  /** Nota breve de cambios (null limpia el resumen) */
  summary?: string | null;
}

export interface UpdateParentPromptDraftResponse {
  prompt: ParentPromptDetail;
}

// ==========================================
// DELETE /api/v1/projects/:projectId/parent-prompts/:promptId
// ==========================================

export interface DeleteParentPromptDraftResponse {
  deletedPromptId: string;
  deletedAt: string; // ISO-8601 UTC
}

// ==========================================
// POST /api/v1/projects/:projectId/parent-prompts/:promptId/publish
// ==========================================

export interface PublishParentPromptRequest {
  /** Confirmación explícita para sobrescribir si existe conflicto de SHA externo */
  confirmOverwriteOnConflict?: boolean;
}

export interface PublishParentPromptResponse {
  publishedPrompt: ParentPromptDetail;
  archivedPromptId: string | null;
  sync: ParentPromptSyncOutcome;
}

// ==========================================
// POST /api/v1/projects/:projectId/parent-prompts/:promptId/sync
// ==========================================

export interface SyncParentPromptRequest {
  /** Confirmación explícita para reemplazar archivos si GitHub reportó conflicto de SHA */
  confirmOverwriteOnConflict?: boolean;
}

export interface SyncParentPromptResponse {
  prompt: ParentPromptDetail;
  sync: ParentPromptSyncOutcome;
}
