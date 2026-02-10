<script setup lang="ts">
import { CircleClose, Plus } from '@element-plus/icons-vue'

import { useIntervalFn } from '@vueuse/core'

import autofit from 'autofit.js'
import { ElCarousel, ElCarouselItem, ElIcon, ElMessageBox, ElSpace } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { loadLanguageAsync } from '~/modules/i18n'

import { connectAndStoreDevice, createTransportWebHID, HIDDeviceChangeTransportWebHID, transportWebHID } from '~/utils/hidHandle'

defineOptions({
  name: 'Scyrox',
})

const version = __APP_VERSION__

const { t, locale } = useI18n()

const router = useRouter()

const userStore = useUserStore()

const transport = ref()

const instanceRef = ref()

const selectLanguageList = ref([
  { title: t('language.deDE'), img: '/flag/DE.png', language: 'de-DE' },
  { title: t('language.enUS'), img: '/flag/US.png', language: 'en-US' },
  { title: t('language.zhCN'), img: '/flag/CN.png', language: 'zh-CN' },
  { title: t('language.koKR'), img: '/flag/KR.png', language: 'ko-KR' },
  { title: t('language.jaJP'), img: '/flag/JP.png', language: 'ja-JP' },
])

const languageShow = ref(false)

const slideshowList = computed(() => [
  { title: t('index.pairingGuide'), type: 'component', component: 'MouseCarouseItem' },
  { title: t('index.schematicGuide'), type: 'img', img: `/slideshow/2.png` },

])

const carouselRef = ref(null)
const activeIndex = ref(0)

function onChangeCarousel(current: number, prev: number) {
  activeIndex.value = current
}

toggleLocales(locale.value)
async function toggleLocales(language: string) {
  await loadLanguageAsync(language)
  locale.value = language

  const list = selectLanguageList.value.filter(item => item.language !== language)
  list.splice(2, 0, selectLanguageList.value.find(item => item.language === language)!)
  selectLanguageList.value = list
  languageShow.value = false
}

const show = ref(false)
nextTick(() => {
  show.value = true
})

const transportList = ref(JSON.parse(localStorage.getItem('transportList') || JSON.stringify([])))

// console.log(11111111111111)

const latestVersion = ref({}) as any

// 设备状态轮询（每 5 分钟）
const POLLING_INTERVAL = 5 * 60 * 1000 // 5 分钟

const { resume } = useIntervalFn(
  () => {
    getDeviceStatus()
  },
  POLLING_INTERVAL,
  { immediate: false }, // 不立即执行，在 onMounted 中手动调用第一次
)

