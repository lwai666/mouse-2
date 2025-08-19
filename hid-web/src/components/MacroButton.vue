<script setup lang="ts">
import { Macro } from '~/types';
import { TransportWebHIDInstance } from '~/utils/hidHandle';

const { t } = useI18n()

const transport = inject<Ref<TransportWebHIDInstance>>('transport');

interface Props {
  modelValue: Macro[]
  selectedIndex?: number
}

const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue', 'mouseup'])
const macroList = useVModel(props, 'modelValue', emit)

async function deleteMacro(macro: Macro) {
  if (macro.connections && macro.connections.length > 0) {
    showMessage(t('message.delete_macro_error'))
    return
  }

  const macroIndex = macroList.value.findIndex(item => item === macro)
  console.log("删除组合键宏========", macroIndex)
  await transport?.value.send([0x08, 0x00, 1, 1, 1, 0xff, macroIndex]);
  macroList.value[macroIndex] = { name: '', connections: [], value: [] }
}
</script>

<template>
<div class="macro-button-container flex flex-col justify-around absolute top-0 left-0 pl-10%">
  <MacroButtonItem v-for="(macro, index) in macroList" :key="index" :index="index" :macro="macro" :show-name="index === selectedIndex" v-model="macro.name" @deleteMacro="deleteMacro" @mouseup="emit('mouseup', index)" />
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
