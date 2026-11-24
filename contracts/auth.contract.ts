/**
 * Contrato v1 — Módulo de Autenticación, Sesión y CSRF (Etapa 1A)
 * Endpoints cubiertos:
 *  - GET  /api/v1/auth/github           (Inicia flujo GitHub OAuth con cookie efímera state)
 *  - GET  /api/v1/auth/github/callback  (Valida state, cifra token, emite orq_session + orq_csrf)
 *  - GET  /api/v1/auth/me               (Devuelve usuario autenticado, estado de sesión y token CSRF)
 *  - GET  /api/v1/auth/csrf             (Obtiene/renueva token CSRF sincronizado con cookie orq_csrf)
 *  - POST /api/v1/auth/logout           (Incrementa sessionVersion y revoca cookies de sesión)
 *
 * Regla: Única fuente de verdad compartida entre /frontend y /backend.
 * Prohibido modificar sin aprobación explícita del propietario del proyecto.
 */

import type { ApiErrorResponse } from './common.contract';

export type AuthErrorCode =
  | 'OAUTH_STATE_INVALID'
  | 'OAUTH_CODE_EXCHANGE_FAILED'
  | 'OAUTH_ACCESS_DENIED'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED';

export type AuthApiError = ApiErrorResponse<AuthErrorCode>;

/**
 * Constantes oficiales de sesión, cookies y permisos OAuth compartidas entre capas.
 */
export const AUTH_CONFIG = {
  SESSION_COOKIE_NAME: 'orq_session',
  CSRF_COOKIE_NAME: 'orq_csrf',
  CSRF_HEADER_NAME: 'X-CSRF-Token',
  OAUTH_STATE_COOKIE_NAME: 'orq_oauth_state',
  SESSION_TTL_DAYS: 7,
  OAUTH_STATE_TTL_MINUTES: 10,
  GITHUB_OAUTH_SCOPES: ['read:user', 'repo'],
  LOGIN_PATH: '/api/v1/auth/github',
} as const;

/**
 * Representación pública y segura del usuario autenticado.
 * Nunca expone githubTokenEncrypted, githubTokenIv, githubTokenTag,
 * keyVersion ni sessionVersion.
 */
export interface AuthenticatedUser {
  id: string;
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string; // ISO-8601 UTC
  updatedAt: string; // ISO-8601 UTC
}

export interface AuthSessionSummary {
  expiresAt: string; // ISO-8601 UTC
  githubConnected: boolean;
}

// ==========================================
// GET /api/v1/auth/github
// ==========================================

export interface GithubOAuthStartQuery {
  /** Ruta relativa opcional dentro del Frontend a la que volver tras el login (ej. "/dashboard") */
  returnTo?: string;
}

// ==========================================
// GET /api/v1/auth/github/callback
// ==========================================

export interface GithubOAuthCallbackQuery {
  /** Código temporal entregado por GitHub tras autorizar */
  code?: string;
  /** Token anti-CSRF devuelto por GitHub para comparar con orq_oauth_state */
  state?: string;
  /** Código de error si el usuario canceló o GitHub rechazó el acceso */
  error?: string;
  /** Descripción legible enviada por GitHub en caso de error */
  error_description?: string;
}

// ==========================================
// GET /api/v1/auth/me
// ==========================================

export interface GetAuthMeResponse {
  authenticated: true;
  user: AuthenticatedUser;
  session: AuthSessionSummary;
  /** Token CSRF vigente que el Frontend debe enviar en cabecera X-CSRF-Token */
  csrfToken: string;
}

// ==========================================
// GET /api/v1/auth/csrf
// ==========================================

export interface GetCsrfTokenResponse {
  csrfToken: string;
  headerName: 'X-CSRF-Token';
}

// ==========================================
// POST /api/v1/auth/logout
// ==========================================

export interface LogoutResponse {
  loggedOut: true;
  loggedOutAt: string; // ISO-8601 UTC
}
