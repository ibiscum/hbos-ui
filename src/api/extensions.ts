import { useAppConfigStore } from '@/stores/appconfig'
import { apiFetch } from '@/api/http'

export type ExtensionState = 'available' | 'installed' | 'upgradable'
export type ExtensionCategory = 'player' | 'dsp' | 'tool'
/** 'no' = no reboot needed, 'maybe' = might be needed depending on system state, 'yes' = reboot required */
export type NeedsReboot = 'no' | 'maybe' | 'yes'

export type JobPhase =
  | 'queued'
  | 'downloading'
  | 'installing'
  | 'configuring'
  | 'done'
  | 'failed'

/** Terminal job phases that indicate completion (success or failure) */
export const TERMINAL_PHASES: JobPhase[] = ['done', 'failed']

export interface Extension {
  package: string
  name: string
  category: ExtensionCategory
  summary: string
  description: string
  version: string | null
  installed_version: string | null
  state: ExtensionState
  needs_reboot: NeedsReboot
  icon_url: string | null
  /** "apt" for an apt-repo extension, "github:owner/name" for a GitHub one. */
  source: string
}

export interface GithubSource {
  id: string
  repo: string
}

export interface ExtensionJob {
  id: string
  package: string | null
  action: 'install' | 'uninstall' | 'refresh'
  phase: JobPhase
  percent: number
  exit_code: number | null
  error: string | null
  started_at: number
  finished_at: number | null
  log: string[]
}

export interface ExtensionSource {
  id: string
  uri: string
  suite: string
  components: string
  keyring: string
}

export interface ExtensionSourceInput {
  id: string
  uri: string
  suite: string
  components: string
  key: string
}

export interface ExtensionsApiResponse<T> {
  status: 'success' | 'error'
  message?: string
  count?: number
  data: T
}

/** Responses that carry no data payload (e.g. removing a source).
 *  The status field indicates success/error; message is optional. */
export interface ExtensionsApiAck {
  status: 'success' | 'error'
  message?: string
}

const baseUrl = () => useAppConfigStore().getConfigApiBaseUrl()

/** Wraps API responses with error handling.
 *
 *  Extracts the server's error message if available (from JSON body.message),
 *  otherwise falls back to the HTTP status code. This ensures the error
 *  message is always user-friendly.
 *
 *  Routed through apiFetch for CSRF protection: install/uninstall/refresh/source
 *  management operations may receive 401 responses that need auth prompt + CSRF retry. */
const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await apiFetch(url, init)
  if (!response.ok) {
    let message = `${response.status}`
    try {
      const body = await response.json()
      if (body?.message && typeof body.message === 'string') {
        message = body.message
      }
    } catch {
      // no JSON body or parse error; use status code
    }
    throw new Error(`Extensions API request failed: ${message}`)
  }
  return response.json()
}

/** Creates a standard JSON POST request init object. */
const createJsonPostInit = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** List all available extensions from all sources */
export const listExtensions = () =>
  request<ExtensionsApiResponse<{ extensions: Extension[] }>>(`${baseUrl()}/extensions`)

/** Fetch details for a specific extension by package name */
export const getExtension = (pkg: string) =>
  request<ExtensionsApiResponse<Extension>>(
    `${baseUrl()}/extensions/${encodeURIComponent(pkg)}`,
  )

/** Queue installation of an extension; returns a job for tracking progress */
export const installExtension = (pkg: string) =>
  request<ExtensionsApiResponse<{ job: ExtensionJob }>>(
    `${baseUrl()}/extensions/${encodeURIComponent(pkg)}/install`,
    { method: 'POST' },
  )

/** Queue uninstallation of an extension; returns a job for tracking progress */
export const uninstallExtension = (pkg: string) =>
  request<ExtensionsApiResponse<{ job: ExtensionJob }>>(
    `${baseUrl()}/extensions/${encodeURIComponent(pkg)}/uninstall`,
    { method: 'POST' },
  )

/** Queue a refresh of the extension catalog from all sources; returns a job for tracking progress */
export const refreshExtensions = () =>
  request<ExtensionsApiResponse<{ job: ExtensionJob }>>(
    `${baseUrl()}/extensions/refresh`,
    { method: 'POST' },
  )

/** Fetch current status and logs for an extension job */
export const getExtensionJob = (jobId: string) =>
  request<ExtensionsApiResponse<{ job: ExtensionJob; reboot_required: boolean }>>(
    `${baseUrl()}/extensions/jobs/${encodeURIComponent(jobId)}`,
  )

/** List all configured APT extension sources */
export const listExtensionSources = () =>
  request<ExtensionsApiResponse<{ sources: ExtensionSource[] }>>(
    `${baseUrl()}/extensions/sources`,
  )

/** Add a new APT extension source */
export const addExtensionSource = (input: ExtensionSourceInput) =>
  request<ExtensionsApiResponse<{ source: ExtensionSource }>>(
    `${baseUrl()}/extensions/sources`,
    createJsonPostInit(input),
  )

/** Remove an APT extension source by ID */
export const removeExtensionSource = (id: string) =>
  request<ExtensionsApiAck>(
    `${baseUrl()}/extensions/sources/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )

/** List all configured GitHub extension sources */
export const listGithubSources = () =>
  request<ExtensionsApiResponse<{ sources: GithubSource[] }>>(
    `${baseUrl()}/extensions/github-sources`,
  )

/** Add a new GitHub extension source (owner/repo format) */
export const addGithubSource = (repo: string) =>
  request<ExtensionsApiResponse<{ source: GithubSource }>>(
    `${baseUrl()}/extensions/github-sources`,
    createJsonPostInit({ repo }),
  )

/** Remove a GitHub extension source by ID */
export const removeGithubSource = (id: string) =>
  request<ExtensionsApiAck>(
    `${baseUrl()}/extensions/github-sources/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
