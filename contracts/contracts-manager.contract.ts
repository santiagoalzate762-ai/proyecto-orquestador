/**
 * Contrato v1 — Módulo Gestor de Contratos, agents.md y Prompts Copiables (Etapa 1A)
 * Endpoints cubiertos:
 *  - GET    /api/v1/projects/:projectId/contracts                       (Listar contratos del proyecto)
 *  - GET    /api/v1/projects/:projectId/contracts/:contractId           (Detalle: schemaJson + vista previa .ts solo lectura)
 *  - POST   /api/v1/projects/:projectId/contracts                       (Crear borrador DRAFT v1 o nueva versión v2+)
 *  - PATCH  /api/v1/projects/:projectId/contracts/:contractId           (Editar DRAFT vía schemaJson; regenera .ts)
 *  - DELETE /api/v1/projects/:projectId/contracts/:contractId           (Eliminar un borrador DRAFT)
 *  - POST   /api/v1/projects/:projectId/contracts/:contractId/approve   (Aprobación humana -> APPROVED + sync GitHub)
 *  - POST   /api/v1/projects/:projectId/contracts/:contractId/deprecate (Retiro manual de APPROVED -> DEPRECATED + sync agents.md)
 *  - POST   /api/v1/projects/:projectId/contracts/:contractId/sync      (Reintento idempotente de sync GitHub)
 *  - GET    /api/v1/projects/:projectId/contracts/:contractId/prompt    (RF-09: Prompt ensamblado por plantilla para Frontend/Backend)
 *  - GET    /api/v1/projects/:projectId/agents-md/preview               (Vista previa de agents.md generado por plantilla)
 *  - POST   /api/v1/projects/:projectId/agents-md/sync                  (Sincronizar o reintentar agents.md en GitHub)
 *
 * Regla: Única fuente de verdad compartida entre /frontend y /backend.
 * Prohibido modificar sin aprobación explícita del propietario del proyecto.
 */

import type {
  ApiErrorResponse,
  FileSyncResult,
  SyncStatus,
} from './common.contract';

export type ContractStatus = 'DRAFT' | 'APPROVED' | 'DEPRECATED';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Únicos tipos permitidos en schemaJson durante el MVP (V1).
 * No se admiten objetos anidados, null ni uniones personalizadas.
 */
export type ContractFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'number[]'
  | 'iso-date';

export type PromptTargetLayer = 'FRONTEND' | 'BACKEND';

export type ContractsManagerErrorCode =
  | 'CONTRACT_NOT_FOUND'
  | 'CONTRACT_NOT_EDITABLE'
  | 'CONTRACT_NOT_DRAFT'
  | 'CONTRACT_NOT_APPROVED'
  | 'NO_ACTIVE_PARENT_PROMPT'
  | 'INVALID_CONTRACT_SCHEMA'
  | 'RESERVED_IDENTIFIER';

export type ContractsManagerApiError = ApiErrorResponse<ContractsManagerErrorCode>;

/**
 * Reglas de validación compartidas para Zod (Backend) y formulario guiado (Frontend).
 * Los patrones regex se expresan como cadenas puras (sin lógica ejecutable) para anti-inyección en .ts.
 */
export const CONTRACT_VALIDATION = {
  MODULE_NAME_REGEX: '^[a-z][a-z0-9-]{1,48}$',
  FIELD_NAME_REGEX: '^[a-zA-Z_][a-zA-Z0-9_]*$',
  FIELD_NAME_MAX_LENGTH: 64,
  ERROR_CODE_REGEX: '^[A-Z][A-Z0-9_]{1,48}$',
  ENDPOINT_PATH_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 500,
  ERROR_MESSAGE_MAX_LENGTH: 300,
  ROLE_NAME_MAX_LENGTH: 50,
  MAX_ROLES: 20,
  MAX_FIELDS_PER_SECTION: 50,
  MAX_ERRORS_PER_CONTRACT: 20,
  ALLOWED_FIELD_TYPES: [
    'string',
    'number',
    'boolean',
    'string[]',
    'number[]',
    'iso-date',
  ],
} as const;

// ==========================================
// ESTRUCTURA OFICIAL DE Contract.schemaJson
// ==========================================

export interface ContractFieldDefinition {
  /** Identificador TS válido (sin palabras reservadas de JS/TS) */
  name: string;
  type: ContractFieldType;
  required: boolean;
  /** Descripción saneada (sin secuencias "* /" ni caracteres de control) */
  description: string;
}

export interface ContractErrorDefinition {
  /** Código de estado HTTP de error (400 a 599) */
  statusCode: number;
  /** Código de error en MAYUSCULAS_CON_GUIONES */
  code: string;
  message: string;
}

export interface ContractSchemaJson {
  description: string;
  authRequired: boolean;
  allowedRoles: string[];
  request: {
    pathParams: ContractFieldDefinition[];
    queryParams: ContractFieldDefinition[];
    body: ContractFieldDefinition[];
  };
  response: {
    /** Código HTTP de éxito (200 a 299) */
    statusCode: number;
    body: ContractFieldDefinition[];
  };
  errors: ContractErrorDefinition[];
}

// ==========================================
// MODELOS DE RESPUESTA DE CONTRATOS
// ==========================================

