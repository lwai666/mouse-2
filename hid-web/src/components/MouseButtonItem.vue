<script setup lang="ts">
import type { MouseButtonStatus, ProfileInfoType } from '~/types'
import { ElRadio, ElRadioGroup } from 'element-plus'
import { deepClone } from '~/utils'
// import { TransportWebHIDInstance } from '~/utils/hidHandle'

interface Props {
  id: string
  show: boolean
  value: number
  width: string
  cascaderTop: number
  disabled?: boolean
  status: MouseButtonStatus
  macroIndex: number
}

const props = withDefaults(defineProps<Props>(), { width: '50%' })

const emit = defineEmits(['click', 'change'])

const { t } = useI18n()

const setLeftHintCode = inject<(str: string) => void>('setLeftHintCode')

const mouseButtonCascaderRef = ref()

// const value = useVModel(props, "value", emit);

const constants = useConstants(t)

const profileInfo = inject<ProfileInfoType>('profileInfo')
const language = inject('language')

// const transport = inject<Ref<TransportWebHIDInstance>>('transport');

const options = ref()
watch(() => profileInfo?.macroList, () => {
  const data = constants.mouseKeyOptions.find(item => item.value === 1999)
  data?.children?.forEach((item, index) => {
    item.label = profileInfo?.macroList[index]?.name
  })
  data.hidden = !profileInfo?.macroList.filter((k: any) => k.name).length
  options.value = deepClone(constants.mouseKeyOptions)
}, { immediate: true, deep: true })

watch(() => language, () => {
  const constants = useConstants(t)
  options.value = constants.mouseKeyOptions
}, { immediate: true, deep: true })

const sendData = ref({
  cycleTimes: 1,
  cycleMode: 4,
})

async function onEnterKey() {
  // props.id, // 按键ID [Left Wheel Right Forward Back dpi]
  emit('change', props.id, 2000 + props.macroIndex, 1999, {
    cycleTimes: sendData.value.cycleTimes, // 循环次数
    cycleMode: 4, // 循环模式
    macroIndex: props.macroIndex, // 录制宏索引
  })
}

async function onChangeRadioGroup() {
  emit('change', props.id, 2000 + props.macroIndex, 1999, {
    cycleTimes: sendData.value.cycleTimes, // 循环次数
    cycleMode: sendData.value.cycleMode, // 循环模式
    macroIndex: props.macroIndex, // 录制宏索引
  })
}

const bgClass = computed(() => {
  return props.disabled ? 'bg-red' : 'bg-white'
})

const colorClass = computed(() => {
  return props.disabled ? 'text-red' : 'text-white'
})

const cursorClass = computed(() => {
  return props.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
})

function onClick() {
  emit('click')

  if (mouseButtonCascaderRef.value?.show) {
    mouseButtonCascaderRef.value?.close()
  }
  else {
    mouseButtonCascaderRef.value?.open()
  }
}

function validateInput() {
  if (sendData.value.cycleTimes < 1) {
    sendData.value.cycleTimes = 1
  }
  else if (sendData.value.cycleTimes > 40) {
    sendData.value.cycleTimes = 40
  }
}

const hongName = ref('')

function setName(name) {
  hongName.value = name
}

const active = ref('')

function changeActive(type) {
  if (active.value === type) {
    active.value = ''
    return
  }
  active.value = type
}

const active1 = ref('')

function changeActive1(type) {
  if (active1.value === type) {
    active1.value = ''
    return
  }
  active1.value = type
}

const cascaderTopMapp: Record<number, string> = {
  2: '204px',
  3: '158px',
  4: '158px',
  5: '88px',
} as const

defineExpose({ mouseButtonCascaderRef })
</script>

