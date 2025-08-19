import { ViteSSG } from 'vite-ssg'
import { routes } from 'vue-router/auto-routes'
import { setupLayouts } from 'virtual:generated-layouts'

import App from './App.vue'
import type { UserModule } from './types'
import { initTransportWebHID } from './utils/hidHandle'
import CustomMessageBox from './components/CustomMessageBox'

import '@unocss/reset/tailwind.css'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/main.css'
import 'uno.css'



// https://github.com/antfu/vite-ssg
export const createApp = ViteSSG(
  App,
  {
    routes: setupLayouts(routes),
    base: import.meta.env.BASE_URL,
  },
  (ctx) => {
    // install all modules under `modules/`
    Object.values(import.meta.glob<{ install: UserModule }>('./modules/*.ts', { eager: true }))
      .forEach(i => i.install?.(ctx))
    // ctx.app.use(Previewer)
    ctx.app.use(CustomMessageBox)
    initTransportWebHID(ctx)
  },
)
