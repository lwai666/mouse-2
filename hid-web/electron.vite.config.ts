import path from 'node:path'
import { readFileSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import Layouts from 'vite-plugin-vue-layouts'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import VueI18n from '@intlify/unplugin-vue-i18n/vite'
import Unocss from 'unocss/vite'
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: path.resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '~/': `${path.resolve(__dirname, 'src/renderer')}/`
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "~/styles/element/index.scss" as *;`,
        },
      },
    },
    plugins: [
      vue({ include: [/\.vue$/, /\.md$/] }),
      VueRouter({
        extensions: ['.vue', '.md'],
        dts: 'typed-router.d.ts',
        routesFolder: 'pages',
      }),
      Layouts({
        pagesDir: 'pages',
      }),
      AutoImport({
        imports: [
          'vue',
          'vue-i18n',
          '@vueuse/core',
          {
            '@unhead/vue': ['useHead'],
          },
          VueRouterAutoImports,
          {
            'vue-router/auto': ['useLink'],
          },
        ],
        dts: 'auto-imports.d.ts',
        dirs: [
          'composables',
          'stores',
        ],
        vueTemplate: true,
      }),
      Components({
        extensions: ['vue', 'md'],
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        dts: 'components.d.ts',
      }),
      Unocss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'safari-pinned-tab.svg'],
        manifest: {
          name: 'Vitesse',
          short_name: 'Vitesse',
          theme_color: '#ffffff',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
      }),
      VueI18n({
        runtimeOnly: true,
        compositionOnly: true,
        fullInstall: true,
        include: [path.resolve(__dirname, 'locales/**')],
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    }
  }
})
