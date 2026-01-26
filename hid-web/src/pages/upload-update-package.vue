<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage, ElUpload } from 'element-plus'
import { reactive, ref } from 'vue'

import { useI18n } from 'vue-i18n'

import { getApiUrl } from '~/composables/useApiConfig'
import { createTransportWebHID } from '~/utils/hidHandle'

const { t } = useI18n()

const userStore = useUserStore()

// 这是管理员密码 admin123 的 SHA-256 哈希值
const ADMIN_PASSWORD_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH

const isAuthenticated = ref(false)
const password = ref('')
const form = ref()

const transport = ref(null)

// 设备类型
const DEVICE_TYPE = {
  MOUSE: 'mouse',
  RECEIVER: 'receiver',
  UNKNOWN: 'unknown',
}

const deviceType = ref(DEVICE_TYPE.UNKNOWN)

// 设备映射表（嵌套对象结构）
const DEVICE_MAP = {
  0x2FE3: { 0x0007: { type: DEVICE_TYPE.MOUSE, name: '鼠标' } },
  0x2FE5: { 0x0005: { type: DEVICE_TYPE.RECEIVER, name: '接收器' } },
}

async function onAddNouseClick() {
  transport.value = await createTransportWebHID({
    id: 'v8',
    filters: [
      ...toRaw(userStore.devices),
      // 其他设备
      { vendorId: 0x1532, productId: 0x00BF },
      // { vendorId: 0x3554, productId: 0xF5F7 },
      // { vendorId: 0x3554, productId: 0xF5F4 },
    ],
    commandHandler: async (data) => {
      // console.log('接收的数据=======', data)
    },
  })

  // 识别设备类型（通过映射表查找）
  const { productId, vendorId } = transport.value.device
  console.log(vendorId, productId, '设备ID')

  const deviceInfo = DEVICE_MAP[vendorId]?.[productId]

  deviceType.value = deviceInfo?.type || DEVICE_TYPE.UNKNOWN

  console.log('当前设备类型:', deviceType.value, deviceInfo?.name || '未知设备')
}

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

async function validatePassword() {
  const inputHash = await sha256(password.value)
  if (inputHash === ADMIN_PASSWORD_HASH) {
    isAuthenticated.value = true
    ElMessage.success('验证成功')
  }
  else {
    ElMessage.error('密码错误')
  }
}

const formData = reactive({
  version: '',
  description: '',
  spiFile: null,
  usbFile: null,
})

const spiFileList = ref([])
const usbFileList = ref([])

function spiHandleFileChange(file: any, fileList: any) {
  formData.spiFile = file.raw
  spiFileList.value = fileList.slice(-1)
}
function usbHandleFileChange(file: any, fileList: any) {
  formData.usbFile = file.raw
  usbFileList.value = fileList.slice(-1)
}

function validateVersion(rule: any, value: string, callback: any) {
  const versionPattern = /^(\d+\.)?(\d+\.)?(\*|\d+)$/
  if (!versionPattern.test(value)) {
    callback(new Error('版本号格式不正确'))
  }
  else {
    callback()
  }
}

function validateSpiFile(rule: any, value: any, callback: any) {
  if (!value) {
    callback(new Error('请上传适配器更新包'))
    return
  }
  callback()
}

const rules = {
  version: [
    { required: true, message: '请填写上传的更新包的版本号', trigger: 'blur' },
    { validator: validateVersion, trigger: 'blur' },
  ],
  description: [
    { required: true, message: '请填写更新描述', trigger: 'blur' },
    { min: 5, max: 500, message: '长度在 5 到 200 个字符之间', trigger: 'blur' },
  ],
  spiFile: [
    { required: false, message: '请上传适配器更新包', trigger: 'change' },
    // { validator: validateSpiFile, trigger: 'blur' },
  ],
  usbFile: [
    { required: false, message: '请上传鼠标更新包', trigger: 'change' },
    // { validator: validateSpiFile, trigger: 'blur' },
  ],
}

const eLoading = ref(false)