<template>
  <div class="mouse-button-item">
    <div :class="`${cursorClass} ${colorClass}`" class="mb-1 flex items-center">
      <!-- <div :key="props.id" :class="`${bgClass} ${props.disabled ? '' : 'dot-b'}`" class="z-2 mr-2 h-18px w-18px rounded-50%" :data-key-id="props.id" /> -->
      <div v-if="props.status === 'connecting'" class="absolute top-[-20px]">
        <div class="flex items-center justify-center">
          <div class="absolute left-[-105px] flex items-center justify-center">
            <p v-if="active1 === 'active1'" class="absolute left-[-190px]" style="color: #CF0EFF">
              {{ t('button.macro_execution_description') }}
            </p>
            <img
              style="margin-right: 5px;"
              :src="active1 === 'active1' ? '/public/v9/wenhao_active.png' : '/public/v9/wenhao.png'"
              alt="" srcset="" @click="changeActive1('active1')"
            >
            <div style="z-index: 1; width: 49.06px;height: 21.68px;border-radius: 14px;background: #6A0A82;color: #fff; font-size: 14px;" class="ml-3 flex items-center justify-center" @click.stop="onChangeRadioGroup">
              {{ t('button.macro_execute') }}
            </div>
          </div>
          {{ hongName }}
        </div>

        <div class="absolute left-[-60px] top--100px">
          <!-- <ElRadioGroup v-model="sendData.cycleMode" class="flex-col items-start" @change="onChangeRadioGroup">
            <ElRadio :value="4" @click="onEnterKey">
              <div @mouseenter="setLeftHintCode?.('macro_set')">
                宏执行
                <input v-model="sendData.cycleTimes" type="number" :min="1" :max="40" class="w-10 border-b border-white bg-transparent text-center" @keyup.enter="onEnterKey" @click.stop="() => {}" @input="validateInput">
                {{ t('mouseConnection.times') }}
              </div>
            </ElRadio>
            <div class="h-70px w-50px" />
            <ElRadio :value="1">
              {{ t('mouseConnection.loopUntilKeyRelease') }}
            </ElRadio>
            <ElRadio :value="2">
              {{ t('mouseConnection.loopUntilAnyKeyPressed') }}
            </ElRadio>
            <ElRadio :value="3">
              {{ t('mouseConnection.loopUntilKeyPressAgain') }}
            </ElRadio>
          </ElRadioGroup> -->
          <div class="flex items-center">
            <p v-if="active === 'active'" class="absolute left-[-315px]" style="color: #159FFF">
              {{ t('button.macro_loop_count_input') }}
            </p>
            <img
              style="margin-right: 15px;"
              :src="active === 'active' ? '/public/v9/wenhao_active.png' : '/public/v9/wenhao.png'"
              alt="" srcset="" @click="changeActive('active')"
            >
            <div class="hover items-center justify-center" :class="{ hover_active: sendData.cycleMode === 4 }" style="width: 151px;height: 30px;display: flex;background: #333;border-radius: 14px">
              {{ t('button.macro_execution') }}

              <input v-model="sendData.cycleTimes" type="number" :min="1" :max="40" class="w-10 border-b border-white bg-transparent text-center" @keyup.enter="onEnterKey" @click.stop="() => {}" @input="validateInput">
              {{ t('mouseConnection.times') }}
            </div>
            <div style="width: 49.06px;height: 21.68px;border-radius: 14px;background: #0E5383;color: #fff; font-size: 14px;" class="ml-3 flex items-center justify-center" @click="onEnterKey">
              {{ t('macro.confirm') }}
            </div>
          </div>
          <div class="mb-3 ml-11 mt-5 flex items-center">
            <div class="hover items-center justify-center" :class="{ hover_active: sendData.cycleMode === 1 }" style="text-align: right; width: 151px;height: 30px;display: flex;background: #333;border-radius: 14px" @click="sendData.cycleMode = 1">
              {{ t('button.macro_execution') }}

              N
              {{ t('mouseConnection.times') }}
            </div>
          </div>
          <div class="h-60px w-50px" />

          <div class="mb-3 flex items-center">
            <div class="hover items-center justify-center" :class="{ hover_active: sendData.cycleMode === 2 }" style="text-align: right; width: 195px;height: 30px;display: flex;background: #333;border-radius: 14px" @click="sendData.cycleMode = 2">
              {{ t('button.macro_execute_until_release') }}
            </div>
          </div>

          <div class="mb-3 flex items-center">
            <div class="hover items-center justify-center" :class="{ hover_active: sendData.cycleMode === 3 }" style="text-align: right; width: 249px;height: 30px;display: flex;background: #333;border-radius: 14px" @click="sendData.cycleMode = 3">
              {{ t('button.macro_execute_until_repressed') }}
            </div>
          </div>
        </div>
      </div>
      <MouseButtonCascader
        v-else
        :id="props.id"
        ref="mouseButtonCascaderRef"
        :value="value"
        :options="options"
        :cascader-top="cascaderTop"
        :disabled="props.disabled"
        @click="onClick"
        @change="(value, parentValue) => emit('change', id, value, parentValue)"
        @set-name="setName"
      />
    </div>
    <div :class="bgClass" class="h-[0.5px] w-0 transition-all duration-500" :style="{ width: props.width }" />
  </div>
</template>

<style>
.mouse-button-item {
  .hover:hover {
    background: #daff00 !important;
    color: #333 !important;
  }
  .hover_active {
    background: #daff00 !important;
    color: #333 !important;
  }
  /* .mouse-button-item-radio-group .el-radio {
    --el-radio-text-color: #fff;

    &:hover {
      color: #e83ff4 !important;
    }
    .el-radio__input.is-checked + .el-radio__label:hover {
      color: #e83ff4 !important;
    }
  } */
  /* .el-input.is-disabled .el-input__inner {
    -webkit-text-fill-color: #fff;
    cursor: not-allowed;
  }

  .el-input__wrapper {
    background: transparent !important;
    box-shadow: none !important;

    .el-input__inner {
      color: #fff;
      font-size: 1rem;
    }
    .el-input__inner:hover {
      opacity: 0.8;
    }

    .el-input__suffix {
      display: none;
    }
  }

  .text-red {
    .el-input__inner {
      --un-text-opacity: 1;
      color: rgb(248 113 113 / var(--un-text-opacity));
    }
  } */
}
</style>
