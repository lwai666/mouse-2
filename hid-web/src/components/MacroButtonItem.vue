<script setup lang="ts">
import { ref } from 'vue';
import { Close } from '@element-plus/icons-vue'
import { ElButton, ElInput } from 'element-plus'


import { Macro } from './MacroButton.vue';
import { TransportWebHIDInstance } from '~/utils/hidHandle';
import { encodeStringToArrayBuffer } from '~/utils';

const userStore = useUserStore()

interface Props {
  index: number
  macro: Macro
  modelValue: string
  showName: boolean
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue', 'deleteMacro', 'mouseup'])

const transport = inject<Ref<TransportWebHIDInstance>>('transport');

const macroName = useVModel(props, "modelValue", emit);
const isHovered = ref(false);

async function onChange(macroName: string) {
  console.log("设置宏按键名字=======", macroName)
  const macroNameArrayBuffer = encodeStringToArrayBuffer(macroName)
  await transport?.value.send([0x19, 0x00, macroNameArrayBuffer.length, 6 + props.index, ...macroNameArrayBuffer]);
}
</script>

<template>
<div class="macro-button-item flex items-center cursor-pointer justify-end" :class="macro.value.length > 0 ? '' : 'opacity-0'" @mouseenter="isHovered = true" @mouseleave="isHovered = false">
  <el-button v-if="userStore.mouseButtonStatus !== 'connecting'" class="action-btn" :icon="Close" circle size="small" @click="emit('deleteMacro', props.macro)" />
  <el-input v-show="isHovered || showName" class="mx-1 macro-button-item-input" :placeholder="macro.name" v-model="macroName" style="width: 100px" :input-style="{ textAlign: 'right' }" @change="onChange" />
  <div class="w-26px h-26px rounded-50% dot-a z-10" :class="showName ? 'bg-#d64dec' : 'bg-white'" :key="`dot-a-${macro.name}`" :data-macro-index="index" @mouseup="emit('mouseup', index)"></div>
</div>
</template>

<style>
.macro-button-item {
  --el-input-bg-color: transparent;
  --el-fill-color-blank: transparent;
  --el-input-border-color: transparent;
  --el-border-color: transparent;
  --el-input-focus-border-color: transparent;
  --el-input-hover-border-color: transparent;
  --el-button-size: 18px;

  position: relative;

  .macro-button-item-input {
    position: absolute;
    top: -22px;
    right: 10px;

    .el-input__inner {
      height: 20px;
      line-height: 20px;
    }
  }

  .action-btn {
    visibility: hidden;
    display: inline-flex;
    transition: all 0.3s ease-in-out;
    opacity: 0;
    transform-origin: center;
    transform: scale(0);

    margin-right: 5px;
    color: #e77975;
    font-weight: bold;

    &:hover {
      border-color: #e77975;
    }
  }


  &:hover {
    .action-btn {
      visibility: visible;
      opacity: 1;
      transform: scale(1);
    }
  }
}
</style>
