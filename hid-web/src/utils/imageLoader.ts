import type { ImageLoadResult } from '~/types/image'

// Get all image paths from the public directory
export function getImagePaths(): string[] {
  // Scan public directory recursively
  function scanPublicDir() {
    // Since we can't use import.meta.glob for dynamic public files,
    // we'll use a different approach - list known paths manually
    // This is a limitation of Vite's import.meta.glob which doesn't work with public dir

    // Common paths in the public directory based on the project structure
    const knownPaths = [
      // Root level images
      '/background.png',
      '/logo.png',
      '/motion_sync.png',
      '/mouse-card.png',
      '/mouse.png',
      '/mouse1.png',
      '/mouse2.png',
      '/mouse3.png',
      '/mouse_black.png',
      '/mouse_white.png',
      '/蓝色.png',
      '/pairing_connection.png',
      '/pwa-192x192.png',
      '/pwa-512x512.png',
      '/restore_factory_settings.png',
      '/tile.png',
      '/update-mouse.png',
      '/update-receiver.png',
      '/safari-pinned-tab.svg',

      // mouseCarouseItem images
      '/mouseCarouseItem/1.png',
      '/mouseCarouseItem/2.png',
      '/mouseCarouseItem/3.png',
      '/mouseCarouseItem/icon1.png',
      '/mouseCarouseItem/icon2.png',
      '/mouseCarouseItem/icon3.png',
      '/mouseCarouseItem/line.png',
      '/mouseCarouseItem/形状 5 拷贝.png',

      // Flag images
      '/flag/CN.png',
      '/flag/DE.png',
      '/flag/JP.png',
      '/flag/KR.png',
      '/flag/US.png',

      // V9 images
      '/v9/Motion.png',
      '/v9/active-bg.png',
      '/v9/bg-b.png',
      '/v9/bg-s.png',
      '/v9/bg-w.png',
      '/v9/bg.png',
      '/v9/china.png',
      '/v9/icon.png',
      '/v9/icon1.png',
      '/v9/icon2.png',
      '/v9/icon2_active.png',
      '/v9/mouse.png',
      '/v9/mouse1.png',
      '/v9/wenhao.png',
      '/v9/wenhao_active.png',
      '/v9/setting.png',
      '/v9/setting_active.png',

      // Sports arena images
      '/sports_arena_0.png',
      '/sports_arena_1.png',
      '/sports_arena_2.png',
      '/sports_arena_icon_0.png',
      '/sports_arena_icon_1.png',
      '/sports_arena_icon_2.png',
    ]

    // Generate slideshow images (multiple languages)
    const languages = ['de-DE', 'en-US', 'ja-JP', 'ko-KR', 'zh-CN']
    for (const lang of languages) {
      for (let i = 1; i <= 2; i++) {
        knownPaths.push(`/slideshow/${i}_${lang}.png`)
      }
    }

    // Generate sequence frame images (01 directory) - 60 frames
    for (let i = 0; i <= 59; i++) {
      const suffix = i.toString().padStart(5, '0')
      knownPaths.push(`/01/01_00000_${suffix}.png`)
    }

    // Generate advanced sequence frames - 72 frames
    for (let i = 0; i <= 71; i++) {
      const suffix = i.toString().padStart(5, '0')
      knownPaths.push(`/advanced/1_${suffix}.png`)
    }

    // Generate xy sequence frames - 125 frames
    for (let i = 0; i <= 124; i++) {
      const suffix = i.toString().padStart(5, '0')
      knownPaths.push(`/xy/1_${suffix}.png`)
    }

    return knownPaths
  }

  return scanPublicDir()
}

// Load a single image
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // Check if already cached in browser
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load: ${url}`))
    img.src = url
  })
}

// Batch load images
export async function loadImages(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<ImageLoadResult[]> {
  const results: ImageLoadResult[] = []
  let loaded = 0
  const total = urls.length

  // Process images in batches to avoid overwhelming the browser
  const BATCH_SIZE = 10
  const batches: string[][] = []

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    batches.push(urls.slice(i, i + BATCH_SIZE))
  }

  for (const batch of batches) {
    const batchPromises = batch.map(async (url) => {
      try {
        await loadImage(url)
        loaded++
        onProgress?.(loaded, total)
        return { url, status: 'loaded' as const }
      }
      catch (error) {
        // Still increment progress even on failure
        loaded++
        onProgress?.(loaded, total)
        return { url, status: 'failed' as const, error: error as Error }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  return results
}

// Check if an image is already loaded in browser cache
export function isImageLoaded(url: string): boolean {
  const img = new Image()
  img.src = url
  return img.complete
}

// Get image dimensions without loading (for validation)
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}
