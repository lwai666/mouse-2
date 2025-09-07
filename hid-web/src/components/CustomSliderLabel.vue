<script setup lang="ts">
import { ElSlider } from 'element-plus'

interface Props {
  bind: Record<string, any>
  modelValue: number
  vertical?: boolean
  showFixed?: boolean
  defaultSelectOptions: { label: string, value: number }[]
  mouseenter?: () => void
}

const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue', 'change'])

const value = useVModel(props, 'modelValue', emit)

const currentItem = computed(() => {
  return props.defaultSelectOptions.find(item => item.value === value.value)
})

// function getUnit(input: string) {
//   const match = input.match(/[a-zA-Z]+$/);
//   return match ? match[0] : '';
// }

const showOptions = ref(false)

const containerRef = ref()

onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleMouseMove)
})

function handleMouseMove(event: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    showOptions.value = false
  }
}

function onClickOptions(item: { label: string, value: number }) {
  emit('update:modelValue', item.value)
  nextTick(() => {
    emit('change', item.value)
  })
}
</script>

<template>
  <div ref="containerRef" class="custo-slider-container">
    <ElSlider
      v-model="value"
      v-bind="bind"
      :vertical="vertical"
      :show-tooltip="false"
      @change="emit('change', $event)"
      @mouseenter="showOptions = true"
      @mouseleave="showOptions = false"
    />
    <ul
      v-if="showOptions || showFixed"
      class="custo-slider-default-select absolute"
      :class="vertical ? `left-[-110%]` : 'bottom-[33px] -translate-x-1/2'"
      :style="vertical ? `bottom: calc(${value / bind.max * 100}% - 12px);` : `left: ${value / bind.max * 100}%;`"
      @mouseenter="showOptions = true"
      @mouseleave="showOptions = false"
    >
      <template v-for="item in defaultSelectOptions" :key="item.value">
        <li
          v-if="value !== item.value && !showFixed"
          class="cursor-pointer color-description leading-4 hover:color-[#DAFF00]"
          @click="onClickOptions(item)"
          @mouseenter="mouseenter"
        >
          {{ item.label }}
        </li>
      </template>
      <li class="cursor-pointer text-base">
        {{ currentItem?.label }}
      </li>
    </ul>
  </div>
</template>

<style>
.custo-slider-container {
  .custo-slider-default-select {
    font-size: 12px;
  }
}
</style>
