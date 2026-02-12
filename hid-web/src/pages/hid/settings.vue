<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'
import autofit from 'autofit.js'
import { ElBadge, ElButton, ElInput, ElMessageBox, ElProgress } from 'element-plus'
import { useApiConfig } from '~/composables/useApiConfig'
import { combineLowAndHigh8Bits, sleep } from '~/utils'
import { connectAndStoreDevice, createTransportWebHID, transportWebHID, type TransportWebHIDInstance, useTransportWebHID } from '~/utils/hidHandle'

// import { stringSplit } from '~/utils';

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const { isElectron } = useApiConfig()

const transport = ref()
const adapterTransport = ref()

const inputDataList = ref<string[]>([])
const bin_Uint8Array = ref<Uint8Array>()

const updateList = reactive({
  spi: {
    title: t('settings.spiVersion'),
    version: '**',
    latestVersion: '1.0.0',
    status: 'updateNow', // updateNow updating updateCompleted updateFailed
    img: '/update-receiver.png',
    hint1: t('settings.hint11'),
    hint2: t('settings.hint12'),
    errorHint: t('settings.errorHint11'),
    progress: 0,
    disabled: true,
    disabled1: false,

  },
  usb: {
    title: t('settings.usbVersion'),
    version: '**',
    latestVersion: '8.0.2',
    status: 'updateNow', // updateNow updating updateCompleted updateFailed
    img: '/update-mouse.png',
    hint1: t('settings.hint21'),
    hint2: t('settings.hint22'),
    errorHint: t('settings.errorHint21'),
    progress: 0,
    disabled: true,
    disabled1: false,

  },
})

const currentUpdateKey = ref<'spi' | 'usb'>('spi')
const currentUpdate = computed(() => updateList[currentUpdateKey.value])
const description = computed(() => {
  return userStore?.latestVersion?.description?.replace(/\n/g, '<br>')
})

/**
 * 初始化 transport 实例
 */
async function initTransport(instance: TransportWebHIDInstance) {
  transport.value = instance
  if (!transport.value) {
    router.push('/')
    return
  }

  await getVersion(transport.value)
}

/**
 * 处理页面刷新后的设备重连
 */
async function handlePageRefresh() {
  const currentDeviceStr = localStorage.getItem('currentDevice')

  if (!currentDeviceStr) {
    router.push('/')
    return
  }

  const currentDevice = JSON.parse(currentDeviceStr)
  const { vendorId, productId } = currentDevice

  console.log(`[settings.vue] 检测到页面刷新，重新连接设备: vendorId=0x${vendorId.toString(16)}, productId=0x${productId.toString(16)}`)

  const reconnectedDevice = await connectAndStoreDevice(
    vendorId,
    productId,
    'v8',
    {
      showMessage: msg => console.error('[settings.vue]', msg),
      noDeviceMessage: t('settings.noDeviceMessage'),
      deviceNotFoundMessage: t('settings.deviceNotFoundMessage'),
    },
  )

  if (reconnectedDevice) {
    await initTransport(reconnectedDevice)
  }
  else {
    console.error('[settings.vue] 重新连接设备失败')
    router.push('/')
  }
}

// 判断是否有缓存的 transport 实例
const cachedTransport = transportWebHID?._s.get('v8')

if (cachedTransport) {
  // ✅ 有缓存：正常跳转
  console.log('[settings.vue] 检测到缓存的 transport 实例，正常加载')
  useTransportWebHID('v8', async (instance) => {
    await initTransport(instance)
  })
}
else {
  // ❌ 无缓存：页面刷新
  console.log('[settings.vue] 未检测到缓存的 transport 实例，尝试重新连接')
  handlePageRefresh()
}

// 注册和清理事件监听器
onMounted(() => {
  navigator.hid.addEventListener('connect', onConnect)
  navigator.hid.addEventListener('disconnect', onDisconnect)
})

onUnmounted(() => {
  navigator.hid.removeEventListener('connect', onConnect)
  navigator.hid.removeEventListener('disconnect', onDisconnect)
})

