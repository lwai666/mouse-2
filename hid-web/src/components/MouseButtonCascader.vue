<script setup lang="ts">
import { CaretLeft } from '@element-plus/icons-vue'
import { ElIcon } from 'element-plus'

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits(['click', 'change', 'setName', 'handleClickOutsideEmit'])

const createHong = inject<() => void>('createHong', () => {})

const mouseButtonClickFn = inject<() => void>('mouseButtonClickFn', () => {})

const { t } = useI18n()

interface Option {
  value: number
  label: string
  hidden?: boolean
  children?: Option[]
}

interface Props {
  id: string
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

const cascaderTopMapp1: Record<number, string> = {
  2: 'top--204px',
  3: 'top--158px',
  4: 'top--158px',
  5: 'top--88px',
} as const

const cascaderTopMapp2: Record<number, string> = {
  2: 'top--187px',
  3: 'top--147px',
  4: 'top--107px',
  5: 'top--67px',
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
    return currentOption.value?.value === item.value ? 'opacity-100 pointer-events-auto' : (show.value ? 'opacity-30 hover:opacity-100 pointer-events-auto' : 'opacity-0')
  }
}

function onClick() {
  emit('click')
}



const hidden = ref(true)

function onSelect(item: Option, parentValue?: number, index?: number) {
  console.log(item, parentValue, index, 'item')
  // if (item.value === 1999) {
  //   createHong(1, 'Right')
  //   return
  // }
  if (item.children && item.children.length) {
    showChildren.value = showChildren.value === item.value ? undefined : item.value
    if (item.value === 1999) {
      hidden.value = false
    }
    return
  }

  if (parentValue === 1999) {
    createHong(index, props.id)
    emit('setName', item.label)
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
  hidden.value = true
}

function mouseButtonClick() {
  mouseButtonClickFn()
}

function executeFn(item) {
  let kIndex = props.options.findIndex(k => k.value == 1999)
  let cIndex = props.options[kIndex].children.findIndex(j => j.value == item.value)
  onSelect(item, 1999, cIndex)
}

function getShow(children: Option[]) {
  for (let i = 0; i < children.length; i++) {
    if (children[i].label) {
      return false
    }
  }
  return true
}



defineExpose({ show, open, close })
</script>

<template>
  <div class="mouse-button-cascader pointer-events-none" :class="cascaderTopMapp[cascaderTop]">
    <div class="mouse-button-cascader-menu">
      <ul class="mouse-button-cascader__list">
        <li
          v-for="(item) in currentOptions"
          :key="item.value"
          :class="cascaderListClass(item)"
          class="relative transition-all duration-500"
          @click="disabled ? mouseButtonClick() : (value === item.value ? onClick() : onSelect(item))"
        >
          <template v-if="item.value !== 1999">
            <div>
              <div class="relative flex items-center" style="width: max-content;">
                <div
                  v-if="item.value > 1999 && item.label"
                  style="z-index: 1; padding: 3px 10px; height: 21.68px;border-radius: 14px;background: #6A0A8280;color: #fff; font-size: 14px;"
                  class="backgroundHover absolute left-[-76px] ml--3 flex items-center justify-center" @click.stop="executeFn(item)"
                >
                  {{ t('button.macro_execute') }}
                </div>

                <span :class="[!disabled ? 'hover_text' : '']">
                  {{ item.label }}
                </span>
              </div>
            </div>

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

          <template v-if="item.value === 1999">
            <span v-if="hidden">{{ t(item.label) }}</span>
            <ElIcon v-if="item.children && item.children.length && hidden" size="16" class="absolute left--15px top-12px transform transition-transform" :class="{ 'rotate-90': showChildren === item.value }">
              <CaretLeft />
            </ElIcon>
            <ul v-if="show && showChildrenDelay === item.value && item.children && item.children.length" class="mouse-button-cascader__list absolute" :class="cascaderTopMapp1[cascaderTop]">
              <li
                v-for="(child, kIndex) in item.children"
                :key="child.value"
                class="pointer-events-auto opacity-30 transition-all duration-500 hover:opacity-100"
                :class="[!disabled ? 'hover_text' : '']"
                @click.stop="disabled ? () => {} : onSelect(child, item.value, kIndex)"
              >
                {{ t(child.label) }}
              </li>
            </ul>
            <span v-if="!hidden && getShow(item.children)" @click.stop="onClick"  class="absolute" :class="cascaderTopMapp2[cascaderTop]" style="color: red;right:102% ;"> <span style="font-size: 20px;margin-right: 10px;"><</span>{{ t('title.no_available_macros') }}</span>
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
  .backgroundHover:hover {
    background: #6a0a82 !important;
  }

  .hover_text:hover {
    color: #daff00 !important;
  }
}
</style>
