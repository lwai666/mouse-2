<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElButton, ElForm, ElFormItem, ElInput, ElUpload, ElMessage } from 'element-plus'

// 这是管理员密码 admin123 的 SHA-256 哈希值
const ADMIN_PASSWORD_HASH = import.meta.env.VITE_ADMIN_PASSWORD_HASH
const SERVER_API = import.meta.env.VITE_SERVER_API

const isAuthenticated = ref(false)
const password = ref('')
const form = ref()

const sha256 = async (message: string) => {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

const validatePassword = async () => {
  const inputHash = await sha256(password.value)
  if (inputHash === ADMIN_PASSWORD_HASH) {
    isAuthenticated.value = true
    ElMessage.success('验证成功')
  } else {
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

const spiHandleFileChange = (file: any, fileList: any) => {
  formData.spiFile = file.raw
  spiFileList.value = fileList.slice(-1)
}
const usbHandleFileChange = (file: any, fileList: any) => {
  formData.usbFile = file.raw
  usbFileList.value = fileList.slice(-1)
}

const validateVersion = (rule: any, value: string, callback: any) => {
  const versionPattern = /^(\d+\.)?(\d+\.)?(\*|\d+)$/
  if (!versionPattern.test(value)) {
    callback(new Error('版本号格式不正确'))
  } else {
    callback()
  }
}

const validateSpiFile = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请上传适配器更新包'))
    return
  }
  callback()
}

const rules = {
  version: [
    { required: true, message: '请填写上传的更新包的版本号', trigger: 'blur' },
    { validator: validateVersion, trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请填写更新描述', trigger: 'blur' },
    { min: 5, max: 500, message: '长度在 5 到 200 个字符之间', trigger: 'blur' },
  ],
  spiFile: [
    { required: true, message: '请上传适配器更新包', trigger: 'change' },
    { validator: validateSpiFile, trigger: 'blur' }
  ],
  usbFile: [
    { required: true, message: '请上传鼠标更新包', trigger: 'change' },
    { validator: validateSpiFile, trigger: 'blur' }
  ],
}

const submitForm = async () => {
  if (!form.value) return

  try {
    await form.value.validate()

    const _formData = new FormData()
    _formData.append('version', formData.version)
    _formData.append('description', formData.description)
    _formData.append('file1', formData.spiFile)
    _formData.append('file2', formData.usbFile)

    const response = await fetch(SERVER_API + '/api/upload-update-package', {
      method: 'POST',
      body: _formData,
    })
    if (response.ok) {
      ElMessage.success('上传成功')
    } else {
      ElMessage.error('上传失败')
    }
  } catch (error) {
    ElMessage.error('请检查表单填写是否正确')
    return
  }
}
</script>

<template>
  <div class="upload-update-package-container">
    <!-- 密码验证表单 -->
    <el-form v-if="!isAuthenticated" class="my-10 mx-auto w-200" @submit.native.prevent>
      <el-form-item>
        <div class="w-full text-2xl text-center p-10">管理员验证</div>
      </el-form-item>
      <el-form-item>
        <el-input
          v-model="password"
          type="password"
          placeholder="请输入管理员密码"
          @keyup.enter.prevent="validatePassword"
        ></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="w-full" @click="validatePassword">验证</el-button>
      </el-form-item>
    </el-form>

    <!-- 上传表单 -->
    <el-form
      v-else
      :model="formData"
      :rules="rules"
      ref="form"
      label-width="120px"
      class="my-10 mx-auto w-200"
    >
      <el-form-item>
        <div class="w-full text-2xl text-center p-10">更新包上传</div>
      </el-form-item>
      <el-form-item label="版本号" prop="version">
        <el-input v-model="formData.version" placeholder="1"></el-input>
      </el-form-item>
      <el-form-item label="更新描述" prop="description">
        <el-input type="textarea" :autosize="{ minRows: 6, maxRows: 6 }" v-model="formData.description" placeholder="1. 修复了一些已知的问题"></el-input>
      </el-form-item>
      <el-form-item label="适配器更新包" prop="spiFile">
        <el-upload
          action=""
          :file-list="spiFileList"
          :auto-upload="false"
          accept=".bin"
          :on-change="spiHandleFileChange"
        >
          <el-button type="primary">选择文件</el-button>
          <div slot="tip" class="el-upload__tip ml-5">请上传 .bin 文件更新包, 不能大于 10MB！</div>
        </el-upload>
      </el-form-item>
      <el-form-item label="鼠标更新包" prop="usbFile">
        <el-upload
          action=""
          :file-list="usbFileList"
          :auto-upload="false"
          accept=".bin"
          :on-change="usbHandleFileChange"
        >
          <el-button type="primary">选择文件</el-button>
          <div slot="tip" class="el-upload__tip ml-5">请上传 .bin 文件更新包, 不能大于 10MB！</div>
        </el-upload>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="w-full" @click="submitForm">提交</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>


<style>
.upload-update-package-container {
  --el-color-white: #000;
  --el-color-primary: #fff;
  --el-color-primary-light-3: #e0e0e0;
  --el-color-primary-dark-2: #898989;
}
</style>