async function onConnect(event: any) {
  const { productId, vendorId } = event.device

  if (vendorId === 0x2FE3 && productId === 0x0007) {
    updateList.usb.disabled1 = true
  }
  else if (vendorId === 0x2FE5 && productId === 0x0005) {
    updateList.spi.disabled1 = true
  }
}

async function onDisconnect(event: any) {
  console.log('设备断开连接:', event.device)
  const { productId, vendorId } = event.device
  if (vendorId === 0x2FE3 && productId === 0x0007) {
    updateList.usb.disabled1 = false
    router.push('/')
  }
  else if (vendorId === 0x2FE5 && productId === 0x0005) {
    updateList.spi.disabled1 = false
    // 接收器断开，清除 adapterTransport
    if (adapterTransport.value?.device?.productId === productId && adapterTransport.value?.device?.vendorId === vendorId) {
      adapterTransport.value = null
    }
  }
}

// 获取版本号
async function getVersion(transportInstance?: any) {
  const currentTransport = transportInstance || transport.value
  if (!currentTransport) {
    console.error('设备未连接')
    return
  }

  const { productId, vendorId } = currentTransport.device

  if (vendorId === 0x2FE3 && productId === 0x0007) {
    updateList.usb.disabled1 = true
  }
  else if (vendorId === 0x2FE5 && productId === 0x0005) {
    updateList.spi.disabled1 = true
  }

  const authorizedDevices = [
    ...toRaw(userStore.devices),
    ...toRaw(userStore.devicesMouse),
  ]

  const currentDevice = authorizedDevices.find(item => item.vendorId === vendorId && item.productId === productId)

  if (!currentDevice) {
    return
  }

  const res = await currentTransport.send([currentDevice.sendData])

  // 获取另外一个芯片 USB PHY 的版本号
  const PhyRes = await currentTransport.send([0x21])

  const version = combineLowAndHigh8Bits(res[3], res[4])

  switch (currentDevice?.name) {
    case '接收器':
      updateList.spi.version = `${String(version)}.${combineLowAndHigh8Bits(PhyRes[3], PhyRes[4])}`
      currentUpdateKey.value = 'spi'
      break
    case '鼠标':
      updateList.usb.version = `${String(version)}.${combineLowAndHigh8Bits(PhyRes[3], PhyRes[4])}`
      currentUpdateKey.value = 'usb'
      break
  }
}

const isMSDevice = ref(false)
const fileInput = ref()

function toSelectFileHandle(name: string, type: string) {
  // 如果有固件正在更新中，不允许选择新文件
  if (updateList.spi.status === 'updating' || updateList.usb.status === 'updating') {
    return
  }

  const index = {
    usb: 1,
    spi: 0,
  }[type]

  fileInput.value[index].click()
  isMSDevice.value = name.includes('鼠标')
}

const selectFile = ref(null)
// 鼠标对象
const uint8ArrayObj = reactive({
  headerBytes: new Uint8Array(16), // 固件头字节数组 (0-15)
  projectBytes: new Uint8Array(16), // 项目名字节数组 (16-31)
  spiInfoBytes: new Uint8Array(16), // SPI 固件信息字节数组 (32-47)
  usbInfoBytes: new Uint8Array(16), // USB 固件信息字节数组 (48-63)
  header: '', // 固件头信息
  projectName: '', // 项目名信息
  SPI: {
    address: 0,
    size: 0,
    checksum: 0,
    version: 0,
    firmware: null,
  }, // spi 固件信息
  USB: {
    address: 0,
    size: 0,
    checksum: 0,
    version: 0,
    firmware: null,
  }, // usb 固件信息
})

