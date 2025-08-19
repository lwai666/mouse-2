<script setup lang="ts">
import { ElCascader } from 'element-plus'
// 废弃组件
interface Props {
  id: string
  value: string
  width: string
  disabled?: boolean
}

const { t } = useI18n()

const props = withDefaults(defineProps<Props>(), { width: '50%' })

const emit = defineEmits(['change'])

const value = useVModel(props, "value", emit);

const constants = useConstants(t)

const bgClass = computed(() => {
  return props.disabled ? 'bg-red' : 'bg-white'
})

const colorClass = computed(() => {
  return props.disabled ? 'text-red' : 'text-white'
})

const cursorClass = computed(() => {
  return props.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
})


const onVisibleChange = (value: boolean) => {
  if (!value) {
    setTimeout(()=> emit('change'), 0)
  }
}
</script>

<template>
<div class="mouse-button-item">
  <div :class="`${cursorClass} ${colorClass}`" class="flex items-center mb-1" @click="emit('change', props.id)">
    <div :key="props.id" :class="`${bgClass} ${props.disabled ? '' : 'dot-b' }`" class="w-20px h-20px rounded-50% mr-2"></div>
    <!-- <div class="hover:opacity-80">{{ props.id }}</div> -->
     <!-- :show-all-levels="false" -->
    <el-cascader popper-class="custom-popper" v-model="value" :options="constants.mouseKeyOptions" @visible-change="onVisibleChange" :disabled="props.disabled" />
  </div>
  <div :class="bgClass" class="w-0 h-[0.5px] transition-all duration-500" :style="{ width: props.width }"></div>
</div>
</template>


<style>
.mouse-button-item {
  .el-input.is-disabled .el-input__inner {
    /* -webkit-text-fill-color: rgb(248 113 113 / var(--un-text-opacity)) #f87171; */
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
      color: rgb(248 113 113 / var(--un-text-opacity)) /* #f87171 */;
    }
  }
}
/* .mouse-button-item-popper {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(1px);
  border-radius: 10px;

  .el-scrollbar {
    border-color: #fff;
  }

  .el-cascader-panel {
    font-size: 1rem;
  }

  .el-popper__arrow {
    display: none;
  }

  .el-cascader-node {
    padding-left: 3px;
  }

  .el-cascader-node__prefix {
    display: none;
  }

  .el-cascader-node.is-active {
    color: #e83ff4;
  }
  .el-cascader-node.in-active-path {
    color: #e83ff4;
  }
  .el-cascader-node:not(.is-disabled):hover {
    background: rgba(0, 0, 0, 0.3)
  }

  .el-cascader-menu__wrap.el-scrollbar__wrap {
    height: 355px;
  }
} */
</style>
