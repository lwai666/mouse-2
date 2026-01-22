import path from 'node:path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Layouts from 'vite-plugin-vue-layouts'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Markdown from 'unplugin-vue-markdown/vite'
// Temporarily disabled - dependency ESM issues
// import VueMacros from 'unplugin-vue-macros/vite'
import VueI18n from '@intlify/unplugin-vue-i18n/vite'
import { VitePWA } from 'vite-plugin-pwa'
import VueDevTools from 'vite-plugin-vue-devtools'
import LinkAttributes from 'markdown-it-link-attributes'
// Temporarily disabled - ESM import issues
// import Unocss from 'unocss/vite'
// import Shiki from '@shikijs/markdown-it'
import WebfontDownload from 'vite-plugin-webfont-dl'
import VueRouter from 'unplugin-vue-router/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  build: {
    outDir: 'backend/dist',
    rollupOptions: {
      input: path.resolve(__dirname, 'src/renderer/index.html')
    }
  },
  resolve: {
    alias: {
      '~/': `${path.resolve(__dirname, 'src/renderer')}/`,
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "~/styles/element/index.scss" as *;`,
      },
    },
  },
  plugins: [
    // VueMacros temporarily disabled - dependency ESM issues
    // VueMacros({
    //   plugins: {
    //     vue: Vue({
    //       include: [/\.vue$/, /\.md$/],
    //     }),
    //   },
    // }),

    Vue({ include: [/\.vue$/, /\.md$/] }),

    VueRouter({
      extensions: ['.vue', '.md'],
      dts: 'src/renderer/typed-router.d.ts',
    }),

    Layouts(),

    AutoImport({
      imports: [
        'vue',
        'vue-i18n',
        '@vueuse/head',
        '@vueuse/core',
        VueRouterAutoImports,
        {
          'vue-router/auto': ['useLink'],
        },
      ],
      dts: 'src/renderer/auto-imports.d.ts',
      dirs: [
        'src/renderer/composables',
        'src/renderer/stores',
      ],
      vueTemplate: true,
    }),

    Components({
      extensions: ['vue', 'md'],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      dts: 'src/renderer/components.d.ts',
    }),

    // Unocss(),  // Temporarily disabled - ESM import issues

    Markdown({
      wrapperClasses: 'prose prose-sm m-auto text-left',
      headEnabled: true,
      async markdownItSetup(md) {
        md.use(LinkAttributes, {
          matcher: (link: string) => /^https?:\/\//.test(link),
          attrs: {
            target: '_blank',
            rel: 'noopener',
          },
        })
        // Shiki temporarily disabled - ESM import issues
        // md.use(await Shiki({
        //   defaultColor: false,
        //   themes: {
        //     light: 'vitesse-light',
        //     dark: 'vitesse-dark',
        //   },
        // }))
      },
    }),

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

    WebfontDownload(),
    VueDevTools(),
  ],

  test: {
    include: ['test/**/*.test.ts'],
    environment: 'jsdom',
  },

  ssr: {
    noExternal: ['workbox-window', /vue-i18n/],
  },
})
