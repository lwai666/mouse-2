import { acceptHMRUpdate, defineStore } from 'pinia'
import type { ImageCache, PreloadState } from '~/types/image'
import { getImagePaths, isImageLoaded, loadImages } from '~/utils/imageLoader'

export const useImageStore = defineStore('image', () => {
  // State
  const state = reactive<PreloadState>({
    total: 0,
    loaded: 0,
    failed: 0,
    progress: 0,
    isLoading: false,
  })

  // Memory cache (Map with URL as key)
  const cache = ref<Map<string, ImageCache>>(new Map())

  // All image paths
  const imagePaths = ref<string[]>([])

  // Load results for debugging
  const loadResults = ref<Map<string, 'loaded' | 'failed'>>(new Map())

  // Preload all images
  async function preloadAll() {
    if (state.isLoading)
      return

    state.isLoading = true
    state.progress = 0
    state.loaded = 0
    state.failed = 0

    console.log('[ImagePreload] Starting preload...')

    try {
      imagePaths.value = getImagePaths()
      state.total = imagePaths.value.length

      console.log(`[ImagePreload] Found ${state.total} images to preload`)

      const results = await loadImages(
        imagePaths.value,
        (loaded, total) => {
          state.loaded = loaded
          state.progress = Math.floor((loaded / total) * 100)
        },
      )

      // Store results
      const newLoadResults = new Map<string, 'loaded' | 'failed'>()
      for (const result of results) {
        if (result.status === 'loaded' || result.status === 'failed') {
          newLoadResults.set(result.url, result.status)
        }
      }
      loadResults.value = newLoadResults

      state.failed = results.filter(r => r.status === 'failed').length

      console.log(`[ImagePreload] Complete: ${state.loaded}/${state.total}, Failed: ${state.failed}`)
    }
    catch (error) {
      console.error('[ImagePreload] Error during preload:', error)
    }
    finally {
      state.isLoading = false
    }
  }

  // Check if an image is already loaded
  function isLoaded(url: string): boolean {
    // First check our own load results
    if (loadResults.value.has(url))
      return loadResults.value.get(url) === 'loaded'

    // Fallback to browser cache check
    return isImageLoaded(url)
  }

  // Get cache statistics
  function getCacheStats() {
    const caches = Array.from(cache.value.values())
    return {
      size: cache.value.size,
      memoryUsage: caches.reduce((sum, item) => sum + item.size, 0),
      items: caches.map(c => ({
        url: c.url,
        size: c.size,
        loadedAt: new Date(c.loadedAt).toISOString(),
      })),
    }
  }

  // Clear the cache
  function clearCache() {
    cache.value.clear()
    loadResults.value.clear()
    console.log('[ImagePreload] Cache cleared')
  }

  // Get preload status for a specific image
  function getImageStatus(url: string): 'loaded' | 'failed' | 'pending' {
    return loadResults.value.get(url) ?? 'pending'
  }

  // Get all failed images
  function getFailedImages(): string[] {
    return Array.from(loadResults.value.entries())
      .filter(([, status]) => status === 'failed')
      .map(([url]) => url)
  }

  return {
    state,
    imagePaths,
    cache,
    loadResults,
    preloadAll,
    isLoaded,
    getCacheStats,
    clearCache,
    getImageStatus,
    getFailedImages,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useImageStore as any, import.meta.hot))
