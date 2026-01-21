<script setup lang="ts">
import { ArrowLeftBold } from '@element-plus/icons-vue'
import { ElBadge, ElButton, ElInput, ElProgress } from 'element-plus'
import { combineLowAndHigh8Bits, sleep } from '~/utils'
import { useTransportWebHID } from '~/utils/hidHandle'
// import { stringSplit } from '~/utils';

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()

const transport = ref()
const inputDataList = ref<string[]>([])
const bin_Uint8Array = ref<Uint8Array>()

const updateList = reactive({
  spi: {
    title: t('settings.spiVersion'),
    version: '1.0',
    latestVersion: '1.0.0',
    status: 'updateNow', // updateNow updating updateCompleted updateFailed
    img: '/update-receiver.png',
    hint1: t('settings.hint11'),
    hint2: t('settings.hint12'),
    errorHint: t('settings.errorHint11'),
    progress: 0,
    disabled: true,
  },
  usb: {
    title: t('settings.usbVersion'),
    version: '1.0',
    latestVersion: '8.0.2',
    status: 'updateNow', // updateNow updating updateCompleted updateFailed
    img: '/update-mouse.png',
    hint1: t('settings.hint21'),
    hint2: t('settings.hint22'),
    errorHint: t('settings.errorHint21'),
    progress: 0,
    disabled: true,
  },
})

const currentUpdateKey = ref<'spi' | 'usb'>('spi')
const currentUpdate = computed(() => updateList[currentUpdateKey.value])
const description = computed(() => {
  return userStore?.latestVersion?.description?.replace(/\n/g, '<br>')
})

useTransportWebHID('v8', async (instance) => {
  transport.value = instance
  if (!transport.value) {
    router.push('/')
    return
  }

  await getVersion()

  // 测试代码
  transport.value.setHandler((data: Uint8Array) => {
    inputDataList.value.push(data.toString())
  })

  navigator.hid.addEventListener('disconnect', (event) => {
    console.log('设备断开连接:', event.device)
  })
})

// 获取版本号
async function getVersion() {
  // { vendorId: 0x2FE3, productId: 0x0007, name: "鼠标", sendData: 0x0F },
  // { vendorId: 0x2FE5, productId: 0x0005, name: "接收器", sendData: 0x18 },

  const { productId, vendorId } = transport.value.device
  if (vendorId === 0x2FE3 && productId === 0x0007) {
    updateList.usb.disabled = false
  }
  else if (vendorId === 0x2FE5 && productId === 0x0005) {
    updateList.spi.disabled = false
  }

  const currentDevice = userStore.devices.find(item => item.vendorId === vendorId && item.productId === productId)

  const res = await transport.value.send([currentDevice?.sendData])

  const version = combineLowAndHigh8Bits(res[3], res[4])

  switch (currentDevice?.name) {
    case '接收器':
      updateList.spi.version = String(version)
      currentUpdateKey.value = 'spi'
      break
    case '鼠标':
      updateList.usb.version = String(version)
      currentUpdateKey.value = 'usb'
      break
  }

  // 获取另外一个芯片 USB PHY 的版本号
  const PhyRes = await transport.value.send([0x21])
  updateList.usb.version = `${updateList.usb.version}.${combineLowAndHigh8Bits(PhyRes[3], PhyRes[4])}`
}

const isMSDevice = ref(false)
const fileInput = ref()