async function submitForm() {
  if (!form.value)
    return

  try {
    await form.value.validate()

    // 检查是否至少上传了一个文件
    if (!formData.spiFile && !formData.usbFile) {
      ElMessage.error('SPI 或者 USB固件,至少上传一个文件!')
      return
    }

    const _formData = new FormData()
    _formData.append('version', formData.version)
    _formData.append('description', formData.description)
    _formData.append('file1', formData.spiFile)
    _formData.append('file2', formData.usbFile)
    _formData.append('productId', transport.value.device.productId)
    _formData.append('vendorId', transport.value.device.vendorId)
    _formData.append('productName', transport.value.device.productName)

    eLoading.value = true
    const response = await fetch(getApiUrl('api/upload-update-package'), {
      method: 'POST',
      body: _formData,
    })
    if (response.ok) {
      ElMessage.success('上传成功')
      isAuthenticated.value = false
      transport.value = null
      eLoading.value = false
    }
    else {
      ElMessage.error('上传失败')
      eLoading.value = false
    }
  }
  catch (error) {
    ElMessage.error('请检查表单填写是否正确')
  }
}
</script>

<template>
  <div class="upload-update-package-container">
    <!-- 密码验证表单 -->
    <ElForm v-if="!isAuthenticated" class="mx-auto my-10 w-200" @submit.native.prevent>
      <ElFormItem>
        <div class="w-full p-10 text-center text-2xl">
          管理员验证
        </div>
      </ElFormItem>
      <ElFormItem>
        <ElInput
          v-model="password"
          type="password"
          placeholder="请输入管理员密码"
          @keyup.enter.prevent="validatePassword"
        />
      </ElFormItem>
      <ElFormItem>
        <ElButton type="primary" class="w-full" @click="validatePassword">
          验证
        </ElButton>
      </ElFormItem>
    </ElForm>

    <div
      v-else style="height: 100%; display: flex;justify-content: center;align-items: center;"
    >
      <div
        v-if="!transport"
        class="relative mb-5 flex flex-shrink-0 items-center justify-center"
        style="width: 231px;height: 218px;border-radius: 10px;background-color: rgba(255, 255, 255, 0.1); margin-right: 10px;border: 1px solid rgba(255, 255, 255, 0.4);"
        @click="onAddNouseClick"
      >
        <!-- <p class="absolute top-5" style="font-weight: bold;font-size: 20px;">
        点击进入
      </p> -->
        <ElIcon size="20" color="#ffff">
          <Plus />
        </ElIcon>
      </div>
      <div v-else style="height: 100%;">
        <!-- 上传表单 -->
        <ElForm

          ref="form"
          :model="formData"
          :rules="rules"
          label-width="120px"
          class="mx-auto my-10 w-200"
        >
          <ElFormItem>
            <div class="w-full p-10 text-center text-2xl" style="text-align: center;">
              更新包上传
            </div>
          </ElFormItem>
          <ElFormItem label="版本号" prop="version">
            <ElInput v-model="formData.version" placeholder="1" />
          </ElFormItem>
          <ElFormItem label="更新描述" prop="description">
            <ElInput v-model="formData.description" type="textarea" :autosize="{ minRows: 6, maxRows: 6 }" placeholder="1. 修复了一些已知的问题" />
          </ElFormItem>
          <!-- v-if="deviceType === DEVICE_TYPE.RECEIVER" -->
          <ElFormItem label="适配器更新包" prop="spiFile">
            <ElUpload
              action=""
              :file-list="spiFileList"
              :auto-upload="false"
              accept=".bin"
              :on-change="spiHandleFileChange"
            >
              <ElButton type="primary">
                选择文件
              </ElButton>
              <template #tip>
                <div
                  class="el-upload__tip" style="position: absolute; left: 125px;top: -7px;"
                >
                  请上传 .bin 文件更新包, 不能大于 10MB！
                </div>
              </template>
            </ElUpload>
          </ElFormItem>
          <!-- v-if="deviceType === DEVICE_TYPE.MOUSE" -->
          <ElFormItem label="鼠标更新包" prop="usbFile">
            <ElUpload
              action=""
              :file-list="usbFileList"
              :auto-upload="false"
              accept=".bin"
              :on-change="usbHandleFileChange"
            >
              <ElButton type="primary">
                选择文件
              </ElButton>
              <template #tip>
                <div class="el-upload__tip" style="position: absolute; left: 125px;top: -7px;">
                  请上传 .bin 文件更新包, 不能大于 10MB！
                </div>
              </template>
            </ElUpload>
          </ElFormItem>
          <ElFormItem>
            <ElButton type="primary" class="w-full" :loading="eLoading" @click="submitForm">
              提交
            </ElButton>
          </ElFormItem>
        </ElForm>
      </div>
    </div>
  </div>
</template>

<style>
.upload-update-package-container {
  --el-color-white: #000;
  --el-color-primary: #fff;
  --el-color-primary-light-3: #e0e0e0;
  --el-color-primary-dark-2: #898989;
  height: 100%;
}

.upload-update-package-container .el-form-item__content > div {
  text-align: left;
}
</style>