onMounted(() => {
  getLatestVersion()
  getDeviceStatus()
  resume() // 启动轮询，组件销毁时自动停止
})
// 获取面板卡片所有的状态
async function getDeviceStatus() {
  const storedTransportList: any[] = JSON.parse(localStorage.getItem('transportList') || '[]')

  if (!storedTransportList.length) {
    return
  }

  // 1. 获取所有已授权的设备
  const devices = await navigator.hid.getDevices()
  if (!devices || devices.length === 0) {
    return []
  }

  // 2. 合并所有授权的设备类型（接收器 + 鼠标）
  const authorizedDevices = [
    ...toRaw(userStore.devices),
    ...toRaw(userStore.devicesMouse),
  ]

  // 3. 过滤出实际连接的授权设备，且具有 inputReports 和 outputReports
  const connectedDevices = devices.filter((device) => {
    // 检查是否是授权设备
    const isAuthorized = authorizedDevices.some(
      auth => auth.vendorId === device.vendorId && auth.productId === device.productId,
    )

    if (!isAuthorized)
      return false

    // 检查是否有 inputReports 和 outputReports
    const hasValidCollection = device.collections?.some(
      collection => collection.inputReports?.length === 1 && collection.outputReports?.length === 1,
    )

    return hasValidCollection
  })

  if (connectedDevices.length === 0) {
    return []
  }

  // 4. 串行获取所有设备状态（一个一个发送，成功一个后再进行下一个）
  const deviceStatusList = []
  for (const device of connectedDevices) {
    console.log('device====', device)
    try {
      // 转换为 transport
      const HIDDeviceRef = await HIDDeviceChangeTransportWebHID([device], { id: 'v8' })
      transportWebHID?._s.set('v8', HIDDeviceRef)
      // 发送命令获取设备信息
      const data = await HIDDeviceRef?.send([0x2E, 0x00, 0x03])

      // 解析设备信息
      const deviceInfo = parseDeviceInfo(data)

      deviceStatusList.push({
        vendorId: device.vendorId,
        productId: device.productId,
        productName: device.productName,
        ...deviceInfo,
      })
    }
    catch (error) {
      console.error(`获取设备状态失败: ${device.vendorId}-${device.productId}`, error)
      deviceStatusList.push({
        vendorId: device.vendorId,
        productId: device.productId,
        productName: device.productName,
        error: true,
      })
    }
  }

  // await transportWebHIDdisconnect('v8')

  // console.log('deviceStatusList====', deviceStatusList)

  // 5. 更新 localStorage 中的 transportList
  let updated = false

  deviceStatusList.forEach((deviceStatus: any) => {
    // 跳过有错误或未连接的设备
    if (deviceStatus.error || !deviceStatus.isConnected)
      return

    // 查找匹配的设备
    const matchedIndex = storedTransportList.findIndex(
      (item: any) => item.productId === deviceStatus.productId && item.vendorId === deviceStatus.vendorId,
    )

    if (matchedIndex !== -1) {
      // 更新设备状态信息
      storedTransportList[matchedIndex] = {
        ...storedTransportList[matchedIndex],
        battery: deviceStatus.battery,
        isCharging: deviceStatus.isCharging,
        isConnected: deviceStatus.isConnected,
        sn: deviceStatus.sn,
        isOnline: true, // 设备当前处于连接状态
        version: deviceStatus.version,
        mouseColor: deviceStatus.mouseColor,
      }

      // 如果是接收器且已连接，添加 WiFi 连接标识
      if (deviceStatus.vendorId === 0x2FE5 && deviceStatus.productId === 0x0005) {
        storedTransportList[matchedIndex].isWifiConnected = true
      }

      updated = true
    }
  })

  // 如果有更新，保存到 localStorage 和 ref
  if (updated) {
    localStorage.setItem('transportList', JSON.stringify(storedTransportList))
    transportList.value = storedTransportList
    console.log('transportList 已更新====', storedTransportList)
  }

  return deviceStatusList
}
// 点击设备卡片进入设置页面
async function onNouseClick(item: any) {
  console.log('点击的设备项====', item)
  // 连接设备并存储实例, 每次连接的都是都会把上一次的实例断开并替换掉，所以 transportWebHID 中同一 id 只有一个实例
  const HIDDeviceRef = await connectAndStoreDevice(
    item.vendorId,
    item.productId,
    'v8',
    {
      showMessage,
      noDeviceMessage: t('description.please_insert_device'),
      deviceNotFoundMessage: t('description.please_insert_this_device'),
    },
  )

  // 使用找到的实例
  transport.value = HIDDeviceRef
  instanceRef.value = HIDDeviceRef

  // 存储当前设备的 productId 和 vendorId 到 localStorage
  localStorage.setItem('currentDevice', JSON.stringify({
    productId: item.productId,
    vendorId: item.vendorId,
  }))

  router.push(`/hid/v8`)
}