// 解析固件数据
function parseFirmwareData(uint8Array: Uint8Array): boolean {
  bin_Uint8Array.value = uint8Array
  // 解析字节 0-15 的 ASCII 编码 (头部)
  const headerBytes = uint8Array.slice(0, 16)
  const header = String.fromCharCode(...headerBytes.filter(b => b !== 0xFF && b !== 0x00))

  // 解析字节 16-31 的 ASCII 编码 (项目名)
  const projectBytes = uint8Array.slice(16, 32)
  const projectName = String.fromCharCode(...projectBytes.filter(b => b !== 0xFF && b !== 0x00))

  if (isMSDevice.value && header !== 'MS-USB-UPGRADE') {
    showMessage(t('settings.headerMismatchError'))
    return false
  }

  if (!isMSDevice.value && header !== 'DO-USB-UPGRADE') {
    showMessage(t('settings.headerMismatchError'))

    return false
  }

  if (isMSDevice.value && projectName !== 'SCYROX_V10') {
    showMessage(t('settings.projectNameMismatchError'))

    return false
  }

  // 解析 SPI 固件信息（32-47字节）
  const spiInfoBytes = uint8Array.slice(32, 48)
  const spiAddress = bytesToUint32(uint8Array.slice(32, 36))
  const spiSize = bytesToUint32(uint8Array.slice(36, 40))
  const spiChecksum = bytesToUint32(uint8Array.slice(40, 44))
  const spiVersion = bytesToUint32(uint8Array.slice(44, 48))

  // 解析 USB 固件信息（48-63字节）
  const usbInfoBytes = uint8Array.slice(48, 64)
  const usbAddress = bytesToUint32(uint8Array.slice(48, 52))
  const usbSize = bytesToUint32(uint8Array.slice(52, 56))
  const usbChecksum = bytesToUint32(uint8Array.slice(56, 60))
  const usbVersion = bytesToUint32(uint8Array.slice(60, 64))

  // 根据地址和大小截取固件数据
  let spiFirmware: Uint8Array | null = null
  let usbFirmware: Uint8Array | null = null
  let spiCalculatedChecksum = 0
  let usbCalculatedChecksum = 0

  if (spiSize > 0) {
    const spiEnd = spiAddress + spiSize
    spiFirmware = uint8Array.slice(spiAddress, spiEnd)
    // 计算 SPI 固件的 checksum（所有字节累加）
    spiCalculatedChecksum = spiFirmware.reduce((acc, val) => acc + val, 0)
  }

  if (usbSize > 0) {
    const usbEnd = usbAddress + usbSize
    usbFirmware = uint8Array.slice(usbAddress, usbEnd)
    // 计算 USB 固件的 checksum（所有字节累加）
    usbCalculatedChecksum = usbFirmware.reduce((acc, val) => acc + val, 0)
  }

  // 校验 SPI checksum
  if (spiSize > 0 && spiChecksum !== spiCalculatedChecksum) {
    console.log(`固件校验失败: 固件包中=${spiChecksum}, 计算值=${spiCalculatedChecksum}`)
    // showMessage(t('settings.spiChecksumMismatchError', { checksum: spiChecksum, calculated: spiCalculatedChecksum }))

    return false
  }

  // 校验 USB checksum
  if (usbSize > 0 && usbChecksum !== usbCalculatedChecksum) {
    console.log(`固件校验失败: 固件包中=${usbChecksum}, 计算值=${usbCalculatedChecksum}`)
    // showMessage(t('settings.usbChecksumMismatchError', { checksum: usbChecksum, calculated: usbCalculatedChecksum }))

    return false
  }

  Object.assign(uint8ArrayObj, {
    headerBytes,
    projectBytes,
    spiInfoBytes,
    usbInfoBytes,
    header,
    projectName,
    SPI: {
      address: spiAddress,
      size: spiSize,
      checksum: spiCalculatedChecksum,
      version: spiVersion,
      firmware: spiFirmware,
    },
    USB: {
      address: usbAddress,
      size: usbSize,
      checksum: usbCalculatedChecksum,
      version: usbVersion,
      firmware: usbFirmware,
    },
  })

  console.log('解析后的固件对象:', uint8ArrayObj)
  return true
}

function selectFileHandle(event: any) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = function (e: any) {
      const arrayBuffer = e.target.result
      const uint8Array = new Uint8Array(arrayBuffer)
      const success = parseFirmwareData(uint8Array)
      if (success) {
        selectFile.value = file
      }
      else {
        selectFile.value = null
      }
    }
    // 读取文件内容返回 ArrayBuffer
    reader.readAsArrayBuffer(file)
  }
}

// 获取当前对应的 transport
function getTransport() {
  return currentUpdateKey.value === 'spi' ? adapterTransport.value : transport.value
}

async function sendSpiBoot(data: any) {
  await getTransport().send([0x85, 0, 0, 0, ...data])
}

