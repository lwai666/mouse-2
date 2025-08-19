<script setup lang="ts">
import { ElRadioGroup, ElRadio } from 'element-plus'
import { ProfileInfoType } from '~/types'
import { MouseButtonStatus } from '~/types'
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

const { t } = useI18n()

const setLeftHintCode = inject<(str: string) => void>('setLeftHintCode');

const props = withDefaults(defineProps<Props>(), { width: '50%' })

const emit = defineEmits(['click', 'change'])

const mouseButtonCascaderRef = ref()

// const value = useVModel(props, "value", emit);

const constants = useConstants(t)

const profileInfo = inject<ProfileInfoType>('profileInfo');

// const transport = inject<Ref<TransportWebHIDInstance>>('transport');

const options = ref()
watch(() => profileInfo?.macroList, () => {
  const children = constants.mouseKeyOptions.find(item => item.value === 1999)?.children
  children?.forEach((item, index) => {
    item.label = profileInfo?.macroList[index]?.name!
  })
  options.value = deepClone(constants.mouseKeyOptions)
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
    macroIndex: props.macroIndex // 录制宏索引
  })
}

async function onChangeRadioGroup() {
  emit('change', props.id, 2000 + props.macroIndex, 1999, {
    cycleTimes: sendData.value.cycleTimes, // 循环次数
    cycleMode: sendData.value.cycleMode, // 循环模式
    macroIndex: props.macroIndex // 录制宏索引
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
  } else {
    mouseButtonCascaderRef.value?.open()
  }
}

function validateInput() {
  if (sendData.value.cycleTimes < 1) {
    sendData.value.cycleTimes = 1;
  } else if (sendData.value.cycleTimes > 40) {
    sendData.value.cycleTimes = 40;
  }
}

defineExpose({ mouseButtonCascaderRef })
</script>

<template>
<div class="mouse-button-item">
  <div :class="`${cursorClass} ${colorClass}`" class="flex items-center mb-1">
    <div :key="props.id" :class="`${bgClass} ${props.disabled ? '' : 'dot-b' }`" class="w-20px h-20px rounded-50% mr-2 z-2" :data-key-id="props.id"></div>
    <div v-if="props.status === 'connecting'" class="mouse-button-item-radio-group">
      {{ t('mouseConnection.connecting') }}
      <div class="absolute top--50px left-0">
        <el-radio-group v-model="sendData.cycleMode" class="flex-col items-start" @change="onChangeRadioGroup">
          <el-radio :value="4" @click="onEnterKey">
            <div @mouseenter="setLeftHintCode?.('macro_set')">
              {{ t('mouseConnection.loop') }}
              <input type="number" :min="1" :max="40" class="w-10 bg-transparent border-b border-white text-center" v-model="sendData.cycleTimes" @keyup.enter="onEnterKey" @click.stop="()=>{}" @input="validateInput" />
              {{ t('mouseConnection.times') }}
            </div>
          </el-radio>
          <div class="w-50px h-70px"></div>
          <el-radio :value="1">{{ t('mouseConnection.loopUntilKeyRelease') }}</el-radio>
          <el-radio :value="2">{{ t('mouseConnection.loopUntilAnyKeyPressed') }}</el-radio>
          <el-radio :value="3">{{ t('mouseConnection.loopUntilKeyPressAgain') }}</el-radio>
        </el-radio-group>
      </div>
    </div>
    <MouseButtonCascader
      v-else
      ref="mouseButtonCascaderRef"
      :value="value"
      :options="options"
      :cascaderTop="cascaderTop"
      :disabled="props.disabled || value > 1999"
      @click="onClick"
      @change="(value, parentValue) => emit('change', id, value, parentValue)"
    />
  </div>
  <div :class="bgClass" class="w-0 h-[0.5px] transition-all duration-500" :style="{ width: props.width }"></div>
</div>
</template>


<style>
.mouse-button-item {
  .mouse-button-item-radio-group .el-radio {
    --el-radio-text-color: #fff;

    &:hover {
      color: #e83ff4 !important;
    }
    .el-radio__input.is-checked+.el-radio__label:hover {
      color: #e83ff4 !important;
    }
  }
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
