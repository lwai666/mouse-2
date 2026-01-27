<script setup lang="ts">
import { ElMessageBox, ElRadio, ElRadioGroup } from 'element-plus'
import { h, onMounted, onUnmounted, ref } from 'vue'

// 检查是否在 Electron 环境
const isElectron = !!(window.api && typeof window.api.onHIDDeviceList === 'function')

// Electron 环境：设置 HID 设备选择
onMounted(() => {
  if (isElectron) {
    const cleanup = window.api.onHIDDeviceList((deviceList) => {
      console.log('收到设备列表:', deviceList)

      if (deviceList.length === 0) {
        window.api.cancelHIDDeviceSelection()
        return
      }

      // 创建响应式变量存储选择的设备索引
      const selectedIndex = ref('0')

      // 使用 Element Plus 的消息框，包含单选列表
      ElMessageBox({
        title: '选择 HID 设备',
        message: () => h('div', { style: { marginTop: '10px' } }, [
          h(ElRadioGroup, {
            'modelValue': selectedIndex.value,
            'onUpdate:modelValue': (val: string) => { selectedIndex.value = val },
          }, () => deviceList.map((d, i) => {
            const vid = d.vendorId.toString(16).toUpperCase().padStart(4, '0')
            const pid = d.productId.toString(16).toUpperCase().padStart(4, '0')
            const name = d.name
            return h(ElRadio, {
              key: d.deviceId,
              label: i.toString(),
              value: i.toString(),
              style: { display: 'block', marginBottom: '12px' },
            }, {
              default: () => `${name} (VID:${vid} PID:${pid})`,
            })
          })),
        ]),
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            const deviceIndex = Number.parseInt(selectedIndex.value)
            if (deviceIndex >= 0 && deviceIndex < deviceList.length) {
              window.api.selectHIDDevice(deviceList[deviceIndex].deviceId)
            }
          }
          else {
            window.api.cancelHIDDeviceSelection()
          }
          done()
        },
      })
    })

    // 清理监听器
    onUnmounted(() => {
      cleanup()
    })
  }
})

// https://github.com/vueuse/head
// you can use this to manipulate the document head in any components,
// they will be rendered correctly in the html results with vite-ssg
useHead({
  title: 'Scyrox',
  meta: [
    { name: 'description', content: 'Opinionated Vite Starter Template wx shunyue1321' },
    { name: 'author', content: 'GitHub shunyue1320' },
    { name: 'author wx', content: 'shunyue1321' },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      // href: () => '/favicon.ico',
      href: () => preferredDark.value ? '/favicon-dark.ico' : '/favicon.ico',
    },
  ],
})
</script>

<template>
  <RouterView />
</template>