async function sendUsbBoot(data: any) {
  await getTransport().send([0x86, 0, 0, ...data])
}

// 字节数组转32位整数（大端序）
function bytesToUint32(bytes: Uint8Array): number {
  return bytes[3] | (bytes[2] << 8) | (bytes[1] << 16) | (bytes[0] << 24)
}

async function sendFirmwareSize(firmware: Uint8Array) {
  const byte = firmware?.byteLength || 0
  const fw_size = [byte & 0xFF, byte >> 8 & 0xFF, byte >> 16 & 0xFF, byte >> 24 & 0xFF]
  await getTransport().send([0x87, 0x00, 0x00, 0x04, ...fw_size], 20000) // 这里响应慢，给 20 秒超时时间
}

function setProgress(progress: number) {
  currentUpdate.value.progress = Number(progress.toFixed(2))
}

async function sendFirmware(firmware: Uint8Array) {
  const num = Math.ceil(firmware.length / 57)
  for (let i = 0; i < num; i++) {
    const byte = num - 1 - i
    const data = firmware.slice(i * 57, (i + 1) * 57)
    try {
      await getTransport().send([0x88, ...[byte & 0xFF, byte >> 8], data.length, ...data])
    }
    catch (err) {
      console.error(err)
      return
    }

    setProgress(20 + i / num * 80)
  }
}

async function sendFirmwareChecksum(checksum: number) {
  const checksumBytes = [checksum & 0xFF, checksum >> 8 & 0xFF, checksum >> 16 & 0xFF, checksum >> 24 & 0xFF]
  await getTransport().send([0x89, 0x00, 0x00, 0x04, ...checksumBytes], 5000) // 这里响应慢，给 5 秒超时时间
}

async function quitBoot() {
  await getTransport().send([0x8A])
}

// 一键升级功能 - 使用新协议的固件包格式
async function onClickStartUpdate() {
  if (!uint8ArrayObj) {
    console.error(t('settings.selectFileFirstError'))
    return
  }

  try {
    // 一键更新：更新所有有数据的固件（SPI 和 USB）
    const updateTasks: Array<'spi' | 'usb'> = []

    // 检查哪些固件需要更新
    if (uint8ArrayObj.SPI.size > 0) {
      updateTasks.push('spi')
    }
    if (uint8ArrayObj.USB.size > 0) {
      updateTasks.push('usb')
    }

    if (updateTasks.length === 0) {
      console.error(t('settings.noValidFirmwareDataError'))
      return
    }

    // 依次更新每个固件
    for (const type of updateTasks) {
      if (type === 'spi') {
        console.log('开始更新 SPI 固件...')
        currentUpdate.value.status = 'updating'
        currentUpdate.value.progress = 0

        // 1. 进入 SPI BOOT 模式，发送头信息（0-31字节）+ spiInfoBytes（32-47字节）
        const spiBootData = new Uint8Array([
          ...uint8ArrayObj.headerBytes,
          ...uint8ArrayObj.projectBytes,
          ...uint8ArrayObj.spiInfoBytes,
        ])
        await sendSpiBoot(spiBootData)
        console.log('发送 SPI BOOT 头信息（48字节）')
        setProgress(10)

        // 2. 发送固件大小
        await sendFirmwareSize(uint8ArrayObj.SPI.firmware!)
        console.log(`发送 SPI 固件大小: ${uint8ArrayObj.SPI.firmware!.length} 字节`)
        setProgress(20)

        // 3. 发送固件数据
        await sendFirmware(uint8ArrayObj.SPI.firmware!)
        console.log('发送 SPI 固件数据完成')
        setProgress(80)

        // 4. 发送固件 checksum
        await sendFirmwareChecksum(uint8ArrayObj.SPI.checksum)
        console.log(`发送 SPI 固件 checksum: ${uint8ArrayObj.SPI.checksum}`)
        setProgress(100)

        // 5. 退出 BOOT 模式
        quitBoot()
        console.log('SPI 固件更新完成，退出 BOOT')
      }
      else if (type === 'usb') {
        console.log('开始更新 USB 固件...')
        currentUpdate.value.status = 'updating'
        currentUpdate.value.progress = 0

        // 1. 进入 USB BOOT 模式，发送头信息（0-31字节）+ usbInfoBytes（48-63字节）
        const usbBootData = new Uint8Array([
          ...uint8ArrayObj.headerBytes,
          ...uint8ArrayObj.projectBytes,
          ...uint8ArrayObj.usbInfoBytes,
        ])
        await sendUsbBoot(usbBootData)
        console.log('发送 USB BOOT 头信息（48字节）')
        setProgress(10)

        // 2. 发送固件大小
        await sendFirmwareSize(uint8ArrayObj.USB.firmware!)
        console.log(`发送 USB 固件大小: ${uint8ArrayObj.USB.firmware!.length} 字节`)
        setProgress(20)

        // 3. 发送固件数据
        await sendFirmware(uint8ArrayObj.USB.firmware!)
        console.log('发送 USB 固件数据完成')
        setProgress(80)

        // 4. 发送固件 checksum
        await sendFirmwareChecksum(uint8ArrayObj.USB.checksum)
        console.log(`发送 USB 固件 checksum: ${uint8ArrayObj.USB.checksum}`)
        setProgress(100)

        // 5. 退出 BOOT 模式
        quitBoot()
      }
    }

    console.log('固件更新完成！')
    currentUpdate.value.status = 'updateCompleted'

    // 等待后重新加载
    await sleep(1000)
    location.reload()
  }
  catch (err) {
    console.log('更新失败=====', err)
    currentUpdate.value.status = 'updateFailed'
    onClose()
    if (err instanceof Error) {
      showMessage(t('settings.updateFailedMessage'))
    }
  }
}

