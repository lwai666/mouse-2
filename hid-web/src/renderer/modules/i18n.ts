import type { Locale } from 'vue-i18n'
import { createI18n } from 'vue-i18n'
import type { UserModule } from '~/types'

// Import i18n resources
// https://vitejs.dev/guide/features.html#glob-import
//
// Don't need this? Try vitesse-lite: https://github.com/antfu/vitesse-lite
const i18n = createI18n({
  legacy: false,
  locale: '', // 从本地存储读取语言值,
  messages: {},
})

const localesMap = Object.fromEntries(
  Object.entries(import.meta.glob('../../../locales/*.yml'))
    .map(([path, loadLocale]) => [path.match(/([\w-]*)\.yml$/)?.[1], loadLocale]),
) as Record<Locale, () => Promise<{ default: Record<string, string> }>>

export const availableLocales = Object.keys(localesMap)

const loadedLanguages: string[] = []

function getDefaultLanguage() {
  if (!import.meta.env.SSR) {
    const storedLanguage = localStorage.getItem('language')
    if (storedLanguage) return storedLanguage
  }

  const userLanguages = typeof window !== 'undefined' && window.navigator ? window.navigator.languages : [];
  const availableLocales = ['de-DE', 'en-US', 'ja-JP', 'ko-KR', 'zh-CN']
  for (const lang of userLanguages) {
    if (availableLocales.includes(lang)) {
      return lang
    }
  }
  return 'en-US'
}

function setI18nLanguage(lang: Locale) {
  i18n.global.locale.value = lang as any
  if (typeof document !== 'undefined')
    document.querySelector('html')?.setAttribute('lang', lang)
  if (!import.meta.env.SSR)
    localStorage.setItem('language', lang)
  return lang
}

export async function loadLanguageAsync(lang: string): Promise<Locale> {
  // If the same language
  if (i18n.global.locale.value === lang)
    return setI18nLanguage(lang)

  // If the language was already loaded
  if (loadedLanguages.includes(lang))
    return setI18nLanguage(lang)

  // If the language hasn't been loaded yet
  const messages = await localesMap[lang]()
  i18n.global.setLocaleMessage(lang, messages.default)
  loadedLanguages.push(lang)
  return setI18nLanguage(lang)
}

export const install: UserModule = ({ app }) => {
  app.use(i18n)
  loadLanguageAsync(getDefaultLanguage())
}
