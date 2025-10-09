import { createI18n } from 'vue-i18n'

const messages = {
  en: {
    mouseName: 'Mouse Name',
    productId: 'Product ID',
    version: 'Version',
    rfAddress: 'RF Address',
    startPairing: 'Start Pairing',
    paired: 'Paired Successfully',
    switchToChinese: '中文'
  },
  zh: {
    mouseName: 'v8鼠标',
    productId: '鼠标 ProductID',
    version: '鼠标版本号',
    rfAddress: '鼠标 RF Address',
    startPairing: '开始配对',
    paired: '配对成功',
    switchToChinese: 'English'
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages
})