// 更新完毕后关闭弹窗
function onClose() {
  selectFile.value = null
  currentUpdate.value.progress = 0
  currentUpdate.value.status = 'updateNow'
}

// 连接接收器设备
async function connectAdapterDevice() {
  try {
    adapterTransport.value = await createTransportWebHID({
      id: 'v8_adapter',
      filters: [
        // 接收器设备
        { vendorId: 0x2FE5, productId: 0x0005 },
      ],
      commandHandler: async (data) => {
        // 处理响应数据
      },
    })

    // 连接成功后获取版本号
    await getAdapterVersion()
  }
  catch (err) {
    console.error('连接接收器失败', err)
  }
}

// 获取接收器版本号
async function getAdapterVersion() {
  if (!adapterTransport.value) {
    return
  }

  await getVersion(adapterTransport.value)
}

async function getLatestVersion() {
  await userStore.fetchLatestVersion()
  updateList.spi.latestVersion = userStore.latestVersion.adapterVersion
  updateList.usb.latestVersion = userStore.latestVersion.mouseVersion
  updateList.usb.disabled = !!userStore.latestVersion.usbFilePath
  updateList.spi.disabled = !!userStore.latestVersion.spiFilePath
}

async function fetchWithProgress(url: string, onProgress: (progress: string) => void) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const contentLength = response.headers.get('content-length')
    if (!contentLength) {
      throw new Error('Content-Length not provided by server.')
    }

    const totalLength = Number.parseInt(contentLength, 10)
    let receivedLength = 0
    const reader = response.body!.getReader()
    const chunks = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      receivedLength += value.length
      chunks.push(value)

      const progress = (receivedLength / totalLength) * 100
      if (onProgress) {
        onProgress(progress.toFixed(2))
      }
    }

    const uint8Array = new Uint8Array(receivedLength)
    let position = 0
    for (const chunk of chunks) {
      uint8Array.set(chunk, position)
      position += chunk.length
    }

    bin_Uint8Array.value = uint8Array
    console.log('bin_Uint8Array=====download===', uint8Array)

    // 返回结果（或者可以继续使用 arrayBuffer 进行其他操作）
    return uint8Array
  }
  catch (error) {
    console.error('Error fetching file:', error)
    throw error
  }
}

