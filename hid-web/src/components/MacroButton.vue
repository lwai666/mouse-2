<script setup lang="ts">
import type { Macro } from '~/types'
import type { TransportWebHIDInstance } from '~/utils/hidHandle'

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits(['update:modelValue', 'mouseup'])

const { t } = useI18n()

const transport = inject<Ref<TransportWebHIDInstance>>('transport')

interface Props {
  modelValue: Macro[]
  selectedIndex?: number
}

const macroList = useVModel(props, 'modelValue', emit)

console.log(macroList, 'macroList')

async function deleteMacro(macro: Macro) {
  console.log(macro, 'macro')
  if (macro.connections && macro.connections.length > 0) {
    showMessage(t('message.delete_macro_error'))
    return
  }

  const macroIndex = macroList.value.findIndex(item => item === macro)
  console.log('删除组合键宏========', macroIndex)
  await transport?.value.send([0x08, 0x00, 1, 1, 1, 0xFF, macroIndex])
  macroList.value[macroIndex] = { name: '', connections: [], value: [] }
}
</script>

<template>
  <div class="macro-button-container absolute left-0 top-0 flex flex-col justify-around pl-10%">
    <MacroButtonItem v-for="(macro, index) in macroList" :key="index" v-model="macro.name" :index="index" :macro="macro" :show-name="index === selectedIndex" @delete-macro="deleteMacro" @mouseup="emit('mouseup', index)" />
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
