<script setup lang="ts">
import { ElSlider } from 'element-plus'


interface Props {
  bind: Record<string, any>
  modelValue: number
  vertical?: boolean
  doubleClickEdit?: boolean
  showFixed?: boolean
  defaultSelectOptions: { label: string; value: number }[]
  marks: Record<string, any>
  labelTransform?: (value: number) => void
  mouseenter?: () => void
}

const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue', 'change'])

const value = useVModel(props, "modelValue", emit);

function getUnit(input: string) {
  const match = input.match(/[^0-9.-]+$/);
  return match ? match[0] : '';
}

const showOptions = ref(false);

const containerRef = ref();

// onMounted(() => {
//   document.addEventListener('mousemove', handleMouseMove);
// });

// onBeforeUnmount(() => {
//   document.removeEventListener('mousemove', handleMouseMove);
// });

// function handleMouseMove(event: MouseEvent) {
//   if (containerRef.value && !containerRef.value.contains(event.target)) {
//     showOptions.value = false;
//   }
// }

function onClickOptions(item: { label: string; value: number }) {
  emit('update:modelValue', item.value);
  nextTick(() => {
    emit('change', item.value);
  });
}


const inputRef = ref();
const inputValue = ref();
const isEditing = ref(false);
function editValue() {
  inputValue.value = value.value
  isEditing.value = true;
  nextTick(() => {
    inputRef.value.focus();
  });
}
function saveValue() {
  isEditing.value = false;
  showOptions.value = false;
  const num = Math.floor(Number(inputValue.value))

  if (!Number.isNaN(num)) {
    emit('update:modelValue', num);
    nextTick(() => {
      emit('change', num);
    });
  }
}

function onMouseleave() {
  if (showOptions.value && !isEditing.value) {
    showOptions.value = false;
  }
}


</script>

<template>
<div class="custo-slider-container" ref="containerRef">
  <el-slider
    v-model="value"
    v-bind="bind"
    :vertical="vertical"
    :show-tooltip="false"
    @change="emit('change', $event)"
    @mouseenter="showOptions = true"
    @mouseleave="onMouseleave"
    :marks="marks"
  />
  <ul
    v-if="showOptions || showFixed"
    class="custo-slider-default-select absolute"
    :class="vertical ? `left-[-100%]` : 'bottom-[33px] -translate-x-1/2'"
    style="color: #DAFF00;"
    :style="vertical ? `bottom: calc(${(value - bind.min)/(bind.max - bind.min)*100}% - 12px);` : `left: ${(value - bind.min)/(bind.max - bind.min)*100}%;`"
    @mouseenter="showOptions = true"
    @mouseleave="onMouseleave"
  >
    <template v-for="item in defaultSelectOptions" :key="item.value">
      <li
        v-if="value !== item.value && !showFixed"
        class="color-description leading-4 hover:color-[#DAFF00] cursor-pointer"
        @click="onClickOptions(item)"
        @mouseenter="mouseenter">
        {{ item.label }}
      </li>
    </template>
    <li class="text-base cursor-pointer" @dblclick="doubleClickEdit ? editValue() : null">
      <input v-if="isEditing" ref="inputRef" class="w-[70px] text-center" type="text" v-model="inputValue" @blur="saveValue" @keyup.enter="saveValue" />
      <template v-else-if="labelTransform">{{ labelTransform(value) }}</template>
      <template v-else>{{ value }}{{ getUnit(defaultSelectOptions[0].label) }}</template>
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