async function onClickUpdate(type: 'spi' | 'usb') {
  if (type === 'spi' && !updateList.spi.disabled1) {
    showMessage(t('settings.receiverNotConnectedError'))
    return
  }
  if (type === 'usb' && !updateList.usb.disabled1) {
    showMessage(t('settings.mouseNotConnectedError'))
    return
  }

  // 如果有固件正在更新中，不允许触发新的更新
  if (updateList.spi.status === 'updating' || updateList.usb.status === 'updating') {
    return
  }

  // 如果是更新鼠标，且接收器也有可更新固件，先提示建议先更新接收器
  if (type === 'usb' && updateList.spi.disabled) {
    try {
      await ElMessageBox({
        title: t('settings.updatePromptTitle'),
        message: t('settings.suggestUpdateReceiverFirst'),
        confirmButtonText: t('settings.confirmUpdate'),
        cancelButtonText: t('button.cancel'),
        type: '',
        customClass: 'update-confirm-box',
        closeOnClickModal: false,
        closeOnPressEscape: false,
        showClose: true,
      })
    }
    catch {
      // 用户点击了取消
      return
    }
  }

  isMSDevice.value = type === 'usb'
  currentUpdateKey.value = type
  currentUpdate.value.status = 'updating'
  currentUpdate.value.progress = 0

  let url = `${import.meta.env.VITE_SERVER_API}/`

  if (type === 'spi') {
    if (!userStore.latestVersion.spiFilePath) {
      showMessage(t('settings.noReceiverFirmwareError'))
      return
    }
    url += userStore.latestVersion.spiFilePath
  }
  else if (type === 'usb') {
    if (!userStore.latestVersion.usbFilePath) {
      showMessage(t('settings.noMouseFirmwareError'))
      return
    }
    url += userStore.latestVersion.usbFilePath
  }

  try {
    const binData = await fetchWithProgress(url, (progress) => {
      setProgress(Number(progress) * 0.2)
    })

    // 解析固件数据
    const success = parseFirmwareData(binData)

    if (success) {
      // 直接调用更新函数
      await onClickStartUpdate()
    }
    else {
      currentUpdate.value.status = 'updateFailed'
      showMessage(t('settings.parseFirmwareFailedError'))
    }
  }
  catch (err) {
    currentUpdate.value.status = 'updateFailed'
    if (err instanceof Error) {
      showMessage(t('settings.downloadFirmwareFailedError'))
    }
  }
}

onMounted(async () => {
  autofit.init({
    dh: 1080,
    dw: 1920,
    el: '#app',
    resize: true,
    allowScroll: true,
  })
  getLatestVersion()
})
</script>