// 解析设备信息
interface DeviceInfo {
  sn: string
  battery: number // 电量 0-100
  isCharging: boolean // 充电状态
  isConnected: boolean // 鼠标连接状态
  version: number // 固件版本号
  mouseColor: number // 颜色
}
// 解析设备信息的函数
function parseDeviceInfo(data: Uint8Array): DeviceInfo {
  if (!data.length) {
    return {
      sn: '',
      battery: 0,
      isCharging: false,
      isConnected: false,
      version: 0,
      mouseColor: 0,
    }
  }
  const battery = data[3] // byte 3: 电量 0-100
  const isCharging = data[4] === 1 // byte 4: 充电状态 1:充电 0:不充电
  const isConnected = data[5] === 1 // byte 5: 鼠标连接状态 1:连接 0:断开
  const versionLow = data[6] // byte 6: 版本号低8位
  const versionHigh = data[7] // byte 7: 版本号高8位
  const mouseColor = data[8] // byte 8: 颜色

  // 版本号 = (高8位 << 8) | 低8位
  const version = (versionHigh << 8) | versionLow

  // byte 9 开始是 SN，固定取 13 个字节
  const snBytes = data.slice(9, 9 + 13)
  const sn = String.fromCharCode(...snBytes)

  return {
    sn,
    battery,
    isCharging,
    isConnected,
    version,
    mouseColor,
  }
}
// 添加新设备
async function onAddNouseClick() {
  transport.value = await createTransportWebHID({
    id: 'v8',
    filters: [
      ...toRaw(userStore.devices),
      ...toRaw(userStore.devicesMouse),
      // // 其他设备
      // { vendorId: 0x1532, productId: 0x00BF },
      // { vendorId: 0x3554, productId: 0xF5F7 },
      // { vendorId: 0x3554, productId: 0xF5F4 },
    ],
    commandHandler: async (data) => {
      // console.log('接收的数据=======', data)
    },
  })

  if (!transport.value)
    return

  const data = await transport.value.send([0x2E, 0x00, 0x03])

  const device = parseDeviceInfo(data || [])

  const { productId, vendorId } = transport.value.device

  // 接收器设备需要检查鼠标连接状态
  const isReceiver = vendorId === 0x2FE5 && productId === 0x0005

  if (isReceiver && !device.isConnected) {
    return
  }

  // 添加前先检查设备是否已存在，避免重复添加- 获取配对码

  const pairingCodeData = await transport.value.send([isReceiver ? 0x2F : 0x2D])

  let pairingCode = null

  // 解析配对码（从索引3开始的4个字节，每个字节的前4位是配对码）
  if (pairingCodeData && pairingCodeData.length >= 7) {
    const byte0 = pairingCodeData[3] // 配对码低8位，高4位 (bit 4-7)
    const byte1 = pairingCodeData[4] // 配对码8-15位，高4位 (bit 12-15)
    const byte2 = pairingCodeData[5] // 配对码16-23位，高4位 (bit 20-23)
    const byte3 = pairingCodeData[6] // 配对码24-31位，高4位 (bit 28-31)

    // 提取每个字节的高4位（前面4位）
    const code0 = (byte0 >> 4) & 0x0F // bit 4-7
    const code1 = (byte1 >> 4) & 0x0F // bit 12-15
    const code2 = (byte2 >> 4) & 0x0F // bit 20-23
    const code3 = (byte3 >> 4) & 0x0F // bit 28-31

    // 组合成16位配对码
    pairingCode = (code3 << 12) | (code2 << 8) | (code1 << 4) | code0

    console.log('配对码解析结果====', {
      pairingCode,
    })
  }

  const transportListCopy = JSON.parse(localStorage.getItem('transportList') || '[]')

  // 检查配对码是否已存在，或者 vendorId 和 productId 一致，如果存在则不添加新设备，直接进入设置页面
  const exists = transportListCopy.some(
    (item: any) => item.pairingCode === pairingCode || (item.productId === productId && item.vendorId === vendorId),
  )

  if (exists) {
    // router.push('/hid/v8')
    localStorage.setItem('tabActive', 'performance')
    return
  }

  transportList.value.push({
    ...transport.value,
    productId,
    vendorId,
    productName: transport.value.device.productName,
    collections: transport.value.device.collections,
    battery: device.battery,
    isCharging: device.isCharging,
    isConnected: device.isConnected,
    version: device.version,
    mouseColor: device.mouseColor,
    sn: device.sn,
    isOnline: true, // 设备已连接
    pairingCode,
    isWifiConnected: isReceiver && device.isConnected, // 如果是接收器且已连接，标记为 WiFi 已连接
  })

  localStorage.setItem('transportList', JSON.stringify(transportList.value))
  localStorage.setItem('tabActive', 'performance')
  // router.push('/hid/v8')
}

