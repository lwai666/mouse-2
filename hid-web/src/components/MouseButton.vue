<script setup lang="ts">
import type { MouseButtonType } from '~/pages/hid/v8.vue'
import { ElMessage } from 'element-plus'
import { onBeforeUnmount, onMounted } from 'vue'
import MouseButtonItem from './MouseButtonItem.vue'

const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['change'])
// const { t } = useI18n()

const dotsCleanup = inject<Ref<() => void>>('dotsCleanup', ref(() => {}))
const createConnection = inject<() => void>('createConnection', () => {})

interface Props {
  value: Record<string, number>
}
const mouseButtonItemRef = ref()

export interface mouseButton {
  id: string
  show: boolean
  value: number
  class: string
  width: string
  cascaderTop: number
  disabled?: boolean
}

const userStore = useUserStore()
const macroIndex = ref<number>(0)

const mouseButtonList = ref<mouseButton[]>([
  { id: 'Left', show: true, value: 0, class: 'w-full absolute left--50px  top-11%', width: '0%', cascaderTop: 2, disabled: true },
  { id: 'Wheel', show: true, value: 2, class: 'w-full absolute left--50px top-22%', width: '0%', cascaderTop: 2 },
  { id: 'Right', show: true, value: 1, class: 'w-full absolute left--50px top-33%', width: '0%', cascaderTop: 3 },
  { id: 'Forward', show: true, value: 3, class: 'w-full absolute left--50px top-43%', width: '0%', cascaderTop: 4 },
  { id: 'Back', show: true, value: 4, class: 'w-full absolute left--50px top-58%', width: '0%', cascaderTop: 5 },
])

watchEffect(() => {
  const value = props.value
  for (const item of mouseButtonList.value) {
    item.value = value[item.id]
  }
})

onMounted(() => {
  mouseButtonList.value[0].width = '75%'
  mouseButtonList.value[1].width = '88%'
  mouseButtonList.value[2].width = '96%'
  mouseButtonList.value[3].width = '62%'
  mouseButtonList.value[4].width = '62%'
})

function onClick(id?: string) {
  if (id === 'Left') { return }

  const showList = mouseButtonList.value.filter(i => i.show)

  // 如果 showList 有就显示连线， 如果没有就隐藏连线
  if (id) {
    if (showList && showList[0].id === id) {
      nextTick(() => setTimeout(createConnection, 100))
    }
    else {
      dotsCleanup.value()
    }
  }

  if (showList && showList.length === 1 && showList[0].id === id) {
    id = void 0 // 显示所有
  }

  mouseButtonList.value.forEach((item) => {
    item.show = id ? (item.id === id) : true
  })

  // 设置组合键宏 - 回复
  userStore.mouseButtonStatus = 'normal'
}

function onChange(id: MouseButtonType, value: number, parentValue: number, connectionData: number[]) {
  emit('change', id, value, parentValue, connectionData)
  setTimeout(() => {
    onClick()
  }, 300)
}

function onConnection(fromIndex: number, toId: string) {
  macroIndex.value = fromIndex
  mouseButtonList.value.forEach((item) => {
    item.show = item.id === toId
  })

  userStore.mouseButtonStatus = 'connecting'
}

function resetConnection() {
  macroIndex.value = 0
  mouseButtonList.value.forEach((item) => {
    item.show = true
  })
  userStore.mouseButtonStatus = 'normal'
}

function handleClickOutside(event: MouseEvent) {
  const cascaderElement = document.querySelector('.mouse-button-container')
  if (cascaderElement && !cascaderElement.contains(event.target as Node)) {
    if (mouseButtonItemRef.value && userStore.mouseButtonStatus === 'normal') {
      mouseButtonItemRef.value.forEach((item: any) => {
        item.mouseButtonCascaderRef?.close()
      })
      const showList = mouseButtonList.value.filter(i => i.show)
      if (showList.length === 1) {
        onClick(showList[0].id)
      }
    }
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

defineExpose({ onConnection, resetConnection })
</script>

<template>
  <div class="mouse-button-container">
    <MouseButtonItem v-for="item in mouseButtonList" ref="mouseButtonItemRef" :key="item.id" :class="{ hidden: !item.show }" v-bind="item" :status="userStore.mouseButtonStatus" :macro-index="macroIndex" @click="onClick(item.id)" @change="onChange" />
  </div>
</template>