<template>
  <div class="contain-content flex flex-col items-center">
    <a class="absolute left-30px top-30px" href="/">
      <img class="h-45px" src="/logo.png" alt="logo">
    </a>
    <Close class="fixed right-50px top-40px w-[40px] color-#fff font-900 opacity-30 hover:opacity-100" @click="router.push('/hid/v8')" />

    <div class="w-70% pt-10">
      <h1 class="mb-20 text-center text-2xl">
        {{ t('settings.title') }}
      </h1>
      <h1 class="mb-5 text-center text-xl">
        {{ t('settings.versionTitle', { version: updateList.usb.disabled1 ? userStore.latestVersion.mouseVersion : userStore.latestVersion.adapterVersion }) }}
      </h1>

      <div class="mb-20 flex items-center justify-center text-start">
        <span class="leading-7" v-html="description" />
        <!-- <span class="leading-7" v-html="'1. 优化屋标使用过星中的光标抖动。xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx<br>2.修复已知问题。xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx <br>3.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'"></span> -->
      </div>

      <div class="align-center flex justify-between">
        <!-- (item.version < item.latestVersion) &&  -->
        <div v-for="(item, index) in updateList" :key="index" class="min-w-[300px] w-40% flex flex-col items-center gap-6 rounded-2xl" :class="(item.version < item.latestVersion) && item.disabled ? '' : 'opacity-50 pointer-events-none'">
          <div class="w-100% flex items-center justify-between">
            <div>{{ item.title }}： {{ item.version }} </div>
            <ElBadge :value="(item.version < item.latestVersion) && item.disabled ? 'new' : ''">
              <!-- exe 环境：显示"选择文件"按钮 -->
              <ElButton v-if="isElectron" :disabled="item.status !== 'updateNow'" type="primary" round @click="toSelectFileHandle(item.title, index)">
                {{ t('settings.selectFile') }}  <input ref="fileInput" type="file" accept=".bin" style="display: none" @change="selectFileHandle">
              </ElButton>

              <!-- 网页环境：显示"一键升级"按钮 -->

              <ElButton v-if="!isElectron && index !== 'usb' && adapterTransport" :disabled="item.status !== 'updateNow'" type="primary" round @click="onClickUpdate(index)">
                {{ t('settings.updateNow') }}
              </ElButton>

              <ElButton v-if="!isElectron && index !== 'usb' && !adapterTransport" :disabled="item.status !== 'updateNow'" type="primary" round @click="connectAdapterDevice">
                {{ t('settings.getReceiverVersion') }}
              </ElButton>

              <!-- 网页环境：显示"一键升级"按钮 -->
              <ElButton v-if="!isElectron && index == 'usb'" :disabled="item.status !== 'updateNow'" type="primary" round @click="onClickUpdate(index)">
                {{ t('settings.updateNow') }}
              </ElButton>
            </ElBadge>
          </div>
          <img class="h-[80px]" :src="item.img" alt="img">
          <div :style="{ color: (index === 'usb' && !item.disabled1) || (index === 'spi' && !item.disabled1) ? 'red' : '' }">
            *{{ item.hint1 }}*
          </div>
          <ElProgress class="w-full" :percentage="item.progress" :status="item.progress == 100 ? 'success' : ''" :stroke-width="10" :striped="item.progress !== 100" striped-flow :duration="10" :show-text="false" />
          <div v-if="item.status === 'updateFailed'" class="color-red">
            {{ item.errorHint }}
          </div>
          <div v-else>
            {{ item.hint2 }}
          </div>
        </div>
      </div>

      <!-- 下面代码调试使用 -->
      <!-- <div class="mt-10">
        <div class="flex flex-wrap gap-2 py-4">
          <ElButton type="primary" class="w-30" @click="toSelectFileHandle">
            选择文件<input ref="fileInput" type="file" accept=".bin" style="display: none" @change="selectFileHandle">
          </ElButton>
          <ElButton type="primary" @click="sendSpiBoot()">
            进入 SPI BOOT
          </ElButton>
          <ElButton type="primary" @click="sendUsbBoot">
            进入 USB BOOT
          </ElButton>
          <ElButton type="primary" @click="sendFirmwareSize">
            发送固件大小
          </ElButton>
          <ElButton type="primary" @click="sendFirmware">
            发送固件
          </ElButton>
          <ElButton type="primary" @click="sendFirmwareChecksum">
            发送固件 checksum
          </ElButton>
          <ElButton type="primary" @click="quitBoot">
            退出 boot
          </ElButton>
        </div>
        <div>
          <ElInput
            v-model="textarea"
            class="w-[370px]"
            :rows="8"
            type="textarea"
            placeholder="输入 64 位数据，英文逗号分隔"
          />
          <ElButton @click="send64">
            发送
          </ElButton>
        </div>
        <div class="text-start">
          <div>接收的数据：</div>
          <div class="m-2 h-250px overflow-x-auto border-1 p-2">
            <div v-for="item in inputDataList" class="break-words">
              {{ item }}
            </div>
          </div>
        </div>
      </div> -->
    </div>
    <div v-if="selectFile" class="zhezhao">
      <ElButton v-if="currentUpdate.status === 'updateNow'" type="primary" round @click="onClickStartUpdate">
        {{ t('settings.startUpdate') }}
      </ElButton>
      <div v-if="currentUpdate.status === 'updating'" style="width: 50%;">
        <!-- :percentage="item.progress" :status="item.progress == 100 ? 'success' : ''" :stroke-width="10" :striped="item.progress !== 100" -->
        <div style="margin-bottom: 10px;color: #0090FF;font-size: 30px;">
          {{ t('settings.updating') }}
        </div>
        <ElProgress :percentage="currentUpdate.progress" :status="currentUpdate.progress == 100 ? 'success' : ''" class="w-full" striped-flow :duration="10" :show-text="false" :stroke-width="10" :striped="currentUpdate.progress !== 100" />
      </div>
      <div v-if="currentUpdate.status === 'updateCompleted'" style="width: 50%;">
        <!-- :percentage="item.progress" :status="item.progress == 100 ? 'success' : ''" :stroke-width="10" :striped="item.progress !== 100" -->
        <div style="margin-bottom: 10px;color: #0090FF;font-size: 30px;">
          {{ t('settings.updateCompleted') }}
        </div>
        <ElButton v-if="currentUpdate.status === 'updateNow'" type="primary" round @click="onClose">
          {{ t('button.ok') }}
        </ElButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contain-content {
  height: 100%;
  width: 100%;
  background-image: url('/public/v9/bg-s.webp');
  background-size: 100% 100%;
  background-position: center center;
  background-repeat: no-repeat;
}

