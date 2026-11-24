/**
 * Contrato v2 — Módulo de Proyectos y Repositorios GitHub (Etapa 1A)
 * Endpoints cubiertos:
 *  - GET    /api/v1/github/repositories      (Listar repositorios disponibles del usuario en GitHub)
 *  - GET    /api/v1/projects                 (Listar proyectos conectados del usuario autenticado)
 *  - POST   /api/v1/projects                 (Conectar repositorio + rutas + Prompt Padre v1 + sync inicial)
 *  - PATCH  /api/v1/projects/:projectId/paths (Actualizar rutas de frontera del proyecto)
 *  - DELETE /api/v1/projects/:projectId      (Desconectar proyecto de la plataforma; no borra el repo)
 *
 * Regla: Única fuente de verdad compartida entre /frontend y /backend.
 * Prohibido modificar sin aprobación explícita del propietario del proyecto.
 */

import type {
  ApiErrorResponse,
  FileSyncResult,
  SyncStatus,
  TrafficLightStatus,
} from './common.contract';

export type ProjectsErrorCode =
  | 'REPO_ALREADY_CONNECTED'
  | 'GITHUB_REPO_NOT_FOUND'
  | 'INVALID_LAYER_PATHS'
  | 'OVERLAPPING_LAYER_PATHS';

export type ProjectsApiError = ApiErrorResponse<ProjectsErrorCode>;

/**
 * Restricciones de validación compartidas para Zod (Backend) y formularios (Frontend).
 * Todas las rutas se normalizan sin barra inicial ni final y sin secuencias "..".
 */
export const PROJECT_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 80,
  BRANCH_MAX_LENGTH: 100,
  PATH_MAX_LENGTH: 120,
  PROMPT_MIN_LENGTH: 20,
  PROMPT_MAX_LENGTH: 50000,
  PROMPT_SUMMARY_MAX_LENGTH: 280,
  DEFAULT_BRANCH: 'main',
  DEFAULT_CONTRACTS_PATH: 'contracts',
  DEFAULT_FRONTEND_PATH: 'frontend',
  DEFAULT_BACKEND_PATH: 'backend',
} as const;

/**
 * Repositorio disponible en la cuenta de GitHub del usuario (solo lectura).
 */
export interface GithubRepositoryOption {
  githubRepoId: string;
  repoOwner: string;
  repoName: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  alreadyConnected: boolean;
}

/**
 * Representación segura de un proyecto devuelta al Frontend.
 * Nunca incluye tokens ni credenciales internas.
 */
export interface ProjectSummary {
  id: string;
  githubRepoId: string;
  name: string;
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  contractsPath: string;
  frontendPath: string;
  backendPath: string;
  activePromptVersion: number | null;
  agentsMdSyncStatus: SyncStatus;
  agentsMdSyncedAt: string | null; // ISO-8601 UTC
  /** Siempre null durante la Etapa 1A hasta ejecutar auditorías en Etapa 1B */
  lastAuditTrafficLight: TrafficLightStatus | null;
  createdAt: string; // ISO-8601 UTC
  updatedAt: string; // ISO-8601 UTC
}

// ==========================================
// GET /api/v1/github/repositories
// ==========================================

export interface ListGithubRepositoriesResponse {
  repositories: GithubRepositoryOption[];
}

// ==========================================
// GET /api/v1/projects
// ==========================================

export interface ListProjectsResponse {
  projects: ProjectSummary[];
}

// ==========================================
// POST /api/v1/projects
// ==========================================

export interface CreateProjectRequest {
  /** ID inmutable del repositorio obtenido desde GET /api/v1/github/repositories */
  githubRepoId: string;
  /** Nombre legible en la plataforma (3 a 80 caracteres) */
  name: string;
  /** Dueño del repositorio en GitHub (se normaliza a minúsculas) */
  repoOwner: string;
  /** Nombre exacto del repositorio en GitHub (se normaliza a minúsculas) */
  repoName: string;
  /** Rama base del repositorio (por defecto "main") */
  defaultBranch?: string;
  /** Ruta normalizada sin barra inicial ni final (por defecto "contracts") */
  contractsPath?: string;
  /** Ruta normalizada sin barra inicial ni final (por defecto "frontend") */
  frontendPath?: string;
  /** Ruta normalizada sin barra inicial ni final (por defecto "backend") */
  backendPath?: string;
  /** Contenido inicial del Prompt Padre v1 (20 a 50 000 caracteres) */
  initialParentPrompt: string;
  /** Nota breve opcional para la v1 (máx. 280 caracteres) */
  initialPromptSummary?: string;
  /** Confirmación explícita para reemplazar agents.md si ya existía en el repo */
  confirmOverwriteExistingFiles?: boolean;
}

export interface CreateProjectResponse {
  project: ProjectSummary;
  initialPrompt: {
    id: string;
    versionNumber: 1;
    status: 'ACTIVE';
    syncStatus: SyncStatus;
    syncedToGithubAt: string | null;
  };
  /** Resultado explícito por archivo de la sincronización inicial con GitHub */
  initialSync: {
    parentPromptFile: FileSyncResult;
    agentsMdFile: FileSyncResult;
  };
}

// ==========================================
// PATCH /api/v1/projects/:projectId/paths
// ==========================================

export interface UpdateProjectPathsRequest {
  contractsPath: string;
  frontendPath: string;
  backendPath: string;
  defaultBranch?: string;
}

export interface UpdateProjectPathsResponse {
  project: ProjectSummary;
  /** Indica si existen contratos aprobados que requieren resincronización por cambio de ruta */
  contractsRequireResync: boolean;
}

// ==========================================
// DELETE /api/v1/projects/:projectId
// ==========================================

export interface DisconnectProjectResponse {
  disconnectedProjectId: string;
  disconnectedAt: string; // ISO-8601 UTC
}
