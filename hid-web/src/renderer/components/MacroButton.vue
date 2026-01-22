<script setup lang="ts">
import type { Macro } from '~/types'

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits(['update:modelValue', 'mouseup'])

interface Props {
  modelValue: Macro[]
  selectedIndex?: number
}

const macroList = useVModel(props, 'modelValue', emit)
</script>

<template>
  <div class="macro-button-container absolute left-0 top-0 flex flex-col justify-around pl-10%">
    <MacroButtonItem v-for="(macro, index) in macroList" :key="index" v-model="macro.name" :index="index" :macro="macro" :show-name="index === selectedIndex" @mouseup="emit('mouseup', index)" />
  </div>
</template>

<style>
.macro-button-container {
  border-bottom: 1px;
  .el-input__wrapper {
    border-radius: 0;
    border-bottom: 1px solid transparent;
  }
  .el-input__wrapper:hover {
    box-shadow: none;
    border-bottom: 1px solid #fff;
  }
  .el-input__wrapper.is-focus {
    box-shadow: none;
    border-bottom: 1px solid #fff;
  }
}
</style>
