import type { UserModule } from '~/types'
import { useImagePreload } from '~/composables/useImagePreload'

/**
 * Image Preload Module
 *
 * Automatically starts preloading all images from the public directory
 * when the application initializes on the client side.
 *
 * This module runs asynchronously in the background and does not block
 * the application from starting.
 */
export const install: UserModule = ({ isClient, router }) => {
  if (!isClient)
    return

  // Start preloading after the router is ready
  router.isReady()
    .then(async () => {
      const { startPreload } = useImagePreload()

      // Start preloading in the background (don't await)
      startPreload().catch((error) => {
        console.error('[ImagePreload] Failed to start preload:', error)
      })
    })
    .catch(() => {})
}
