<script setup lang="ts">
import { CaretLeft } from '@element-plus/icons-vue'
import { ElIcon } from 'element-plus'

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits(['click', 'change'])

const createHong = inject<() => void>('createHong', () => {})

const { t } = useI18n()

interface Option {
  value: number
  label: string
  hidden?: boolean
  children?: Option[]
}

interface Props {
  value: number
  cascaderTop: number // 上面放多少个
  disabled?: boolean
  options: Option[]
}

const cascaderTopMapp: Record<number, string> = {
  2: 'top--110px',
  3: 'top--150px',
  4: 'top--190px',
  5: 'top--230px',
} as const

const show = ref(false)

const showChildren = ref()
const showChildrenDelay = ref()

watch(showChildren, (value) => {
  setTimeout(() => {
    showChildrenDelay.value = value
  }, 300)
})

function findOption(options: Option[], value: string | number): Option | undefined {
  for (const option of options) {
    if (option.value === value) {
      return option
    }
    if (option.children) {
      const foundOption = findOption(option.children, value)
      if (foundOption) {
        return foundOption
      }
    }
  }
  return undefined
}

const currentOption = computed(() => {
  return findOption(props.options, props.value)
})

const currentOptions = computed<Option[]>(() => {
  const options = JSON.parse(JSON.stringify(props.options)).filter((option: Option) => option.value !== currentOption.value?.value)
  options.splice(props.cascaderTop, 0, currentOption.value)
  return options
})

function cascaderListClass(item: Option) {
  if (showChildren.value) {
    return item.value === showChildren.value ? 'opacity-100 pointer-events-auto' : 'opacity-0'
  }
  else {
    return currentOption.value?.value == item.value ? 'opacity-100 pointer-events-auto' : (show.value ? 'opacity-30 hover:opacity-100 pointer-events-auto' : 'opacity-0')
  }
}

function onClick() {
  emit('click')
}
function onSelect(item: Option, parentValue?: number) {
  if (item.value === 5) {
    createHong(1, 'Right')
    return
  }
  if (item.children && item.children.length) {
    showChildren.value = showChildren.value === item.value ? undefined : item.value
    return
  }

  emit('change', item.value, parentValue)
  close()
}

function open() {
  show.value = true
}
function close() {
  showChildren.value = undefined
  show.value = false
}

defineExpose({ show, open, close })
</script>

<template>
  <div class="mouse-button-cascader pointer-events-none" :class="cascaderTopMapp[cascaderTop]">
    <div class="mouse-button-cascader-menu">
      <!-- <ul class="mouse-button-cascader__list">
        <li
          v-for="(item) in currentOptions"
          :key="item.value"
          :class="cascaderListClass(item)"
          class="relative transition-all duration-500"
          @click="disabled ? () => {} : (value === item.value ? onClick() : onSelect(item))"
        >
          <template v-if="!item.hidden">
            <span>{{ t(item.label) }}</span>
            <ElIcon v-if="item.children && item.children.length" size="16" class="absolute left--15px top-12px transform transition-transform" :class="{ 'rotate-90': showChildren === item.value }">
              <CaretLeft />
            </ElIcon>

            <ul v-if="show && showChildrenDelay === item.value && item.children && item.children.length" class="mouse-button-cascader__list absolute bottom-40px">
              <li
                v-for="child in item.children"
                :key="child.value"
                class="pointer-events-auto opacity-30 transition-all duration-500 hover:opacity-100"
                @click.stop="disabled ? () => {} : onSelect(child, item.value)"
              >
                {{ t(child.label) }}
              </li>
            </ul>
          </template>
        </li>
      </ul> -->
      <ul class="mouse-button-cascader__list">
        <li
          v-for="(item) in currentOptions"
          :key="item.value"
          :class="cascaderListClass(item)"
          class="relative transition-all duration-500"
          @click="disabled ? () => {} : (value === item.value ? onClick() : onSelect(item))"
        >
          <template v-if="!item.hidden">
            <span>{{ t(item.label) }}</span>
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
.mouse-button-cascader {
  position: absolute;
  /* left: 30px; */

  .mouse-button-cascader-menu {
    .mouse-button-cascader__list {
      line-height: 40px;
      text-align: start;
      white-space: nowrap;
    }
  }
}
</style>
