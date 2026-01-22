import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'

import { routes } from 'vue-router/auto-routes'
import App from './App.vue'
import CustomMessageBox from './components/CustomMessageBox'
import { initTransportWebHID } from './utils/hidHandle'

// Modules
import { install as installPinia } from './modules/pinia'
import { install as installI18n } from './modules/i18n'
import { install as installApiConfig } from './modules/apiConfig'

import '@unocss/reset/tailwind.css'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/main.css'
import 'uno.css'

// Create router
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
})

// Create app
const app = createApp(App)

// Install router
app.use(router)

// Install modules
installPinia({ app, isClient: true, initialState: {} })
installI18n({ app })
installApiConfig({ app })

// Install custom components
app.use(CustomMessageBox)

// Initialize HID transport
initTransportWebHID({ app })

// Mount app
app.mount('#app')