// 删除设备
function deleteTransport(item) {
  const transportListCopy = localStorage.getItem('transportList') ? JSON.parse(localStorage.getItem('transportList')) : []
  transportList.value = transportListCopy.filter((k) => {
    return k.reportId !== item.reportId
  })
  localStorage.setItem('transportList', JSON.stringify(transportList.value))
}

const clickCount = ref(0)
let clickTimer: number | null = null

// 点击标题10次进入更新页面
function handleTitleClick() {
  clickCount.value++

  // 重置计时器
  if (clickTimer) {
    clearTimeout(clickTimer)
  }

  // 3秒内没有新的点击就重置计数
  clickTimer = window.setTimeout(() => {
    clickCount.value = 0
  }, 3000)

  if (clickCount.value >= 10) {
    clickCount.value = 0
    if (clickTimer) {
      clearTimeout(clickTimer)
    }
    router.push('/upload-update-package')
  }
}

function goPath() {
  router.push('/hid/settings')
}

let updateRef = null

function toUpdate(item) {
  updateRef = item
  visible.value = true
}

function cancleUpdate() {
  if (!updateRef) {
    return
  }
  // 标记为已读
  markUpdateAsRead(updateRef)
  onNouseClick(updateRef)
}

function sureUpdate() {
  if (!updateRef) {
    return
  }
  // 标记为已读
  markUpdateAsRead(updateRef)
  // 存储当前设备的 productId 和 vendorId 到 localStorage
  localStorage.setItem('currentDevice', JSON.stringify({
    productId: updateRef.productId,
    vendorId: updateRef.vendorId,
  }))
  goPath()
}

// 标记更新为已读
function markUpdateAsRead(item) {
  const readUpdates = JSON.parse(localStorage.getItem('readUpdates') || '[]')
  const deviceKey = `${item.vendorId}_${item.productId}`

  // 检查是否已存在，如果存在则更新版本，否则添加新记录
  const existingIndex = readUpdates.findIndex((r: any) => r.deviceKey === deviceKey)

  const record = {
    deviceKey,
    vendorId: item.vendorId,
    productId: item.productId,
    readMouseVersion: latestVersion.value.mouseVersion, // 存储服务器最新版本
  }

  if (existingIndex >= 0) {
    readUpdates[existingIndex] = record
  }
  else {
    readUpdates.push(record)
  }

  localStorage.setItem('readUpdates', JSON.stringify(readUpdates))
}

// 检查是否应该显示重大更新
function shouldShowMajorUpdate(item): boolean {
  const readUpdates = JSON.parse(localStorage.getItem('readUpdates') || '[]')
  const deviceKey = `${item.vendorId}_${item.productId}`
  const readRecord = readUpdates.find((r: any) => r.deviceKey === deviceKey)

  // 没有已读记录，显示
  if (!readRecord) {
    return true
  }

  // 已读版本 < 当前服务器最新版本，说明有新版本，显示
  return readRecord.readMouseVersion < latestVersion.value.mouseVersion
}

const notSupportHid = ref(false)

onMounted(() => {
  if (!navigator.hid) {
    notSupportHid.value = true
  }
  autofit.init({
    dh: 1080,
    dw: 1920,
    el: '#app',
    resize: true,
    allowScroll: true,
  })

  // 初始化滚动按钮状态，确保 DOM 完全渲染
  nextTick(() => {
    setTimeout(() => {
      updateScrollButtons()
    }, 100)
  })
})

const colorItems = [
  { id: 3, color: 'black', backgroundColor: '#8B8B8B' },
  { id: 4, color: 'white', backgroundColor: '#fff' },
]
// 根据鼠标颜色排序，确保当前激活项在第一个