function toSelectFileHandle(name: string, type: string) {
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

function selectFileHandle(event: any) {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = function (e: any) {
      const arrayBuffer = e.target.result
      const uint8Array = new Uint8Array(arrayBuffer)
      bin_Uint8Array.value = uint8Array
      console.log('bin_Uint8Array======selectFile==', uint8Array)

      // 解析字节 0-15 的 ASCII 编码
      const headerBytes = uint8Array.slice(0, 16)
      const header = String.fromCharCode(...headerBytes.filter(b => b !== 0xFF && b !== 0x00))
      console.log('字节 0-15 (头部):', header)

      // 解析字节 16-31 的 ASCII 编码
      const projectBytes = uint8Array.slice(16, 32)
      const projectName = String.fromCharCode(...projectBytes.filter(b => b !== 0xFF && b !== 0x00))
      console.log('字节 16-31 (项目名):', projectName)

      // 解析 SPI 固件信息（32-47字节）
      const spiAddress = bytesToUint32(uint8Array.slice(32, 36))
      const spiSize = bytesToUint32(uint8Array.slice(36, 40))
      const spiChecksum = bytesToUint32(uint8Array.slice(40, 44))
      const spiVersion = bytesToUint32(uint8Array.slice(44, 48))

      // 解析 USB 固件信息（48-63字节）
      const usbAddress = bytesToUint32(uint8Array.slice(48, 52))
      const usbSize = bytesToUint32(uint8Array.slice(52, 56))
      const usbChecksum = bytesToUint32(uint8Array.slice(56, 60))
      const usbVersion = bytesToUint32(uint8Array.slice(60, 64))

      console.log('SPI 固件信息:', {
        address: `0x${spiAddress.toString(16).toUpperCase()}`,
        size: spiSize,
        checksum: `0x${spiChecksum.toString(16).toUpperCase()}`,
        version: spiVersion,
      })

      console.log('USB 固件信息:', {
        address: `0x${usbAddress.toString(16).toUpperCase()}`,
        size: usbSize,
        checksum: `0x${usbChecksum.toString(16).toUpperCase()}`,
        version: usbVersion,
      })

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
        console.log(`SPI 固件已截取: 地址 0x${spiAddress.toString(16)} - 0x${spiEnd.toString(16)}, 大小 ${spiFirmware.length} 字节`)
        console.log(`SPI checksum (计算值): 0x${spiCalculatedChecksum.toString(16).toUpperCase()}`)
      }

      if (usbSize > 0) {
        const usbEnd = usbAddress + usbSize
        usbFirmware = uint8Array.slice(usbAddress, usbEnd)
        // 计算 USB 固件的 checksum（所有字节累加）
        usbCalculatedChecksum = usbFirmware.reduce((acc, val) => acc + val, 0)
        console.log(`USB 固件已截取: 地址 0x${usbAddress.toString(16)} - 0x${usbEnd.toString(16)}, 大小 ${usbFirmware.length} 字节`)
        console.log(`USB checksum (计算值): 0x${usbCalculatedChecksum.toString(16).toUpperCase()}`)
      }

      if (isMSDevice.value && header !== 'MS-USB-UPGRADE') {
        console.log('头字符串对不上，也提示错误，说明放错了文件')
        return
      }
      if (isMSDevice.value && projectName !== 'SCYROX_V10') {
        console.log('网页判断项目名不对，不给升级')
        return
      }

      Object.assign(uint8ArrayObj, {
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

      selectFile.value = file
    }
    // 读取文件内容返回 ArrayBuffer
    reader.readAsArrayBuffer(file)
  }
}

async function sendSpiBoot() {
  await transport.value.send([0x85])
}

// 解析固件包头部信息（64字节）
function parseFirmwareHeader(data: Uint8Array) {
  if (data.length < 64) {
    throw new Error('固件文件格式错误：头部不足64字节')
  }

  // 解析头部（0-15字节）
  const headerBytes = data.slice(0, 16)
  const header = String.fromCharCode(...headerBytes.filter(b => b !== 0xFF))

  // 解析项目名（16-31字节）
  const projectBytes = data.slice(16, 32)
  const projectName = String.fromCharCode(...projectBytes.filter(b => b !== 0xFF))

  // 解析 SPI APP1 固件信息（32-47字节）
  const spiAddress = bytesToUint32(data.slice(32, 36))
  const spiSize = bytesToUint32(data.slice(36, 40))
  const spiChecksum = bytesToUint32(data.slice(40, 44))

  // 解析 USB APP2 固件信息（48-63字节）
  const usbAddress = bytesToUint32(data.slice(48, 52))
  const usbSize = bytesToUint32(data.slice(52, 56))
  const usbChecksum = bytesToUint32(data.slice(56, 60))

  return {
    header,
    projectName,
    spi: { address: spiAddress, size: spiSize, checksum: spiChecksum },
    usb: { address: usbAddress, size: usbSize, checksum: usbChecksum },
  }
}

// 字节数组转32位整数（大端序）
function bytesToUint32(bytes: Uint8Array): number {
  return bytes[3] | (bytes[2] << 8) | (bytes[1] << 16) | (bytes[0] << 24)
}

// 验证固件头部
function validateFirmwareHeader(headerInfo: any, currentDevice: any) {
  // 检查设备类型匹配
  const isMouse = currentDevice?.name === '鼠标'
  const expectedHeader = isMouse ? 'MS-USB-UPGRADE' : 'DO-USB-UPGRADE'

  if (!headerInfo.header.includes(expectedHeader)) {
    throw new Error(`固件类型不匹配：当前设备是${currentDevice?.name}，但固件头部是 ${headerInfo.header}`)
  }

  console.log('✓ 固件头部验证通过')
  console.log('  - 头部:', headerInfo.header)
  console.log('  - 项目名:', headerInfo.projectName)
  console.log('  - SPI固件:', `地址:0x${headerInfo.spi.address.toString(16)}, 大小:${headerInfo.spi.size}字节`)
  console.log('  - USB固件:', `地址:0x${headerInfo.usb.address.toString(16)}, 大小:${headerInfo.usb.size}字节`)

  return headerInfo
}

async function sendUsbBoot() {
  await transport.value.send([0x86])
}

async function sendFirmwareSize() {
  const byte = bin_Uint8Array.value?.byteLength || 0
  const fw_size = [byte & 0xFF, byte >> 8 & 0xFF, byte >> 16 & 0xFF, byte >> 24 & 0xFF]
  await transport.value.send([0x87, 0x00, 0x00, 0x04, ...fw_size], 20000) // 这里响应慢，给 20 秒超时时间
}

function setProgress(progress: number) {
  currentUpdate.value.progress = Number(progress.toFixed(2))
}

async function sendFirmware() {
  const num = Math.ceil(bin_Uint8Array.value!.length / 57)
  for (let i = 0; i < num; i++) {
    const byte = num - 1 - i
    const data = bin_Uint8Array.value!.slice(i * 57, (i + 1) * 57)
    try {
      await transport.value.send([0x88, ...[byte & 0xFF, byte >> 8], data.length, ...data])
    }
    catch (err) {
      console.error(err)
      return
    }

    setProgress(20 + i / num * 80)
  }
}

async function sendFirmwareChecksum() {
  const byte = bin_Uint8Array.value?.reduce((acc, value) => acc + value, 0) || 0
  const checksum = [byte & 0xFF, byte >> 8 & 0xFF, byte >> 16 & 0xFF, byte >> 24 & 0xFF]
  await transport.value.send([0x89, 0x00, 0x00, 0x04, ...checksum], 5000) // 这里响应慢，给 5 秒超时时间
}

async function quitBoot() {
  await transport.value.send([0x8A], 1000)
}

// 一键升级功能 - 使用新协议的固件包格式
async function onClickStartUpdate() {
  if (!bin_Uint8Array.value) {
    console.error('请先选择固件文件')
    return
  }

  try {
    // 1. 解析固件头部（64字节）
    const headerInfo = parseFirmwareHeader(bin_Uint8Array.value)

    console.log(headerInfo, 'headerInfo')

    // 2. 获取当前设备信息
    const { productId, vendorId } = transport.value.device
    const currentDevice = userStore.devices.find(item => item.vendorId === vendorId && item.productId === productId)

    // 3. 验证固件头部
    validateFirmwareHeader(headerInfo, currentDevice)

    // 4. 确定要升级的固件类型
    const isMouse = currentDevice?.name === '鼠标'
    const firmwareType = isMouse ? 'usb' : 'spi'
    currentUpdateKey.value = firmwareType
    currentUpdate.value.status = 'updating'
    currentUpdate.value.progress = 0

    // 5. 进入 BOOT 模式
    if (isMouse) {
      await sendUsbBoot() // 鼠标使用 0x86
      console.log('进入 USB BOOT')
    }
    else {
      await sendSpiBoot() // 接收器使用 0x85
      console.log('进入 SPI BOOT')
    }
    setProgress(10)

    // 6. 发送固件信息（64字节头部）
    // 根据协议，需要发送完整的64字节头部给设备
    const header64Bytes = bin_Uint8Array.value.slice(0, 64)
    await transport.value.send([...header64Bytes], 5000)
    console.log('发送固件头部信息（64字节）')
    setProgress(20)

    // 7. 发送实际固件数据（跳过64字节头部）
    const firmwareData = bin_Uint8Array.value.slice(64)
    const num = Math.ceil(firmwareData.length / 57)

    for (let i = 0; i < num; i++) {
      const packetIndex = num - 1 - i
      const data = firmwareData.slice(i * 57, (i + 1) * 57)
      try {
        // 使用 0x88 协议发送固件数据包
        await transport.value.send([0x88, ...[packetIndex & 0xFF, packetIndex >> 8], data.length, ...data])
      }
      catch (err) {
        console.error('发送固件数据失败:', err)
        throw err
      }

      setProgress(20 + (i / num) * 70)
    }
    console.log('发送固件数据完成')
    setProgress(90)

    // 8. 验证 checksum（可选）
    await sleep(1000)
    setProgress(95)

    // 9. 退出 BOOT 模式
    await quitBoot()
    console.log('退出 BOOT')
    currentUpdate.value.status = 'updateCompleted'
    setProgress(100)

    // 10. 等待后重新加载
    await sleep(1000)
    location.reload()
  }
  catch (err) {
    console.log('更新失败=====', err)
    currentUpdate.value.status = 'updateFailed'
    // 可以在这里显示错误信息给用户
    if (err instanceof Error) {
      alert(`更新失败：${err.message}`)
    }
  }
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
  currentUpdate.value.status = 'updating'
  let url = `${import.meta.env.VITE_SERVER_API}/`
  if (type === 'spi') {
    url += userStore.latestVersion.spiFilePath
  }
  else if (type === 'usb') {
    url += userStore.latestVersion.usbFilePath
  }

  try {
    await fetchWithProgress(url, (progress) => {
      setProgress(Number(progress) * 0.2)
    })

    await sendSpiBoot()
    console.log('进入 SPI BOOT')
    // if (type === 'spi') {
    //   await sendSpiBoot()
    //   console.log("进入 SPI BOOT")
    // } else if (type === 'usb') {
    //   await sendUsbBoot()
    //   console.log("进入 USB BOOT")
    // }

    await sendFirmwareSize()
    console.log('发送固件大小')

    await sendFirmware()
    console.log('发送固件')

    await sleep(1000)

    await sendFirmwareChecksum()
    console.log('发送固件 checksum')

    quitBoot() // 这个命令鼠标不会回复
    console.log('退出 boot')
    currentUpdate.value.status = 'updateCompleted'
    setProgress(100)
    await sleep(1000)
    location.reload()
  }
  catch (err) {
    console.log('更新失败=====', err)
    currentUpdate.value.status = 'updateFailed'
  }
}

// 0x06,0x00,0x01,0x02,0,30 鼠标中键设置成1
const textarea = ref(`0x06,0x01,0x00,0x00,0x04,0x00,0x00, 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x1b`)

async function send64() {
  const data = [...textarea.value.split(',').filter(item => !!item).map(item => Number(item))]
  const res = await transport.value.send(data)
  console.log('返回的数据=======', res)
}

async function getLatestVersion() {
  await userStore.fetchLatestVersion()
  updateList.spi.latestVersion = userStore.latestVersion.version
  updateList.usb.latestVersion = userStore.latestVersion.version
}

onMounted(async () => {
  getLatestVersion()
})
</script>

<template>
  <div class="contain-content flex flex-col items-center">
    <a class="absolute left-30px top-30px" href="/">
      <img class="h-45px" src="/logo.png" alt="logo">
    </a>
    <ArrowLeftBold class="fixed bottom-30px right-50px w-[40px] color-#fff font-900 opacity-30 hover:opacity-100" @click="router.back()" />

    <div class="m-auto w-70% pt-10">
      <h1 class="mb-20 text-center text-2xl">
        {{ t('settings.title') }}
      </h1>
      <h1 class="mb-5 text-center text-xl">
        {{ t('settings.versionTitle', { version: userStore.latestVersion.version }) }}
      </h1>

      <div class="mb-20 flex items-center justify-center text-start">
        <span class="leading-7" v-html="description" />
        <!-- <span class="leading-7" v-html="'1. 优化屋标使用过星中的光标抖动。xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx<br>2.修复已知问题。xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx <br>3.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'"></span> -->
      </div>

      <div class="align-center flex justify-between">
        <div v-for="(item, index) in updateList" :key="index" class="min-w-[300px] w-40% flex flex-col items-center gap-6 rounded-2xl" :class="(item.version < item.latestVersion) && !item.disabled ? '' : 'opacity-50 pointer-events-none'">
          <div class="w-100% flex items-center justify-between">
            <div>{{ item.title }}： {{ item.version }}</div>
            <ElBadge :value="userStore.latestVersion.version > (`${item.version}`) ? 'new' : ''">
              <!-- <el-button :disabled="item.status !== 'updateNow'" type="primary" round @click="onClickUpdate(index)">{{ t(`settings.${item.status}`) }}</el-button> -->
              <!-- :disabled="item.status !== 'updateNow'" -->
              <ElButton type="primary" round @click="toSelectFileHandle(item.title, index)">
                选择文件  <input ref="fileInput" type="file" accept=".bin" style="display: none" @change="selectFileHandle">
              </ElButton>
            </ElBadge>
          </div>
          <img class="h-[80px]" :src="item.img" alt="img">
          <div>*{{ item.hint1 }}*</div>
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
      <div class="mt-200">
        <div class="flex flex-wrap gap-2 py-4">
          <ElButton type="primary" class="w-30" @click="toSelectFileHandle">
            <!-- 选择文件<input ref="fileInput" type="file" accept=".bin" style="display: none" @change="selectFileHandle"> -->
          </ElButton>
          <ElButton type="primary" @click="sendSpiBoot">
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
      </div>
    </div>
    <div v-if="selectFile" class="zhezhao">
      <ElButton type="primary" round @click="onClickStartUpdate">
        开始更新
      </ElButton>
      <!-- <div style="width: 50%;"> -->
      <!-- :percentage="item.progress" :status="item.progress == 100 ? 'success' : ''" :stroke-width="10" :striped="item.progress !== 100" -->
      <!-- <div style="margin-bottom: 10px;color: #0090FF;font-size: 30px;">
          正在更新
        </div>
        <ElProgress class="w-full" striped-flow :duration="10" :show-text="false" :stroke-width="10" />
      </div> -->
    </div>
  </div>
</template>

<style scoped>
.contain-content {
  height: 100%;
  width: 100%;
  background-image: url('/public/v9/bg-s.png');
  background-size: 100% 100%;
  background-position: center center;
  background-repeat: no-repeat;
}

.contain-content .zhezhao {
  position: absolute;
  width: 60%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  top: 40%;
  height: 350px;
  border-radius: 50px;
  transform: translate(0, -100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