export interface ContractSummary {
  id: string;
  projectId: string;
  moduleName: string;
  versionNumber: number;
  status: ContractStatus;
  httpMethod: HttpMethod;
  endpointPath: string;
  /** Ruta destino normalizada sin barra inicial (ej. "contracts/auth-login.contract.ts") */
  filePath: string;
  generatedByAi: boolean;
  approvedAt: string | null; // ISO-8601 UTC
  syncStatus: SyncStatus;
  syncedToGithubAt: string | null; // ISO-8601 UTC
  lastSyncError: string | null;
  createdAt: string; // ISO-8601 UTC
  updatedAt: string; // ISO-8601 UTC
}

/**
 * Detalle completo de un contrato.
 * tsContent es estrictamente de SOLO LECTURA: se genera siempre de forma determinista desde schemaJson.
 */
export interface ContractDetail extends ContractSummary {
  schemaJson: ContractSchemaJson;
  tsContent: string;
  githubFileSha: string | null;
}

export interface ContractSyncOutcome {
  contractFile: FileSyncResult;
  agentsMdFile: FileSyncResult;
}

// ==========================================
// GET /api/v1/projects/:projectId/contracts
// ==========================================

export interface ListContractsQuery {
  status?: ContractStatus;
  moduleName?: string;
}

export interface ListContractsResponse {
  projectId: string;
  contracts: ContractSummary[];
}

// ==========================================
// GET /api/v1/projects/:projectId/contracts/:contractId
// ==========================================

export interface GetContractResponse {
  contract: ContractDetail;
}

// ==========================================
// POST /api/v1/projects/:projectId/contracts
// ==========================================

export interface CreateContractDraftRequest {
  /** Slug del módulo en minúsculas con guiones (ej. "auth-login"). Si ya existe el módulo, crea MAX + 1. */
  moduleName: string;
  httpMethod: HttpMethod;
  /** Ruta del endpoint iniciando con "/" (ej. "/api/v1/auth/login") */
  endpointPath: string;
  schemaJson: ContractSchemaJson;
  /** ID opcional de un contrato existente del mismo módulo desde el cual evolucionar */
  baseContractId?: string;
}

export interface CreateContractDraftResponse {
  contract: ContractDetail;
}

// ==========================================
// PATCH /api/v1/projects/:projectId/contracts/:contractId
// ==========================================

export interface UpdateContractDraftRequest {
  /** Solo permitido cuando status === 'DRAFT'. El servidor regenera tsContent automáticamente. */
  httpMethod?: HttpMethod;
  endpointPath?: string;
  schemaJson?: ContractSchemaJson;
}

export interface UpdateContractDraftResponse {
  contract: ContractDetail;
}

// ==========================================
// DELETE /api/v1/projects/:projectId/contracts/:contractId
// ==========================================

export interface DeleteContractDraftResponse {
  deletedContractId: string;
  deletedAt: string; // ISO-8601 UTC
}

// ==========================================
// POST /api/v1/projects/:projectId/contracts/:contractId/approve
// ==========================================

export interface ApproveContractRequest {
  /** Confirmación explícita para reemplazar si existe conflicto de SHA externo en GitHub */
  confirmOverwriteOnConflict?: boolean;
}

export interface ApproveContractResponse {
  approvedContract: ContractDetail;
  deprecatedContractId: string | null;
  sync: ContractSyncOutcome;
}

// ==========================================
// POST /api/v1/projects/:projectId/contracts/:contractId/deprecate
// ==========================================

export interface DeprecateContractRequest {
  /** Confirmación explícita para sobrescribir agents.md si existe conflicto de SHA */
  confirmOverwriteOnConflict?: boolean;
}

export interface DeprecateContractResponse {
  deprecatedContract: ContractDetail;
  agentsMdSync: FileSyncResult;
}

// ==========================================
// POST /api/v1/projects/:projectId/contracts/:contractId/sync
// ==========================================

export interface SyncContractRequest {
  confirmOverwriteOnConflict?: boolean;
}

export interface SyncContractResponse {
  contract: ContractDetail;
  sync: ContractSyncOutcome;
}

// ==========================================
// GET /api/v1/projects/:projectId/contracts/:contractId/prompt
// ==========================================

export interface GetContractBuildPromptQuery {
  layer: PromptTargetLayer;
}

export interface GetContractBuildPromptResponse {
  contractId: string;
  moduleName: string;
  contractVersion: number;
  parentPromptVersion: number;
  layer: PromptTargetLayer;
  /** Ruta dinámica permitida para la capa solicitada (Project.frontendPath o Project.backendPath) */
  allowedLayerPath: string;
  /** Prompt completo ensamblado por plantilla fija del servidor, listo para copiar */
  promptText: string;
}

// ==========================================
// GET /api/v1/projects/:projectId/agents-md/preview
// ==========================================

export interface PreviewAgentsMdResponse {
  projectId: string;
  filePath: 'agents.md';
  content: string;
  syncStatus: SyncStatus;
  sha: string | null;
  syncedAt: string | null; // ISO-8601 UTC
  lastSyncError: string | null;
}

// ==========================================
// POST /api/v1/projects/:projectId/agents-md/sync
// ==========================================

export interface SyncAgentsMdRequest {
  confirmOverwriteOnConflict?: boolean;
}

export interface SyncAgentsMdResponse {
  agentsMdSync: FileSyncResult;
}
