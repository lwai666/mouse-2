export interface ImageLoadResult {
  url: string
  status: 'loaded' | 'failed' | 'loading'
  error?: Error
}

export interface PreloadState {
  total: number
  loaded: number
  failed: number
  progress: number // 0-100
  isLoading: boolean
}

export interface ImageCache {
  url: string
  blob: Blob
  loadedAt: number
  size: number
}
