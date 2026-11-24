/**
 * Contrato Común v1 — Tipos y Errores Globales Compartidos
 * Paquete interno: @orquestador/contracts
 *
 * Regla: Única fuente de verdad para estructuras base entre /frontend y /backend.
 * Prohibido incluir lógica ejecutable o dependencias externas.
 */

export type TrafficLightStatus = 'GREEN' | 'YELLOW' | 'RED' | 'ERROR';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export type CommonErrorCode =
  | 'UNAUTHORIZED'
  | 'CSRF_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'VERSION_CONFLICT'
  | 'RATE_LIMITED'
  | 'GITHUB_TOKEN_REVOKED'
  | 'GITHUB_PERMISSION_DENIED'
  | 'GITHUB_BRANCH_PROTECTED'
  | 'GITHUB_SYNC_CONFLICT'
  | 'GITHUB_SYNC_FAILED'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse<TCode extends string = CommonErrorCode> {
  error: {
    code: TCode | CommonErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Estado individual de sincronización de un archivo contra GitHub.
 */
export interface FileSyncResult {
  filePath: string;
  status: SyncStatus;
  sha: string | null;
  syncedAt: string | null; // ISO-8601 UTC
  errorCode:
    | 'GITHUB_SYNC_CONFLICT'
    | 'GITHUB_BRANCH_PROTECTED'
    | 'GITHUB_TOKEN_REVOKED'
    | 'GITHUB_SYNC_FAILED'
    | null;
  errorMessage: string | null;
}
