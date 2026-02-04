<script setup lang="ts">
import { InfoFilled, Plus } from '@element-plus/icons-vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElMessage, ElTooltip, ElUpload, ElIcon } from 'element-plus'
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
  adapterVersion: '',
  mouseVersion: '',
  description: '',
  spiFile: null,
  usbFile: null,
})

const spiFileList = ref([])
const usbFileList = ref([])

function spiHandleFileChange(file: any, fileList: any) {
  formData.spiFile = file.raw
  spiFileList.value = fileList.slice(-1)
  // 触发适配器版本号的验证
  form.value?.validateField('adapterVersion')
}
function usbHandleFileChange(file: any, fileList: any) {
  formData.usbFile = file.raw
  usbFileList.value = fileList.slice(-1)
  // 触发鼠标版本号的验证
  form.value?.validateField('mouseVersion')
}

function validateVersion(rule: any, value: string, callback: any) {
  const versionPattern = /^(\d+\.)?(\d+\.)?(\*|\d+)$/

  // 检查字段类型
  const fieldType = rule.field

  // 如果是适配器版本号
  if (fieldType === 'adapterVersion') {
    if (formData.spiFile && !value) {
      callback(new Error('上传适配器固件时，版本号为必填项'))
      return
    }
    if (value && !versionPattern.test(value)) {
      callback(new Error('版本号格式不正确'))
      return
    }
  }

  // 如果是鼠标版本号
  if (fieldType === 'mouseVersion') {
    if (formData.usbFile && !value) {
      callback(new Error('上传鼠标固件时，版本号为必填项'))
      return
    }
    if (value && !versionPattern.test(value)) {
      callback(new Error('版本号格式不正确'))
      return
    }
  }

  callback()
}

function validateSpiFile(rule: any, value: any, callback: any) {
  if (!value) {
    callback(new Error('请上传适配器更新包'))
    return
  }
  callback()
}

const rules = {
  adapterVersion: [
    { validator: validateVersion, trigger: 'blur', field: 'adapterVersion' },
  ],
  mouseVersion: [
    { validator: validateVersion, trigger: 'blur', field: 'mouseVersion' },
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

    // 验证：如果上传了适配器文件，必须有适配器版本号
    if (formData.spiFile && !formData.adapterVersion) {
      ElMessage.error('请填写适配器更新包的版本号')
      return
    }

    // 验证：如果上传了鼠标文件，必须有鼠标版本号
    if (formData.usbFile && !formData.mouseVersion) {
      ElMessage.error('请填写鼠标更新包的版本号')
      return
    }

    const _formData = new FormData()
    _formData.append('adapterVersion', formData.adapterVersion || '')
    _formData.append('mouseVersion', formData.mouseVersion || '')
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

      // 清空表单
      formData.adapterVersion = ''
      formData.mouseVersion = ''
      formData.description = ''
      formData.spiFile = null
      formData.usbFile = null
      spiFileList.value = []
      usbFileList.value = []

      // 重置表单验证状态
      form.value?.clearValidate()
      form.value?.resetFields()

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
          <div class="w-full p-10 text-center text-2xl" style="text-align: center;">
            更新包上传
          </div>

          <!-- 适配器更新包模块 -->
          <div class="module-card">
            <div class="module-title">
              接收器更新包
            </div>
            <ElFormItem label="版本号" prop="adapterVersion">
              <ElInput v-model="formData.adapterVersion" placeholder="请输入版本号" />
            </ElFormItem>
            <ElFormItem label="更新包文件" prop="spiFile">
              <template #label>
                <div style="display: flex; align-items: center;">
                  更新包文件
                  <ElTooltip
                    effect="dark"
                    placement="top"
                  >
                    <template #content>
                      <span style="font-size: 15px;">请上传 .bin 文件更新包, 不能大于 10MB！</span>
                    </template>
                    <ElIcon size="4" style="margin-left: 5px;">
                      <InfoFilled />
                    </ElIcon>
                  </ElTooltip>
                </div>
              </template>
              <ElUpload
                action=""
                :file-list="spiFileList"
                :auto-upload="false"
                accept=".bin"
                :on-change="spiHandleFileChange"
                class="update_upload"
              >
                <ElButton type="primary">
                  选择文件
                </ElButton>
              </ElUpload>
            </ElFormItem>
          </div>

          <!-- 鼠标更新包模块 -->
          <div class="module-card">
            <div class="module-title">
              鼠标更新包
            </div>
            <ElFormItem label="版本号" prop="mouseVersion">
              <ElInput v-model="formData.mouseVersion" placeholder="请输入版本号" />
            </ElFormItem>
            <ElFormItem label="更新包文件" prop="usbFile">
              <template #label>
                <div style="display: flex; align-items: center;">
                  更新包文件
                  <ElTooltip
                    effect="dark"
                    placement="top"
                  >
                    <template #content>
                      <span style="font-size: 15px;">请上传 .bin 文件更新包, 不能大于 10MB！</span>
                    </template>
                    <ElIcon size="4" style="margin-left: 5px;">
                      <InfoFilled />
                    </ElIcon>
                  </ElTooltip>
                </div>
              </template>
              <ElUpload
                action=""
                :file-list="usbFileList"
                :auto-upload="false"
                accept=".bin"
                :on-change="usbHandleFileChange"
                class="update_upload"
              >
                <ElButton type="primary">
                  选择文件
                </ElButton>
              </ElUpload>
            </ElFormItem>
          </div>

          <!-- 更新描述（共享） -->
          <div class="module-card">
            <div class="module-title">
              更新描述
            </div>
            <ElFormItem label="描述内容" prop="description">
              <ElInput v-model="formData.description" type="textarea" :autosize="{ minRows: 6, maxRows: 6 }" placeholder="" />
            </ElFormItem>
          </div>

          <ElButton type="primary" class="submit-btn w-full" :loading="eLoading" @click="submitForm">
            提交
          </ElButton>
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

.upload-update-package-container .update_upload {
  display: flex;
}
.update_upload .el-upload-list {
  margin-top: 0;
  margin-left: 5px;
}
/* .update_upload .el-upload-list:hover {
  color: red;
} */

.update_upload .el-upload-list__item {
  margin-bottom: 0;
  width: calc(100% + 30px);
}

.update_upload .el-upload-list__item-file-name {
  overflow: visible;
  font-size: 16px;
}
.update_upload .el-upload-list__item-file-name:hover {
  color: #409eff;
}

/* 模块卡片样式 */
.module-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.module-title {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

/* 提交按钮样式 */
.submit-btn {
  margin-top: 10px;
  height: 45px;
  font-size: 16px;
}
</style>
