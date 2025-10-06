import 'element-plus/dist/index.css'
import './assets/main.css'

import ElementPlus from 'element-plus'
import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'

const app = createApp(App)
app.use(i18n)
app.use(ElementPlus)
app.mount('#app')
