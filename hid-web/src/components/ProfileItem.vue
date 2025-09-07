<script setup lang="ts">
import type { ProfileInfoType } from '~/types'
import type { TransportWebHIDInstance } from '~/utils/hidHandle'
import { Check, Share } from '@element-plus/icons-vue'
import { useClipboard } from '@vueuse/core'
import { ElButton, ElInput } from 'element-plus'
import { checkProfile, encodeStringToArrayBuffer, insertAt9th, jsonToBase64, removeAt9th } from '~/utils'

const props = withDefaults(defineProps<Props>(), { active: false })

const emit = defineEmits(['update:modelValue', 'update:title', 'click', 'change', 'mouseenterShare'])

const { t } = useI18n()

const profileInfo = inject<ProfileInfoType>('profileInfo')

const transport = inject<Ref<TransportWebHIDInstance>>('transport')

interface Props {
  index: number
  title: string
  modelValue: string
  active?: boolean
}

const base64 = useVModel(props, 'modelValue', emit)
const title = useVModel(props, 'title', emit)

const { copied, copy } = useClipboard({ source: base64 })

watch(copied, (newV) => {
  if (newV) {
    showMessage(t('message.profile_copied'))
  }
})

const buttonType = ref<'share' | 'check'>('share')

const tempBase64 = ref('')

function onInput(value: string) {
  tempBase64.value = value
  buttonType.value = 'check'
}

watch(() => props.active, (newV) => {
  isEditingProfile.value = false
})

function setProfile() {
  isEditingProfile.value = false
  if (checkProfile(removeAt9th(tempBase64.value))) {
    base64.value = tempBase64.value
    emit('change')
    buttonType.value = 'share'
  }
  else {
    showMessage(t('message.format_error'))
    buttonType.value = 'share'
  }
}

const inputField = ref()

const isEditingTitle = ref(false)

const isEditingProfile = ref(false)
const profileInputField = ref()
// const tempProfileValue = ref('')

async function onProfileDblClick() {
  isEditingProfile.value = true
  tempBase64.value = ''
  await nextTick()
  if (profileInputField.value) {
    profileInputField.value.focus()
  }
}

function onProfileBlur() {
  isEditingProfile.value = false
  // if (tempProfileValue.value) {
  //   onInput(tempProfileValue.value);
  // }
}

async function onTitleDblClick() {
  isEditingTitle.value = true
  await nextTick()
  if (inputField.value) {
    inputField.value.focus()
  }
}

function onTitleBlur() {
  isEditingTitle.value = false
  sendProfileName(title.value)
}

async function sendProfileName(macroName: string) {
  console.log('设置 Profile 配置名字=======', macroName)
  const macroNameArrayBuffer = encodeStringToArrayBuffer(macroName)
  await transport?.value.send([0x19, 0x00, macroNameArrayBuffer.length, 10 + props.index, ...macroNameArrayBuffer])
}

function onClick() {
  emit('click', props.index)
  buttonType.value = 'share'
}

function copyBase64() {
  const base64 = insertAt9th(jsonToBase64(profileInfo!), 'd')
  copy(base64)
}
</script>

<template>
  <div class="profile-item">
    <div class="h-full flex items-center">
      <div class="w-16% cursor-pointer color-white" :class="props.active ? 'text-lg' : 'opacity-30'" @click="onClick" @dblclick="onTitleDblClick">
        <ElInput v-if="isEditingTitle" ref="inputField" v-model="title" class="profile-input text-lg" :maxlength="10" @blur="onTitleBlur" />
        <span v-else class="inline-block h-4 min-w-50px">{{ props.title }}</span>
      </div>
      <div v-if="props.active" class="w-69% flex items-center">
        <template v-if="isEditingProfile">
          <ElInput
            ref="profileInputField"
            v-model="tempBase64"
            class="profile-input text-lg"
            :placeholder="t('input.profile_input')"
            @input="onInput"
            @blur="onProfileBlur"
          />
        </template>
        <template v-else>
          <div class="flex-1 cursor-pointer overflow-hidden text-ellipsis px-3 text-center" @dblclick="onProfileDblClick">
            {{ base64 || t('input.profile_input') }}
          </div>
        </template>
        <ElButton v-if="buttonType === 'share'" :icon="Share" circle size="small" @click="copyBase64" @mouseenter="emit('mouseenterShare')" />
        <ElButton v-else-if="buttonType === 'check'" :icon="Check" circle size="small" @click="setProfile" />
      </div>
    </div>
    <div v-if="props.active" class="h-1px w-85% bg-white" />
  </div>
</template>

<style>
.profile-item .profile-input {
  flex: 1;

  .el-input__inner {
    text-align: center;
  }

  --el-input-bg-color: transparent;
  --el-fill-color-blank: transparent;
  --el-input-border-color: transparent;
  --el-border-color: transparent;
  --el-input-focus-border-color: transparent;
  --el-input-hover-border-color: transparent;
  --el-input-text-color: #fff;
}
</style>
