/**
 * Image Preloading Composable
 *
 * Provides a simple interface for preloading images from the public directory.
 *
 * @example
 * ```ts
 * const { startPreload, preloadProgress, isPreloading } = useImagePreload()
 *
 * // Start preloading
 * await startPreload()
 *
 * // Watch progress
 * watch(preloadProgress, (progress) => {
 *   console.log(`Loading: ${progress}%`)
 * })
 * ```
 */
export function useImagePreload() {
  const imageStore = useImageStore()

  /**
   * Start preloading all images from the public directory.
   * This runs asynchronously in the background.
   */
  async function startPreload() {
    console.log('[ImagePreload] Starting image preload...')
    await imageStore.preloadAll()
  }

  /**
   * Computed state for preload progress (0-100)
   */
  const preloadProgress = computed(() => imageStore.state.progress)

  /**
   * Computed state indicating if preloading is in progress
   */
  const isPreloading = computed(() => imageStore.state.isLoading)

  /**
   * Computed state indicating if preloading has been completed
   */
  const isPreloaded = computed(() => imageStore.isPreloaded)

  /**
   * Computed state for total images to preload
   */
  const totalImages = computed(() => imageStore.state.total)

  /**
   * Computed state for number of successfully loaded images
   */
  const loadedImages = computed(() => imageStore.state.loaded)

  /**
   * Computed state for number of failed images
   */
  const failedImages = computed(() => imageStore.state.failed)

  /**
   * Check if a specific image has been preloaded
   */
  function isImageLoaded(url: string): boolean {
    return imageStore.isLoaded(url)
  }

  /**
   * Get cache statistics
   */
  function getCacheStats() {
    return imageStore.getCacheStats()
  }

  /**
   * Get list of failed images
   */
  function getFailedImages() {
    return imageStore.getFailedImages()
  }

  return {
    startPreload,
    preloadProgress,
    isPreloading,
    isPreloaded,
    totalImages,
    loadedImages,
    failedImages,
    isImageLoaded,
    getCacheStats,
    getFailedImages,
  }
}
