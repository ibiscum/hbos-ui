/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly BASE_URL: string
	readonly MODE: string
	readonly DEV: boolean
	readonly PROD: boolean
	readonly SSR: boolean
	readonly VITE_APP_VERSION?: string
	readonly VITE_APP_DEVICE_IP?: string
	readonly VITE_APP_DEVICE_PORT?: string
	readonly VITE_APP_API_PREFIX?: string
	readonly VITE_APP_CONFIG_API_PREFIX?: string
	readonly VITE_APP_DSPTOOLKIT_API_PREFIX?: string
	readonly VITE_APP_ROOMEQ_API_PREFIX?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