function sortedColorItems(mouseColor: any) {
  const filteredItems = colorItems

  // 如果当前激活项在过滤后的列表中，把它移到第一个
  const activeItemIndex = filteredItems.findIndex(item => item.id === mouseColor)
  if (activeItemIndex > -1) {
    const activeItem = filteredItems[activeItemIndex]
    filteredItems.splice(activeItemIndex, 1)
    filteredItems.unshift(activeItem)
  }

  return filteredItems
}
// 监听设备断开
function onDisconnect(event: any) {
  const { productId, vendorId } = event.device

  // 查找匹配的设备
  const matchedIndex = transportList.value.findIndex(
    (item: any) => item.productId === productId && item.vendorId === vendorId,
  )

  if (matchedIndex !== -1) {
    // 更新设备在线状态
    transportList.value[matchedIndex].isOnline = false

    // 保存到 localStorage
    localStorage.setItem('transportList', JSON.stringify(transportList.value))

    console.log(`设备已断开: vendorId=${vendorId}, productId=${productId}`)
  }
}

navigator.hid.addEventListener('disconnect', onDisconnect)

// 监听设备连接
navigator.hid.addEventListener('connect', async (event: any) => {
  const { productId, vendorId } = event.device

  console.log('event.device====', event.device)

  console.log(`设备已连接: vendorId=${vendorId}, productId=${productId}`)

  // 查找匹配的设备
  const matchedIndex = transportList.value.findIndex(
    (item: any) => item.productId === productId && item.vendorId === vendorId,
  )

  if (matchedIndex === -1) {
    console.log('设备不在 transportList 中，跳过')
    return
  }

  try {
    // 转换为 transport
    const HIDDeviceRef = await HIDDeviceChangeTransportWebHID([event.device], { id: 'v8' })
    transportWebHID?._s.set('v8', HIDDeviceRef)

    console.log('HIDDeviceRef====', HIDDeviceRef)

    // 发送命令获取设备信息
    const data = await HIDDeviceRef?.send([0x2E, 0x00, 0x03])

    console.log('连接后获取的设备信息数据:', data)

    // 解析设备信息
    const deviceInfo = parseDeviceInfo(data)

    // 更新 transportList
    transportList.value[matchedIndex] = {
      ...transportList.value[matchedIndex],
      battery: deviceInfo.battery,
      isCharging: deviceInfo.isCharging,
      isConnected: deviceInfo.isConnected,
      sn: deviceInfo.sn,
      isOnline: true, // 设备已连接
      version: deviceInfo.version,
      mouseColor: deviceInfo.color,
    }

    // 如果是接收器且已连接，添加 WiFi 连接标识
    if (vendorId === 0x2FE5 && productId === 0x0005 && deviceInfo.isConnected) {
      transportList.value[matchedIndex].isWifiConnected = true
    }
    // 保存到 localStorage
    localStorage.setItem('transportList', JSON.stringify(transportList.value))
  }
  catch (error) {
    console.error('获取设备信息失败:', error)
    // 即使出错，也标记为在线状态
    transportList.value[matchedIndex].isOnline = true
    localStorage.setItem('transportList', JSON.stringify(transportList.value))
  }
})

async function setColor(mode: any, profileInfo: any) {
  if (profileInfo.mouseColor === mode.id) {
    return
  }

  const HIDDeviceRef = await connectAndStoreDevice(
    profileInfo.vendorId,
    profileInfo.productId,
    'v8',
    {
      showMessage,
      noDeviceMessage: t('description.please_insert_device'),
      deviceNotFoundMessage: t('description.please_insert_this_device'),
    },
  )

  await HIDDeviceRef.send([0x29, 0x00, 0x00, mode.id])

  profileInfo.mouseColor = mode.id

  transportList.value = transportList.value.map((item: any) => {
    if (item.reportId === profileInfo.reportId) {
      item.mouseColor = mode.id
    }
    return item
  })
  localStorage.setItem('transportList', JSON.stringify(transportList.value))
}

// 滚动容器相关
const transportScrollContainer = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function scrollTransportList(direction: 'left' | 'right') {
  if (!transportScrollContainer.value)
    return

  const scrollAmount = 241 // 231px + 10px margin
  if (direction === 'left') {
    transportScrollContainer.value.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
  }
  else {
    transportScrollContainer.value.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }
}

