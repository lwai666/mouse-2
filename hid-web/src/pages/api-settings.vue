<script setup lang="ts">
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage } from 'element-plus'
import { onMounted, ref } from 'vue'

import { useApiConfig } from '~/composables/useApiConfig'

const { apiBaseUrl, isElectron, setApiBaseUrl } = useApiConfig()

const form = ref({
  apiUrl: '',
})

const isLoading = ref(false)

onMounted(() => {
  form.value.apiUrl = apiBaseUrl.value
})

async function saveSettings() {
  isLoading.value = true
  try {
    const success = await setApiBaseUrl(form.value.apiUrl)
    if (success) {
      ElMessage.success('API 地址保存成功')
    }
    else {
      ElMessage.error('API 地址保存失败')
    }
  }
  catch (error) {
    ElMessage.error('保存设置时出错')
  }
  finally {
    isLoading.value = false
  }
}

function resetSettings() {
  form.value.apiUrl = 'http://localhost:3010'
  ElMessage.info('已重置为默认地址，请点击保存按钮生效')
}
</script>

<template>
  <div class="api-settings-container">
    <div class="mx-auto my-10 w-150">
      <h1 class="mb-8 text-2xl font-bold text-center">
        API 设置
      </h1>

      <ElForm label-width="100px">
        <ElFormItem label="运行环境">
          <div class="text-gray">
            {{ isElectron ? 'Electron 桌面应用' : 'Web 浏览器' }}
          </div>
        </ElFormItem>

        <ElFormItem label="API 地址">
          <ElInput
            v-model="form.apiUrl"
            placeholder="http://localhost:3010"
          />
          <div class="mt-2 text-xs text-gray">
            配置后端 API 的完整地址（例如: http://localhost:3010 或 https://api.example.com）
          </div>
        </ElFormItem>

        <ElFormItem>
          <ElButton
            type="primary"
            :loading="isLoading"
            @click="saveSettings"
          >
            保存设置
          </ElButton>
          <ElButton @click="resetSettings">
            重置为默认
          </ElButton>
        </ElFormItem>
      </ElForm>

      <div class="mt-8 rounded bg-gray-100 p-4 text-sm">
        <p class="mb-2 font-bold">
          说明：
        </p>
        <ul class="list-inside list-disc space-y-1 text-gray">
          <li>在 Electron 应用中，API 配置会持久化保存</li>
          <li>在 Web 浏览器中，配置仅在当前会话有效</li>
          <li>修改 API 地址后，请刷新页面以确保所有请求使用新地址</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style>
.api-settings-container {
  min-height: 100vh;
  padding: 20px;
}
</style>
