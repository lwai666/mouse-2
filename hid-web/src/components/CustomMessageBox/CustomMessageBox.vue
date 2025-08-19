<script setup>
import { ref } from 'vue'
import { ElButton } from 'element-plus'
import { Select, CloseBold } from '@element-plus/icons-vue'

const props = defineProps({
  title: {
    type: String,
    default: '提示'
  },
  message: {
    type: String,
    required: true
  },
  center: {
    type: Boolean,
    default: true
  }
})

const visible = ref(false)
let resolve, reject

const show = () => {
  visible.value = true
  return new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
}

const handleClose = () => {
  visible.value = false
  reject()
}

const handleCancel = () => {
  visible.value = false
  reject()
}

const handleConfirm = () => {
  visible.value = false
  resolve()
}

defineExpose({
  show
})
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="message-box-mask">
      <div class="custom-message-container w-100" :class="{ 'text-center': props.center }">
        <div class="custom-message-container-text">{{ message }}</div>
        <div class="message-box-footer">
          <!-- size="large" -->
          <el-button type="danger" :icon="CloseBold" circle @click="handleCancel" />
          <div></div>
          <el-button type="success" :icon="Select" circle @click="handleConfirm" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.message-box-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.message-box-footer {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