.contain-content .zhezhao {
  position: absolute;
  width: 1100px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  top: 42%;
  height: 350px;
  border-radius: 50px;
  transform: translate(0, -100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

<style>
/* 科技感提示框 - 白色玻璃化效果 */
.update-confirm-box {
  width: 420px !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(30px) !important;
  -webkit-backdrop-filter: blur(30px) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  box-shadow:
    0 0 20px rgba(255, 255, 255, 0.15),
    0 0 40px rgba(255, 255, 255, 0.1),
    0 15px 50px rgba(0, 0, 0, 0.3),
    inset 0 0 30px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
  padding: 0 !important;
  overflow: hidden !important;
  animation: boxGlow 3s ease-in-out infinite !important;
}

@keyframes boxGlow {
  0%,
  100% {
    box-shadow:
      0 0 20px rgba(255, 255, 255, 0.12),
      0 0 40px rgba(255, 255, 255, 0.08),
      0 15px 50px rgba(0, 0, 0, 0.3),
      inset 0 0 30px rgba(255, 255, 255, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
  }
  50% {
    box-shadow:
      0 0 30px rgba(255, 255, 255, 0.2),
      0 0 60px rgba(255, 255, 255, 0.12),
      0 15px 50px rgba(0, 0, 0, 0.3),
      inset 0 0 40px rgba(255, 255, 255, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
  }
}

.update-confirm-box .el-message-box__header {
  padding: 20px 24px 16px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
  margin: 0 !important;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.update-confirm-box .el-message-box__title {
  font-size: 17px !important;
  font-weight: 600 !important;
  color: #ffffff !important;
  letter-spacing: 0.5px !important;
  text-shadow:
    0 0 10px rgba(255, 255, 255, 0.6),
    0 0 20px rgba(255, 255, 255, 0.3) !important;
}

.update-confirm-box .el-message-box__content {
  padding: 18px 24px 20px !important;
}

.update-confirm-box .el-message-box__message {
  font-size: 14px !important;
  line-height: 1.7 !important;
  color: #e4e7ed !important;
  font-weight: 400 !important;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.2) !important;
}

.update-confirm-box .el-message-box__btns {
  padding: 0 24px 20px !important;
  display: flex !important;
  justify-content: flex-end !important;
  gap: 12px !important;
}

.update-confirm-box .el-button {
  min-width: 85px !important;
  height: 38px !important;
  border-radius: 8px !important;
  padding: 0 20px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  border: none !important;
}

.update-confirm-box .el-button--default {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #e4e7ed !important;
  border: none !important;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.2) !important;
}

.update-confirm-box .el-button--default:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  border: none !important;
  color: #ffffff !important;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.2) !important;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.4) !important;
}

.update-confirm-box .el-button--primary {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%) !important;
  color: #1a1a1a !important;
  border: none !important;
  box-shadow:
    0 0 20px rgba(255, 255, 255, 0.4),
    0 4px 20px rgba(255, 255, 255, 0.2),
    inset 0 0 15px rgba(255, 255, 255, 0.3) !important;
  text-shadow: none !important;
}

.update-confirm-box .el-button--primary:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.85) 100%) !important;
  box-shadow:
    0 0 30px rgba(255, 255, 255, 0.5),
    0 6px 25px rgba(255, 255, 255, 0.3),
    inset 0 0 20px rgba(255, 255, 255, 0.4) !important;
  transform: translateY(-1px) !important;
  text-shadow: none !important;
}
</style>