function updateScrollButtons() {
  if (!transportScrollContainer.value) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  const { scrollLeft, scrollWidth, clientWidth } = transportScrollContainer.value

  // 左按钮：已经滚动了一段距离时显示
  canScrollLeft.value = scrollLeft > 1

  // 右按钮：内容超出容器宽度，且还没滚动到最右边时显示
  canScrollRight.value = scrollWidth > clientWidth && Math.ceil(scrollLeft) < scrollWidth - clientWidth
}

// 获取最新版本信息
async function getLatestVersion() {
  await userStore.fetchLatestVersion()

  latestVersion.value = userStore.latestVersion
}

// 监听 transportList 变化，更新按钮状态
watch(() => transportList.value, () => {
  nextTick(() => {
    setTimeout(() => {
      updateScrollButtons()
    }, 100)
  })
}, { deep: true })

const description = computed(() => {
  return userStore?.latestVersion?.description?.replace(/\n/g, '<br>')
})

let visible = ref(false)
</script>

<template>
  <div class="contain-content flex flex-col items-center justify-center">
    <a class="absolute left-30px top-30px" href="" target="_blank">
      <img class="h-45px" src="/logo.png" alt="logo">
    </a>
    <!-- <div fixed top-6 right-6>
      <nav flex="~ gap-4" justify-end text-xl>
        <button icon-btn :title="t('button.toggle_dark')" @click="toggleDark()">
          <div i="carbon-sun dark:carbon-moon" />
        </button>
        <button icon-btn :title="t('button.toggle_langs')" @click="toggleLocales()">
          <div i-carbon-language />
        </button>
      </nav>
    </div> -->

    <div class="flex flex-col items-center justify-between pt-5">
      <div mb-5 text-2xl @click="handleTitleClick">
        {{ t('index.title') }}
      </div>
      <div v-if="notSupportHid" class="mb-2 rounded-2xl bg-white px-5 py-3 text-xl text-red">
        {{ t('index.not_support_hid_warning') }}
      </div>

      <div mb-2 text-2xl>
        {{ t('index.selectLanguage') }}
      </div>

      <div class="mb-5 min-w-[380px] w-50vw flex items-center justify-between" @mouseleave="languageShow = false">
        <div v-for="item in selectLanguageList" :key="item.title">
          <div :class="locale === item.language ? 'opacity-100' : (languageShow ? 'opacity-45 hover:opacity-100' : 'opacity-0 pointer-events-none')" class="flex flex-col cursor-pointer items-center transition-all duration-500" @click="toggleLocales(item.language)" @mouseenter="(locale === item.language || languageShow) ? languageShow = true : () => {}">
            <img :src="item.img" :alt="item.title" class="h-40px rounded">
            <div>{{ item.title }}</div>
          </div>
        </div>
      </div>

      <!-- <div class="mb-5 h-50 min-w-[300px] w-36vw flex flex-col cursor-pointer items-center justify-center border-2 border-gray-600 rounded-2xl bg-#2d2d2d" @click="onNouseClick">
        <div class="mb-5">
          {{ t('index.rightClick') }}
        </div>
        <img class="h-60px" src="/logo.png" alt="logo">
      </div> -->

      <div class="relative mb-5 h-[251px] w-[800px]">
        <!-- 左按钮 -->
        <button
          v-if="canScrollLeft"
          class="absolute left-0 top-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white transition-all -translate-y-1/2 hover:bg-black/70"
          @click="scrollTransportList('left')"
        >
          <span class="arrow-icon arrow-left-icon" />
        </button>

        <!-- 滚动容器 -->
        <div
          ref="transportScrollContainer"
          class="hide-scrollbar flex overflow-x-auto overflow-y-hidden"
          style="scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none;"
          @scroll="updateScrollButtons"
        >
          <div
            v-for="item in transportList"
            :key="item.reportId"
            class="relative mb-5 flex flex-shrink-0 items-center"
            style="width: 231px;
            height: 248px;
            border-radius: 10px;
            background-color: rgba(255, 255, 255, 0.1);
            margin-right: 10px;
            border: 1px solid rgba(255, 255, 255, 0.4);
            flex-direction: column;
            padding-top: 15px;"
            @click="onNouseClick(item)"
          >
            <p style="color: #fff; font-weight: bold;font-size: 18px;">
              {{ item.productName }}
            </p>

            <div v-if="!item.isOnline" style="border-radius: 10px;width: 100%;height: 100%; background-color: rgba(0,0,0,0.3); position: absolute; top: 0; left: 0;z-index: 100;" @click.stop />
            <!-- v-if="item.isOnline && latestVersion.forceUpdate && item.version < latestVersion.mouseVersion" -->
            <div v-if="item.isOnline && latestVersion.forceUpdate && item.version < latestVersion.mouseVersion && shouldShowMajorUpdate(item)" style="border-radius: 10px;width: 100%;height: 100%; background-color: rgba(255,255,255,0.5); position: absolute; top: 0; left: 0;z-index: 100; display: flex; align-items: center;justify-content: center;" @click.stop>
              <div style="color: black; width: 190px; height: 45px; text-align: center; line-height: 45px;background: #DAFF00; border-radius: 100px; font-size: 17px;" @click="toUpdate(item)">
                {{ t('index.majorUpdate') }}
              </div>
            </div>

            <img
              style="width: 84px; height:142px;object-fit: contain;margin-top: 10px;"
              :src="`/mouse_${{
                3: 'black',
                4: 'white',
              }[item.mouseColor] || 'black'}.png`"
              alt=""
              srcset=""
            >

            <div class="mt-5 flex">
              <img v-show="item.isCharging" src="/v9/icon3.png" alt="" srcset="" class="mr-2">
              <div v-show="!item.isCharging" style="position: relative;">
                <img src="/v9/icon4.png" alt="" srcset="" class="mr-2">
                <span style="font-size: 10px; position: absolute;top: 50%; left: 18%; transform: translate(0%,-50%);">{{ item.battery }}</span>
              </div>
              <img v-show="!item.isWifiConnected" src="/v9/icon5.png" alt="" srcset="" class="mr-2">
              <img v-show="item.isWifiConnected" src="/v9/icon6.png" alt="" srcset="" class="mr-2">
            </div>

            <div class="color-box absolute right-3 top-4">
              <div v-for="key in sortedColorItems(item.mouseColor)" :key="key.id" class="mb-2" :style="{ background: key.backgroundColor }" style="width: 18px;height: 18px; border-radius: 50%;" @click.stop="setColor(key, item)" />
            </div>

            <ElIcon size="20" color="#ffff" class="absolute left-2 top-3" style="z-index: 101;" @click.stop="deleteTransport(item)">
              <CircleClose />
            </ElIcon>
          </div>

          <div
            class="relative mb-5 flex flex-shrink-0 items-center justify-center"
            style="width: 231px;height: 248px;border-radius: 10px;background-color: rgba(255, 255, 255, 0.1); margin-right: 10px;border: 1px solid rgba(255, 255, 255, 0.4);"
            @click="onAddNouseClick"
          >
            <p class="absolute top-5" style="font-weight: bold;font-size: 20px;">
              {{ t('title.new_device') }}
            </p>
            <ElIcon size="60" color="#ffff">
              <Plus />
            </ElIcon>
          </div>
        </div>

        <!-- 右按钮 -->
        <button
          v-if="canScrollRight"
          class="absolute right-0 top-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white transition-all -translate-y-1/2 hover:bg-black/70"
          @click="scrollTransportList('right')"
        >
          <span class="arrow-icon arrow-right-icon" />
        </button>
      </div>

      <div class="mb-10">
        <div class="relative h-20 w-100%">
          <div v-for="(item, index) in slideshowList" class="absolute top-0 w-100% cursor-pointer transition-all duration-500" :class="activeIndex === index ? 'top-8 text-2xl textShadow color-#e1fe52' : ''" @click="carouselRef?.setActiveItem(index)">
            {{ item.title }}
          </div>
        </div>

        <!-- type="card" -->
        <ElCarousel
          ref="carouselRef"
          class="min-w-[400px] w-1500px"
          height="400px"
          direction="vertical"
          :interval="2400"
          :autoplay="true"
          indicator-position="none"
          @change="onChangeCarousel"
        >
          <ElCarouselItem v-for="item in slideshowList" :key="item.title" class="flex items-center justify-center">
            <div class="h-100% w-1500px" style="position: relative;">
              <div v-if="item.type == 'img'" class="flex justify-center">
                <div class="relative" style="display: flex;justify-content: center;min-width: 639px;min-height: 385px;">
                  <img :src="item.img" alt="item.title"></img>
                  <div class="absolute top-85% w-100% flex justify-between" style="font-size: 12px;">
                    <div class="w-300px">
                      {{ t('description.click_to_add_device') }}
                    </div>
                    <div class="w-300px">
                      {{ t('description.click_to_select_device') }}
                    </div>
                    <div class="w-300px">
                      {{ t('description.click_to_connect_device') }}
                    </div>
                  </div>
                </div>
              </div>
              <MouseCarouseItem v-else />
            </div>
          </ElCarouselItem>
        </ElCarousel>
      </div>

      <!-- <div text-xl mx-60 mb-10>{{ t('index.description') }}</div> -->
      <!-- <div class="w-full h-[350px]">
        <transition name="slide-fade">
          <img v-if="show" class="icon-btn h-full" src="/mouse-card.png" alt="mouse-card" @click="onNouseClick">
        </transition>
      </div> -->
      <div class="fixed bottom-1">
        v{{ version }}
      </div>
    </div>
    <div v-if="visible" class="zhezhao">
      <div class="zhezhao_con">
        <p class="zhezhao_tit">
          {{ t('index.firmwareUpdateNotification') }}
        </p>
        <div class="mb-20 mt-5 flex items-center justify-center text-start">
          <span class="leading-7" v-html="description" />
        </div>
        <div class="btn-box">
          <ElSpace :size="50">
            <div class="btn_item btn_item_cancle" @click="cancleUpdate">
              {{ t('index.cancelUpdate') }}
            </div>
            <div class="btn_item btn_item_sure" @click="sureUpdate">
              {{ t('index.confirmUpdate') }}
            </div>
          </ElSpace>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contain-content {
  height: 1080px;
  background-image: url('/v9/bg-s.webp');
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  transform-origin: 0 0;
  width: 100%;
}
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-50px);
  opacity: 0;
}

.color-box {
  transition: all 0.5s ease; /* 平滑过渡效果 */
  border: 1px solid transparent; /* 初始无边框 */
  cursor: pointer; /* 鼠标悬停样式 */
  height: 25px;
  overflow: hidden;
}

.color-box:hover {
  height: 64px;
}

/* 隐藏滚动条 */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* CSS 箭头 */
.arrow-icon {
  display: inline-block;
  width: 10px;
  height: 10px;
  position: relative;
}

.arrow-left-icon {
  border-left: 2.5px solid white;
  border-bottom: 2.5px solid white;
  transform: rotate(45deg);
}

.arrow-right-icon {
  border-right: 2.5px solid white;
  border-bottom: 2.5px solid white;
  transform: rotate(-45deg);
}

.textShadow {
  text-shadow:
    0 0 1px #e1fe52,
    /* 红色发光 */ 0 0 0px #e1fe52,
    /* 更亮的红色发光 */ 0 0 15px #e1fe52,
    /* 最亮的红色发光 */ 0 0 5px #e1fe52; /* 最外围的红色发光 */
}

.zhezhao {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.08);
  z-index: 100;
}

.zhezhao_con {
  margin: auto;
  width: 740px;
  height: 400px;
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(15px) !important;
  -webkit-backdrop-filter: blur(15px) !important;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -44%);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding-top: 40px;
}
.btn-box {
  position: absolute;
  bottom: 30px;
  display: flex;
  justify-content: center;
  width: 100%;
}
.btn_item_cancle {
  background: #333333;
  color: #fff;
}
.btn_item_sure {
  background: #daff00;
  color: #333333;
}
.btn_item {
  padding: 11px 56px;
  border: 1px solid #daff00;
  border-radius: 50px;
  font-size: 16px;
}
.zhezhao_tit {
  font-size: 27px;
}
</style>
