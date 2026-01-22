import type { UserModule } from '~/types'

import { initApiConfig } from '~/composables/useApiConfig'

export const install: UserModule = async () => {
  // 初始化 API 配置
  await initApiConfig()
}
