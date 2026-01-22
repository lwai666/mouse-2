<script setup lang="ts">
import type { DotConnection } from '~/composables/useDotsConnection'
import type { ConnectionType, Macro, ProfileInfoType, ProfileType } from '~/types'

import type { TransportWebHIDInstance } from '~/renderer/utils/hidHandle'
import { ArrowDown, ArrowRight, ArrowRightBold, Close, Download, Plus, Upload, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { ElAlert, ElBadge, ElButton, ElDropdown, ElDropdownItem, ElDropdownMenu, ElIcon, ElInputNumber, ElLoading, ElMessage, ElMessageBox, ElProgress, ElSlider } from 'element-plus'
import { messageBox } from '~/components/CustomMessageBox'
import { chunkArray, combineLowAndHigh8Bits, decodeArrayBufferToString, encodeStringToArrayBuffer, getLowAndHigh8Bits, insertAt9th, jsonToBase64, mapHexToRange, mapRangeToHex, removeItem, sleep } from '~/renderer/utils'
import { keyMap, transportWebHID, useTransportWebHID } from '~/renderer/utils/hidHandle'

export type MouseButtonType = 'Left' | 'Right' | 'Wheel' | 'Forward' | 'Back' | 'dpi'
const mouseButton: MouseButtonType[] = ['Left', 'Right', 'Wheel', 'Forward', 'Back', 'dpi']

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()

const macroButtonRef = ref()

const transport = ref()

const constants = useConstants(t)

const chargingStatus = ref(0) // 充电状态 0:未充电，1:充电中

let loading = { close: () => {} }

// const alertTitle = ref('')
// let alertTitleTimer: NodeJS.Timeout = setTimeout(() => {}, 0)

// watch(() => userStore.alertTitle, () => {
//   clearTimeout(alertTitleTimer)
//   alertTitleTimer = setTimeout(() => {
//     userStore.setAlertTitle('')
//   }, 2000)
// })

// 当前修改的录制宏下标
const currentMacroButtonRecordedKeyIndex = ref()

const sliderDefaultSelectOptions = {
  jitter_elimination_slider: [{ label: '6ms', value: 6 }, { label: '4ms', value: 4 }, { label: '2ms', value: 2 }, { label: '0ms', value: 0 }],
  polling_slider: [{ label: '8000', value: 6 }, { label: '4000', value: 5 }, { label: '2000', value: 4 }, { label: '1000', value: 3 }, { label: '500', value: 2 }, { label: '250', value: 1 }, { label: '125', value: 0 }],
  dpi_slider: [{ label: '3200', value: 3200 }, { label: '2400', value: 2400 }, { label: '1400', value: 1400 }, { label: '800', value: 800 }],
  hibernation_slider: [{ label: '90s', value: 90 }, { label: '60s', value: 60 }, { label: '30s', value: 30 }, { label: '10s', value: 10 }],
  lod_slider: [{ label: '2mm', value: 2 }, { label: '1mm', value: 1 }, { label: '0.7mm', value: 0 }],
  // angle_slider: [{ label: '-30', value: 1 },{ label: '-10', value: 2 },{ label: '0', value: 3 },{ label: '15', value: 4 },{ label: '30', value: 5 }],
  angle_slider: [{ label: '-30°', value: -30 }, { label: '-10°', value: -10 }, { label: '15°', value: 15 }, { label: '30°', value: 30 }],
}

const sliderOptions = {
  jitter_elimination_slider: { min: 0, max: 6, step: 2 },
  polling_slider: { min: 0, max: 6, step: 1 },
  dpi_slider: { min: 400, max: 30000, step: 50 },
  hibernation_slider: { min: 1, max: 90, step: 1 },
  lod_slider: { min: 0, max: 2, step: 1 },
  angle_slider: { min: -30, max: 30, step: 1 },
}

function initProfileInfo() {
  return {
    battery_level: 0,
    version: 0,
    sports_arena: 0,
    motion_sync: false,

    jitter_elimination_slider: 0,
    dpi_length: 4,
    dpi_slider_active_index: 1,
    dpi_slider_list: [3000],
    polling_slider: 2,
    lod_slider: 0,
    hibernation_slider: 30,
    angle_slider: 0,

    // MouseButton 0左键，1右键，2中键，3后退，4前进，5dpi     [类型6，len设置1个数，index只发送这条命令, 0x01鼠标右键，控制键(ctrl，alt ，win，shift），普通按键(a，b，c.....)]
    Left: 0,
    Right: 1,
    Wheel: 2,
    Forward: 3,
    Back: 4,

    dpi: 5,

    // 录制宏-组合键
    macroList: [
      { name: '', connections: [], value: [] },
      { name: '', connections: [], value: [] },
      { name: '', connections: [], value: [] },
      { name: '', connections: [], value: [] },
      // cycleTimes: 0-40（循环次数）, cycleMode: 1-4(循环直到此按键松开，循环直到任意按键按下，循环直到此按键再次按下，循环次数模式)
      // { name: '鼠标宏名称1', connections: [{keyid: 'Left', cycleTimes: 40, cycleMode: 1}], value: [{ keyCode: 1, keyStatus: 0, intervalTime: 200 }] },
    ] as Macro[],
  }
}

const profileInfo = reactive(initProfileInfo())

provide<ProfileInfoType>('profileInfo', profileInfo)

const profileList = reactive<ProfileType[]>([
  { title: 'Profile 1', base64: '', uint8Array: [], value: undefined },
  { title: 'Profile 2', base64: '', uint8Array: [], value: undefined },
  { title: 'Profile 3', base64: '', uint8Array: [], value: undefined },
  { title: 'Profile 4', base64: '', uint8Array: [], value: undefined },
])
const active_profile_index = ref(0)

async function setProfileInfo(index: number) {
  // 切换时保存最新配置
  if (profileList[active_profile_index.value].value) {
    profileList[active_profile_index.value].value = JSON.parse(JSON.stringify(profileInfo))
  }

  active_profile_index.value = index

  // 有缓存数据则直接使用
  if (profileList[index].value) {
    Object.assign(profileInfo, profileList[index].value)
  }
  // 没有缓存数据则使用获取到的 uint8Array 数据
  else {
    Object.assign(profileInfo, uint8ArrayToProfileInfo(profileList[active_profile_index.value].uint8Array))
    profileList[active_profile_index.value].base64 = insertAt9th(jsonToBase64(profileInfo), 'd')
    profileList[index].value = JSON.parse(JSON.stringify(profileInfo))
  }

  // 创建连线监听
  nextTick(restartConnection)
}

const mouseButtonValue = computed(() => {
  return {
    Left: profileInfo.Left,
    Right: profileInfo.Right,
    Wheel: profileInfo.Wheel,
    Forward: profileInfo.Forward,
    Back: profileInfo.Back,
    dpi: profileInfo.dpi,
  }
})

function uint8ArrayToProfileInfo(uint8Array: Uint8Array[]) {
  const profileInfo = initProfileInfo()

  uint8Array.forEach((res) => {
    // 获取 profile 基础配置信息
    if (res[0] === 1) {
      const start_index = 3
      const dpi_slider_active_index = res[start_index + 2]
      const dpi_length = res[start_index + 3]

      const dpi_data_length = dpi_length * 2
      const dpi_end_index = start_index + 3 + dpi_data_length

      const dpi_slider_list = Array.from({ length: dpi_length }, (_, i) => (res[start_index + 3 + i * 2 + 2] << 8) | res[start_index + 3 + i * 2 + 1])
      const polling_slider = (res[dpi_end_index + 2] << 8) | res[dpi_end_index + 1] // 回报率

      const battery_level_index = dpi_end_index + 3
      const battery_level = res[battery_level_index] // 电量;
      const version = (res[battery_level_index + 2] << 8) | res[battery_level_index + 1]
      const lod_slider = res[battery_level_index + 3] // 静默高度
      const sports_arena = res[battery_level_index + 4] // 性能模式状态 0:普通模式，1:性能模式 2:竞技模式
      const jitter_elimination_slider = (res[battery_level_index + 6] << 8) | res[battery_level_index + 5] // 消抖时间
      const hibernation_slider = (res[battery_level_index + 10] << 24) | (res[battery_level_index + 9] << 16) | (res[battery_level_index + 8] << 8) | res[battery_level_index + 7] // 深度睡眠时间
      const motion_sync = res[battery_level_index + 11] // 运动模式
      const angle = mapHexToRange(res[battery_level_index + 12]) // 0xE2-0xFF（-30,-1） 和 0x00-0x1E (0, 30)     以前的：[-30, -10, 0, 15, 30] 角度 1-61 表示 -30度 ～ 30度

      console.log(`
        当前运行profile: ${active_profile_index.value}
        dpi: ${dpi_slider_list}
        当前dpi: ${profileInfo.dpi_slider_active_index}
        回报率: ${polling_slider}
        电量: ${battery_level}
        version: ${version}
        静默高度: ${lod_slider}
        性能模式状态 (0:普通模式，1:性能模式，2:竞技模式): ${sports_arena}
        消抖时间: ${jitter_elimination_slider}
        深度睡眠时间: ${hibernation_slider}
        运动模式: ${motion_sync}
        angle: ${angle} 【角度】
      `)

      profileInfo.battery_level = battery_level
      profileInfo.version = version
      profileInfo.sports_arena = sports_arena
      profileInfo.motion_sync = !!motion_sync

      profileInfo.dpi_length = dpi_length
      profileInfo.dpi_slider_active_index = dpi_slider_active_index
      profileInfo.dpi_slider_list = dpi_slider_list
      profileInfo.polling_slider = polling_slider
      profileInfo.lod_slider = lod_slider
      profileInfo.jitter_elimination_slider = jitter_elimination_slider > 6 ? 6 : jitter_elimination_slider
      profileInfo.hibernation_slider = (hibernation_slider / 1000) > 90 ? 90 : (hibernation_slider / 1000)
      profileInfo.angle_slider = angle || 0
    }
    // 获取多媒体宏
    else if (res[0] === 7) {
      chunkArray([...res.slice(3, 3 + res[2] * 3)], 3).forEach(([mouseButtonIndex, low8Bits, high8Bits]: number[]) => {
        profileInfo[mouseButton[mouseButtonIndex]] = combineLowAndHigh8Bits(low8Bits, high8Bits)
      })

      console.log(`
        多媒体鼠标按钮：
        左: ${profileInfo.Left}
        右: ${profileInfo.Right}
        中: ${profileInfo.Wheel}
        前进: ${profileInfo.Forward}
        后退: ${profileInfo.Back}
        dpi: ${profileInfo.dpi}
      `)
    }
    // 获取组合按键宏
    else if (res[0] === 8) {
      const connectionlist = chunkArray([...res.slice(3, 3 + res[2] * 4)], 4)

      connectionlist.forEach(([cycleMode, cycleTimes, mouseButtonIndex, macroIndex]: number[]) => {
        profileInfo.macroList[macroIndex].connections.push({
          cycleMode,
          cycleTimes,
          keyid: mouseButton[mouseButtonIndex],
        })
        profileInfo[mouseButton[mouseButtonIndex]] = 2000 + macroIndex
      })
    }
    // 获取鼠标按钮宏：左: 0，右: 1，中: 2，后退: 3，前进: 4，dpi: 5
    else if (res[0] === 9) {
      chunkArray([...res.slice(3, 3 + res[2] * 2)], 2).forEach(([mouseButtonIndex, value]: number[]) => {
        profileInfo[mouseButton[mouseButtonIndex]] = value // window.aaaaa ? window.aaaaa : value
      })

      console.log(`
        鼠标按钮：
        左: ${profileInfo.Left}
        右: ${profileInfo.Right}
        中: ${profileInfo.Wheel}
        后退: ${profileInfo.Back}
        前进: ${profileInfo.Forward}
        dpi: ${profileInfo.dpi}
      `)
    }
    // 获取宏录制名字 profile 名字
    else if (res[0] === 25) {
      const macroName = decodeArrayBufferToString(new Uint8Array(res.slice(4, 4 + res[2])))
      // 0-5 （左，右，中，前进，后退，dpi）   6-9 录制宏（球1-球4）
      if ([6, 7, 8, 9].includes(res[3])) {
        profileInfo.macroList[res[3] - 6].name = macroName
      }
      // 0x0a-0x0d（profile 名字）
      else if ([10, 11, 12, 13].includes(res[3])) {
        profileList[res[3] - 10].title = macroName
      }
    }
    // 获取宏录制 [0x1A, 0x1B, 0x1C, 0x1D]
    else if ([26, 27, 28, 29].includes(res[0])) {
      const data = chunkArray([...res.slice(3, 3 + res[2] * 4)], 4)
      const recordedKey = data.map(([keyCode, keyStatus, high8Bits, low8Bits]) => {
        const intervalTime = combineLowAndHigh8Bits(low8Bits, high8Bits)
        const key = keyMap[Object.keys(keyMap).find(key => keyMap[key].value === keyCode) || '']?.text
        return {
          key,
          type: [0x01, 0xA1, 0xB1].includes(keyStatus) ? 1 : 0, // 1:按下，0:抬起
          keyCode,
          keyStatus,
          intervalTime,
        }
      })
      profileInfo.macroList[res[0] - 26].value = recordedKey
    }
  })

  return profileInfo
}

function profileInfoToUint8Array(profileInfo: any): Uint8Array[] {
  const uint8Array: Uint8Array[] = []

  // 获取 profile 基础配置信息：0
  let uint8Array0: number[] = []
  const dpi_data = profileInfo.dpi_slider_list.reduce((arr: number[], item: number) => {
    arr.push(item & 0xFF, item >> 8 & 0xFF)
    return arr
  }, [])
  const dpi_length = profileInfo.dpi_slider_list.length
  uint8Array0 = [
    0x00,
    0, // Placeholder for length
    0, // Placeholder for end flag
    // active_profile_index.value,
    profileInfo.dpi_slider_active_index,
    dpi_length,
    ...dpi_data,
    profileInfo.polling_slider & 0xFF,
    profileInfo.polling_slider >> 8 & 0xFF,
    profileInfo.battery_level,
    profileInfo.version & 0xFF,
    profileInfo.version >> 8 & 0xFF,
    profileInfo.lod_slider,
    profileInfo.sports_arena,
    profileInfo.jitter_elimination_slider & 0xFF,
    profileInfo.jitter_elimination_slider >> 8 & 0xFF,
    (profileInfo.hibernation_slider * 1000) & 0xFF,
    (profileInfo.hibernation_slider * 1000) >> 8 & 0xFF,
    (profileInfo.hibernation_slider * 1000) >> 16 & 0xFF,
    (profileInfo.hibernation_slider * 1000) >> 24 & 0xFF,
    profileInfo.motion_sync ? 1 : 0,
    mapRangeToHex(profileInfo.angle_slider),
  ]
  uint8Array0[2] = uint8Array0.length - 2 // Set length
  uint8Array.push(transport.value.generatePacket(new Uint8Array(uint8Array0)))

  // 获取鼠标按钮宏：0x09 (左: 0，右: 1，中: 2，后退: 3，前进: 4，dpi: 5)
  let uint8Array9: number[] = []
  const isMouseKeys: MouseButtonType[] = []
  mouseButton.forEach((item) => {
    const value = findParentValue(constants.mouseKeyOptions, profileInfo[item])
    if (!value) {
      isMouseKeys.push(item)
    }
  })
  if (isMouseKeys.length) {
    uint8Array9 = [0x09, 0, isMouseKeys.length, ...isMouseKeys.map((btn: MouseButtonType) => [mouseButton.indexOf(btn), profileInfo[btn]]).flat()]
    uint8Array.push(transport.value.generatePacket(new Uint8Array(uint8Array9)))
  }

  // 获取多媒体宏: 0x07
  let uint8Array7: number[] = []
  const isMultimediaKeys: MouseButtonType[] = []
  mouseButton.forEach((item) => {
    const value = findParentValue(constants.mouseKeyOptions, profileInfo[item])
    if (value === 1000) {
      isMultimediaKeys.push(item)
    }
  })
  if (isMultimediaKeys.length) {
    uint8Array7 = [0x07, 0, isMultimediaKeys.length, ...isMultimediaKeys.map((btn: MouseButtonType) => [mouseButton.indexOf(btn), ...getLowAndHigh8Bits(profileInfo[btn])]).flat()]
    uint8Array.push(transport.value.generatePacket(new Uint8Array(uint8Array7)))
  }

  // 获取组合按键宏: 0x08
  let uint8Array8: number[] = []
  const isCombinationMacroKeys: MouseButtonType[] = []
  mouseButton.forEach((item) => {
    const value = findParentValue(constants.mouseKeyOptions, profileInfo[item])
    if (value === 1999) {
      isCombinationMacroKeys.push(item)
    }
  })

  if (isCombinationMacroKeys.length) {
    const combinationMacroList = profileInfo.macroList.reduce((res: number[][], macro: Macro, macroIndex: number) => {
      macro.connections?.forEach(({ cycleMode, cycleTimes, keyid }) => {
        if (isCombinationMacroKeys.includes(keyid)) {
          // [4(循环模式), 1(循环次数), 1(第几个按键), 0(映射第几个宏球)]
          res.push([cycleMode, cycleTimes, mouseButton.indexOf(keyid), macroIndex])
        }
      })
      return res
    }, [])

    uint8Array8 = [0x08, 0, isCombinationMacroKeys.length, ...combinationMacroList.flat()]
    uint8Array.push(transport.value.generatePacket(new Uint8Array(uint8Array8)))
  }

  // 获取宏录制 [0x1A, 0x1B, 0x1C, 0x1D]
  profileInfo.macroList.forEach((macro: Macro, macroIndex: number) => {
    if (macro.value.length) {
      const recordedKey = macro.value.reduce((arr: number[], { keyCode, keyStatus, intervalTime }: any) => {
        arr.push(keyCode, keyStatus, ...getLowAndHigh8Bits(intervalTime).reverse())
        return arr
      }, [])
      uint8Array.push(transport.value.generatePacket(new Uint8Array([0x1A + macroIndex, 0, macro.value.length, ...recordedKey])))
    }
  })

  // 获取宏录制名字:  (6-9 录制宏（球1-球4）| @todo: 0x0a-0x0d（profile 名字）)
  profileInfo.macroList.forEach((macro: Macro, macroIndex: number) => {
    if (macro.name) {
      const macroName = encodeStringToArrayBuffer(macro.name)
      uint8Array.push(transport.value.generatePacket(new Uint8Array([0x19, 0, macroName.length, macroIndex + 6, ...macroName])))
    }
  })

  // 当前第几个配置
  // uint8Array.push(transport.value.generatePacket(new Uint8Array([0x1E, 0x00, 0x01, active_profile_index.value])))

  // 结束包
  // uint8Array.push(transport.value.generatePacket(new Uint8Array([0])))

  return uint8Array
}

/** **************** 连线逻辑 start */

const mouseButtonRef = ref()
const dotsConnections = ref()
let dotsAddConnection: any = () => {}
let dotsRemoveConnection: any = () => {}
let dotsCleanup = ref(() => {})

// 离开页面删除连线
onBeforeRouteLeave(() => {
  dotsCleanup.value()
})

function restartConnection() {
  dotsCleanup.value()
  createConnection()
}

function setConnectionLineOpacity(opacity: string, exclude: number = 0) {
  for (let i = 0; i < dotsConnections.value.length - exclude; i++) {
    dotsConnections.value[i].line.style.opacity = opacity
  }
}

/** 创建连线 */
function createConnection() {
  let connectioning = false
  let _oldConnection: ConnectionType | undefined
  const { connections, addConnection, removeConnection, cleanup } = useDotsConnection({
    rules: [
      // 支持 class 包含 dot-a 的标签连接到 dot-b 的标签
      { from: '.dot-a', to: ['.dot-b'], maxConnections: { from: 4, to: 1 } },
      // { from: '.dot-b', to: ['.dot-a'], maxConnections: { from: 1, to: 1 } },
    ],
    onConnection: (connection: DotConnection) => {
      if (!connectioning) {
        mouseButtonRef.value.onConnection(Number(connection.start.dataset.macroIndex), connection.end.dataset.keyId)
        setConnectionLineOpacity('0', 1)
      }
    },
    onConnectionUpdate: async (newConnection: DotConnection, oldConnection: DotConnection) => {
      // const _oldMacro = profileInfo.macroList[Number(oldConnection.start.dataset.macroIndex)]
      // const _oldConnection = removeItem(_oldMacro.connections, _oldMacro.connections.findIndex(item => item.keyid === oldConnection.end.dataset.keyId))

      // console.log("_oldConnection========", _oldConnection)
      // console.log('修改连线-恢复默认按键===========', _oldConnection)
      // const oldKeyId = oldConnection.end.dataset.keyId as MouseButtonType
      // await onMouseButtonChange(oldKeyId, mouseButton.indexOf(oldKeyId))

      console.log('修改连线-添加组合宏键===========', Number(newConnection.start.dataset.macroIndex), newConnection.end.dataset.keyId)
      if (_oldConnection) {
        const newKeyId = newConnection.end.dataset.keyId as MouseButtonType
        const newKeyValue = 2000 + Number(newConnection.start.dataset.macroIndex)
        await onMouseButtonChange(newKeyId, newKeyValue, 1999, {
          cycleMode: _oldConnection.cycleMode,
          cycleTimes: _oldConnection.cycleTimes,
          macroIndex: Number(newConnection.start.dataset.macroIndex),
        })
      }
      else {
        if (!connectioning) {
          mouseButtonRef.value.onConnection(Number(newConnection.start.dataset.macroIndex), newConnection.end.dataset.keyId)
          setConnectionLineOpacity('0', 1)
        }
      }
    },
    onConnectionLeave: async (connection: DotConnection) => {
      console.log('离开连线-恢复默认按键===========', connection)
      const oldKeyId = connection.end.dataset.keyId as MouseButtonType
      const _oldMacro = profileInfo.macroList[Number(connection.start.dataset.macroIndex)]
      const removeIndex = _oldMacro.connections.findIndex(item => item.keyid === connection.end.dataset.keyId)

      if (userStore.mouseButtonStatus === 'connecting') {
        mouseButtonRef.value.resetConnection()
        setConnectionLineOpacity('1', 1)
        return
      }

      if (removeIndex !== -1) {
        _oldConnection = removeItem(_oldMacro.connections, _oldMacro.connections.findIndex(item => item.keyid === connection.end.dataset.keyId))
        await sendKeyMacro(oldKeyId, mouseButton.indexOf(oldKeyId))
      }
    },
    // onConnectionRemove: async (connection: DotConnection) => {
    //   console.log('删除连线-恢复默认按键===========', connection)
    //   const oldKeyId = connection.end.dataset.keyId as MouseButtonType
    //   const _oldMacro = profileInfo.macroList[Number(connection.start.dataset.macroIndex)]
    //   const removeIndex = _oldMacro.connections.findIndex(item => item.keyid === connection.end.dataset.keyId)

    //   // 删除连线中
    //   if (removeIndex === -1) {
    //     mouseButtonRef.value.resetConnection()
    //     nextTick(() => setTimeout(restartConnection, 200))
    //   }
    //   // 删除已连线
    //   else {
    //     removeItem(_oldMacro.connections, _oldMacro.connections.findIndex(item => item.keyid === connection.end.dataset.keyId))
    //     await onMouseButtonChange(oldKeyId, mouseButton.indexOf(oldKeyId))
    //   }
    // },
  })
  dotsConnections.value = connections.value
  dotsAddConnection = addConnection
  dotsRemoveConnection = removeConnection
  dotsCleanup.value = cleanup

  connectioning = true
  profileInfo.macroList.forEach((macro, macroIndex) => {
    macro.connections.forEach(({ keyid }) => {
      addConnection(`[data-macro-index="${macroIndex}"]`, `[data-key-id="${keyid}"]`)
    })
  })
  connectioning = false
}
/** **************** 连线逻辑 end */

async function initProfile() {
  await getProfile()
  await sendChargingStatus() // 获取充电状态
}

async function getProfile() {
  return new Promise(async (resolve, reject) => {
    let _active_profile_index = 0 // 当前 profile 下标
    let _profile_index = 0 // 当前正在接收的 profile

    try {
      transport.value.on('input-all', profileListener)
      loading.close()
      loading = ElLoading.service({
        lock: true,
        text: '',
        spinner: 'none',
        background: 'rgba(0, 0, 0, 0.7)',
      })
      await transport.value.send([0x01])
    }
    catch (error) {
      transport.value.off('input-all', profileListener)
      loading.close()
      console.error('获取 profile 失败', error)
    }

    function profileListener(res: Uint8Array) {
      // 获取 profile 监听结束
      if (res[0] === 1 && res[2] === 0) {
        transport.value.off('input-all', profileListener)
        try {
          setProfileInfo(_active_profile_index)
          resolve(_active_profile_index)
        }
        finally {
          loading.close()
        }
        console.log('收集4个 profile 数据=========', profileList)
        return
      }

      // 收集数据
      if (res[0] === 1) {
        _active_profile_index = res[3]
        _profile_index = res[4]
      }
      profileList[_profile_index].uint8Array.push(res)
      // const isCurrentProfile = active_profile_index.value === profile_index
    }

    setTimeout(() => {
      reject()
    }, 6000)
  })
}

// 粘贴分享设置 Profile
async function setProfile(data: { profileInfo: any, index: number }) {
  // 重置选中的宏
  resetSelectedMacro()

  const newProfileInfo = data.profileInfo

  // 切换 Profile
  if (data.index !== undefined) {
    await transport.value.send([0x1E, 0x00, 0x01, data.index])

    // 如果当前 profile 有缓存数据，则直接使用
    if (profileList[data.index].uint8Array?.length > 0) {
      setProfileInfo(data.index)
    }
    else {
      // 如果当前 profile 没有缓存数据，则获取
      initProfile()
    }
    return
  }

  const uint8Array = profileInfoToUint8Array(newProfileInfo)
  console.log('uint8Array=======', uint8Array)
  console.log('newProfileInfo=======', newProfileInfo)

  loading = ElLoading.service({ lock: true, text: '', spinner: 'none', background: 'rgba(0, 0, 0, 0.7)' })
  // 发生包
  for (const item of uint8Array) {
    await transport.value.send(item)
  }
  loading.close()

  Object.assign(profileInfo, JSON.parse(JSON.stringify(newProfileInfo)))
  setProfileInfo(active_profile_index.value)
  showMessage(t('message.profile_success'))
}

function onExecutionSuccess() {
  showMessage(t('message.execution_success'))
}

/**
 *
 * @param id 鼠标按键 'Left' | 'Right' | 'Wheel'| 'Forward' | 'Back' | 'dpi'
 * @param value 鼠标按键值
 * @param parentValue 父级值 (鼠标按键:null 多媒体:1000 组合宏:1999)
 * @param connectionData 组合键数据 { cycleTimes: number, cycleMode: number, macroIndex: number }
 */
async function onMouseButtonChange(id: MouseButtonType, value: number, parentValue?: number, connectionData?: { cycleTimes: number, cycleMode: number, macroIndex: number }) {
  if (parentValue) {
    if (parentValue === 1000) {
      await sendMultimediaMacro(id, value)
    }
    else if (parentValue === 1999 && connectionData) {
      await sendConnectionMacro(id, value, connectionData)
    }
  }
  else {
    await sendKeyMacro(id, value)
  }

  onExecutionSuccess()
  nextTick(() => setTimeout(restartConnection, 400))
}

/** 发送设置组合键宏 */
async function sendConnectionMacro(id: MouseButtonType, value: number, data: { cycleTimes: number, cycleMode: number, macroIndex: number }) {
  const index = mouseButton.indexOf(id)
  console.log('设置组合键宏========')
  await transport.value.send([0x08, 0x00, 1, data.cycleMode, data.cycleTimes, index, data.macroIndex])
  profileInfo[id] = value
  profileInfo.macroList[data.macroIndex].connections.push({
    cycleMode: data.cycleMode,
    cycleTimes: data.cycleTimes,
    keyid: id,
  })
  console.log('组合键宏已设置======', profileInfo)

  // loading = ElLoading.service({ lock: true, text: '', spinner: 'none', background: 'rgba(0, 0, 0, 0)' })
}

// 发送多媒体宏
function sendMultimediaMacro(id: MouseButtonType, value: number) {
  const index = mouseButton.indexOf(id)
  console.log('发送多媒体宏======')
  transport.value.send([0x07, 0x00, 0x01, index, ...getLowAndHigh8Bits(value)])
  profileInfo[id] = value
}

// 发送鼠标宏
async function sendKeyMacro(id: MouseButtonType, value: number) {
  const index = mouseButton.indexOf(id)
  console.log('发送鼠标宏======')
  await transport.value.send([0x09, 0x00, 0x01, index, value])
  profileInfo[id] = value
}

const dpi_progress = ref(false)
/** dpi设置 */
async function sendDpi(index?: number) {
  dpi_progress.value = true
  const dpi_length = profileInfo.dpi_slider_list.length
  const list = profileInfo.dpi_slider_list.reduce((arr: number[], item: number) => {
    arr.push(item & 0xFF, item >> 8 & 0xFF)
    return arr
  }, [])

  if (index !== undefined) {
    profileInfo.dpi_slider_active_index = index
  }

  // [设置类型，发多少条消息，后面传入数据长度，当前DPI挡位下标， DPI挡位个数， DPI挡位1(低8位)，DPI挡位1(高8位)，...]
  await transport.value.send([0x0A, 0x00, 2 + list.length, profileInfo.dpi_slider_active_index, dpi_length, ...list])
  dpi_progress.value = false
  onExecutionSuccess()
}

async function sendDpiLength(newLength: number | undefined, oldLength: number | undefined) {
  if (newLength === undefined || oldLength === undefined) { return }

  const default_dpi_slider_list = [3000, 8000, 15000, 24000, 30000]
  // 添加 dpi
  if (newLength > oldLength) {
    profileInfo.dpi_slider_list = [...profileInfo.dpi_slider_list, default_dpi_slider_list[newLength - 1]]
  }
  // 删除 dpi
  else if (newLength < oldLength) {
    // 删除的是当前 dpi 位，则删除前一个 dpi 位
    if (profileInfo.dpi_slider_active_index === newLength) {
      profileInfo.dpi_slider_list.splice(oldLength - 2, 1)
      profileInfo.dpi_slider_active_index = newLength - 1
    }
    else {
      profileInfo.dpi_slider_list = profileInfo.dpi_slider_list.slice(0, newLength)
    }
  }

  await sendDpi()
}

/** 设置进入休眠时间 */
async function sendPolling() {
  await transport.value.send([0x0C, 0x00, 0x01, profileInfo.polling_slider])
  onExecutionSuccess()
}

/** 设置进入休眠时间 */
async function sendHibernation() {
  const byte = profileInfo.hibernation_slider * 1000
  await transport.value.send([0x15, 0x00, 0x04, ...[byte & 0xFF, byte >> 8 & 0xFF, byte >> 16 & 0xFF, byte >> 24 & 0xFF]])
  onExecutionSuccess()
}

/** 设置静默高度 */
async function sendLod() {
  await transport.value.send([0x11, 0x00, 0x01, profileInfo.lod_slider])
  onExecutionSuccess()
}

/** 设置消抖时间 */
async function sendJitterElimination() {
  await transport.value.send([0x13, 0x00, 0x02, profileInfo.jitter_elimination_slider])
  onExecutionSuccess()
}

/** 设置角度 */
async function sendAngle() {
  await transport.value.send([0x17, 0x00, 0x01, mapRangeToHex(profileInfo.angle_slider)])
  onExecutionSuccess()
}

/** 设置性能模式（电竞模式） */
async function onSportsMode() {
  const sports_arena = profileInfo.sports_arena + 1
  profileInfo.sports_arena = sports_arena > 2 ? 0 : sports_arena

  await transport.value.send([0x12, 0x00, 0x01, profileInfo.sports_arena])
  onExecutionSuccess()
}

// 获取充电状态 0:不充电  1：充电
async function sendChargingStatus() {
  const res = await transport.value.send([0x20])
  chargingStatus.value = res[3]
}
// const onSportsMode = () => {
//   let sports_arena = profileInfo.sports_arena + 1
//   profileInfo.sports_arena = sports_arena > 2 ? 0 : sports_arena

//   await transport.value.send([0x12,0x00,0x01, profileInfo.sports_arena])
//   // customMessageBox.confirm(t('message.sports_mode'), t('message.warning'), { center: true })
//   // .then(() => {
//   //   // 点击勾确认按钮时执行的逻辑
//   // })
// }

async function onMotionSync() {
  profileInfo.motion_sync = !profileInfo.motion_sync
  await transport.value.send([0x16, 0x00, 0x01, profileInfo.motion_sync ? 1 : 0])
  onExecutionSuccess()
}

interface RecordedKey {
  key: string
  type: number
  keyCode: number
  keyStatus: number
  intervalTime: number
  _editable?: 'INTERVAL_TIME' | 'KEY' | null
}

// 录制中
const isRecording = ref(false)
let startTime: number = 0
const recordedKeys = ref<RecordedKey[]>([])
const recordedKeyHighlightIndex = ref()

function onClickPecordBtn() {
  isRecording.value = !isRecording.value

  if (isRecording.value) {
    startTime = new Date().getTime()
    recordedKeys.value = []
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
  }
  else {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
    console.log('录制的按键：', recordedKeys.value)
  }
}

function recordedKeyMaxCheck() {
  if (recordedKeys.value.length >= 12) {
    showMessage(t('index.record_macro_warning'))
    return false
  }
  return true
}

function handleKeyDown(event: any) {
  if (keyMap[event.code]) {
    const now = new Date().getTime()
    const intervalTime = recordedKeys.value.length > 0 ? now - startTime : 10
    startTime = now

    recordedKeyMaxCheck() && recordedKeys.value.push({
      key: keyMap[event.code].text,
      keyCode: keyMap[event.code].value,
      intervalTime,
      keyStatus: keyMap[event.code].type === 1 ? 0xA1 : 1, // 【LShift这类控制键 0xA0: 按下 / 0xA1: 松开】
      type: 1,
    })
  }
}

function handleKeyUp(event: any) {
  if (keyMap[event.code]) {
    const now = new Date().getTime()
    const intervalTime = now - startTime
    startTime = now

    recordedKeyMaxCheck() && recordedKeys.value.push({
      key: keyMap[event.code].text,
      keyCode: keyMap[event.code].value,
      intervalTime,
      keyStatus: keyMap[event.code].type === 1 ? 0xA0 : 0, // 【LShift这类控制键 0xA0: 按下 / 0xA1: 松开】
      type: 0,
    })
  }
}

const keyboardRecordingListScrollPercentage = ref(0)
const keyboardRecordingListRef = ref()

watch(keyboardRecordingListScrollPercentage, () => {
  if (keyboardRecordingListRef.value) {
    const maxScrollTop = keyboardRecordingListRef.value.scrollHeight - keyboardRecordingListRef.value.clientHeight
    keyboardRecordingListRef.value.scrollTo({
      top: ((100 - keyboardRecordingListScrollPercentage.value) / 100) * maxScrollTop,
    })
  }
})
watch(() => recordedKeys.value.length, () => {
  if (isRecording.value) {
    keyboardRecordingListScrollPercentage.value = 0
    if (keyboardRecordingListRef.value) {
      const maxScrollTop = keyboardRecordingListRef.value.scrollHeight - keyboardRecordingListRef.value.clientHeight
      keyboardRecordingListRef.value.scrollTo({
        top: ((100 - keyboardRecordingListScrollPercentage.value) / 100) * maxScrollTop,
      })
    }
  }
})

const inputRecordedKeyRef = ref()
const inputIntervalTimeRef = ref()

function onDblclicRecordedKey(item: RecordedKey) {
  item._editable = 'KEY'
  nextTick(() => {
    inputRecordedKeyRef.value[0].focus()
  })
}

function onKeydownRecordedKey(event: any, item: RecordedKey) {
  event.preventDefault()
  item.key = keyMap[event.code].text
  item.keyCode = keyMap[event.code].value
  if (item.type === 1) { // 按下
    item.keyStatus = keyMap[event.code].type === 1 ? 0xA1 : 1
  }
  else if (item.type === 0) { // 松开
    item.keyStatus = keyMap[event.code].type === 1 ? 0xA0 : 0
  }
}

function onDblclicIntervalTime(item: RecordedKey) {
  item._editable = 'INTERVAL_TIME'
  nextTick(() => {
    inputIntervalTimeRef.value[0].focus()
  })
}

function onblurRecordedKey(item: RecordedKey) {
  item._editable = null
}

const leftHintCode = ref('')
const leftTransitionShow = ref(true)
let leftHintCodeTimer: NodeJS.Timeout = setTimeout(() => {}, 0)
const setLeftHintCode = useThrottleFn((code: string) => {
  if (leftHintCode.value === code)
    return
  clearTimeout(leftHintCodeTimer)
  leftHintCode.value = ''
  leftHintCodeTimer = setTimeout(() => {
    leftHintCode.value = code
    leftTransitionShow.value = false
    nextTick(() => leftTransitionShow.value = true)
  }, 300)
}, 300)

const rightHintCode = ref('')
const rightTransitionShow = ref(true)
let rightHintCodeTimer: NodeJS.Timeout = setTimeout(() => {}, 0)
const setRightHintCode = useThrottleFn((code: string) => {
  if (rightHintCode.value === code)
    return
  clearTimeout(rightHintCodeTimer)
  rightHintCode.value = ''
  rightHintCodeTimer = setTimeout(() => {
    rightHintCode.value = code
    rightTransitionShow.value = false
    nextTick(() => rightTransitionShow.value = true)
  }, 300)
}, 300)

provide('setLeftHintCode', setLeftHintCode)
provide('setRightHintCode', setRightHintCode)

async function onPairingConnection() {
  const connection = async () => {
    const res = await transport.value.send([0x14])
    console.log('配对链接成功===========', res)
    showMessage(t('message.pairing_connection_success'))
  }
  // 监听空格键按下执行配对方法
  const handleSpaceKey = async (event: any) => {
    if (event.code === 'Space') {
      connection()
    }
  }
  window.addEventListener('keydown', handleSpaceKey)
  messageBox.confirm(t('message.pairing_connection'), { container: '.middle-container' })
    .then(connection)
    .finally(() => {
      window.removeEventListener('keydown', handleSpaceKey)
    })
}

async function onRestoreFactorySettings() {
  messageBox.confirm(t('message.restore_factory_settings'), { container: '.middle-container' })
    .then(async () => {
      await transport.value.send([0x10])
      showMessage(t('message.restore_factory_settings_success'))
      setTimeout(() => {
        location.reload()
      }, 1000)
    })
}

function toSettings() {
  router.push('/hid/settings')
}

// 添加宏
async function addMacro() {
  // 停止录制
  if (isRecording.value) {
    onClickPecordBtn()
  }

  if (recordedKeys.value.length === 0) {
    showMessage(t('index.add_macro_warning_1'))
    return
  }

  // 添加第几个宏录制
  let macroIndex = profileInfo.macroList.findIndex(item => item.value.length === 0)
  // 改变第几个宏录制
  if (currentMacroButtonRecordedKeyIndex.value !== undefined) {
    macroIndex = currentMacroButtonRecordedKeyIndex.value
  }

  if (macroIndex === -1) {
    showMessage(t('index.add_macro_warning'))
    return
  }

  const macroName = `Macro ${macroIndex + 1}`

  const data = recordedKeys.value.map((item) => {
    const [_low, _high] = getLowAndHigh8Bits(item.intervalTime)
    return [item.keyCode, item.keyStatus, _high, _low]
  })

  console.log('添加组合键宏球=======', macroIndex + 1)
  await transport.value.send([0x1A + macroIndex, 0x00, recordedKeys.value.length, ...data.flat()])

  console.log('设置宏按键名字=======', macroName)
  const macroNameArrayBuffer = encodeStringToArrayBuffer(macroName)
  await transport.value.send([0x19, 0x00, macroNameArrayBuffer.length, 6 + macroIndex, ...macroNameArrayBuffer])

  profileInfo.macroList[macroIndex].name = macroName
  profileInfo.macroList[macroIndex].value = recordedKeys.value.map(item => ({
    keyCode: item.keyCode,
    keyStatus: item.keyStatus,
    intervalTime: item.intervalTime,
  }))
  recordedKeys.value = []

  nextTick(() => {
    restartConnection()
    onExecutionSuccess()
  })
}

// watch(recordedKeys, () => {
//   console.log('recordedKeys.value========', recordedKeys.value)
// }, {
//   deep: true,
// })

// 录制宏插入
function insertMacro(command: number) {
  const index = recordedKeyHighlightIndex.value === undefined ? recordedKeys.value.length : recordedKeyHighlightIndex.value
  if (recordedKeys.value.length <= 10) {
    if (command === 5) {
      recordedKeys.value.splice(index + 1, 0, { key: 'A', type: 1, keyCode: 4, keyStatus: 1, intervalTime: 10 }, { key: 'A', type: 0, keyCode: 4, keyStatus: 0, intervalTime: 10 },
      )
    }
    else {
      recordedKeys.value.splice(index + 1, 0, { key: mouseButton[command], type: 1, keyCode: command, keyStatus: 0xB1, intervalTime: 10 }, { key: mouseButton[command], type: 0, keyCode: command, keyStatus: 0xB0, intervalTime: 10 },
      )
    }
  }
}

function resetSelectedMacro() {
  currentMacroButtonRecordedKeyIndex.value = void 0
  recordedKeys.value = []
}

function onMacroButtonMouseUp(index: number) {
  if (currentMacroButtonRecordedKeyIndex.value === index) {
    resetSelectedMacro()
  }
  else {
    currentMacroButtonRecordedKeyIndex.value = index
    recordedKeys.value = profileInfo.macroList[index].value.map(item => ({
      key: keyCodeToText(item.keyCode, item.keyStatus),
      type: [0x01, 0xA1, 0xB1].includes(item.keyStatus) ? 1 : 0,
      keyCode: item.keyCode,
      keyStatus: item.keyStatus,
      intervalTime: item.intervalTime,
    }))
  }
}

function keyCodeToText(keyCode: number, keyStatus: number): string {
  // 鼠标按键
  if ([0xB1, 0xB0].includes(keyStatus)) {
    return mouseButton[keyCode]
  }

  // 普通按键 ｜ 快捷键
  let type: number
  if ([0x01, 0x00].includes(keyStatus)) {
    type = 0
  }
  else if ([0xA1, 0xA0].includes(keyStatus)) {
    type = 1
  }
  return Object.entries(keyMap).find(([key, item]) => (item.value === keyCode && item.type === type))?.[1].text || ''
}

/** *********** 录制宏拖拽 start */
const isDragging = ref(false)
const dragIndex = ref<number>()

const dropLinePosition = ref(0)
const dropPosition = ref<'before' | 'after'>('before') // 记录插入位置

function onDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  const listItem = (event.target as HTMLElement).closest('li')
  if (!listItem)
    return

  const rect = listItem.getBoundingClientRect()
  const mouseY = event.clientY

  // 根据鼠标位置决定是放在当前项的上方还是下方
  if (mouseY < rect.top + rect.height / 2) {
    // 放在当前项上方
    dropLinePosition.value = listItem.offsetTop
    dropPosition.value = 'before'
  }
  else {
    // 放在当前项下方
    dropLinePosition.value = listItem.offsetTop + listItem.offsetHeight
    dropPosition.value = 'after'
  }
}

function onDrop(event: DragEvent, dropIndex: number) {
  isDragging.value = false
  dragIndex.value = undefined
  dropLinePosition.value = 0

  const draggedIndex = Number(event.dataTransfer?.getData('text/plain'))

  // 计算实际的插入位置
  let actualDropIndex = dropIndex
  if (dropPosition.value === 'after') {
    actualDropIndex = dropIndex + 1
  }

  // 如果从前往后拖，删除源元素后索引会变小，需要调整
  if (draggedIndex < actualDropIndex) {
    actualDropIndex--
  }

  // 如果最终位置和原始位置相同，不需要移动
  if (draggedIndex === actualDropIndex)
    return

  const temp = recordedKeys.value[draggedIndex]
  recordedKeys.value.splice(draggedIndex, 1)
  recordedKeys.value.splice(actualDropIndex, 0, temp)

  dropPosition.value = 'before' // 重置状态
}

function onDragStart(event: DragEvent, index: number) {
  isDragging.value = true
  dragIndex.value = index
  dropLinePosition.value = 0
  dropPosition.value = 'before' // 初始化状态
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index.toString())
  }
}
/** *********** 录制宏拖拽 end */

function onDisconnect(event: any) {
  if (event.device.productId === transport.value.device.productId && event.device.vendorId === transport.value.device.vendorId) {
    transportWebHID?._s.set('v8', null)
    router.push('/')
  }
}

function onInputReport(uint8ArrayRes: Uint8Array) {
  // 按下鼠标 DPI 物理按钮
  if (uint8ArrayRes[0] === 0x0B) {
    const dpiIndex = uint8ArrayRes[3]
    if (dpiIndex >= 0 && dpiIndex < profileInfo.dpi_slider_list.length) {
      profileInfo.dpi_slider_active_index = dpiIndex
    }
  }
  // 返回充电状态
  else if (uint8ArrayRes[0] === 0x20) {
    chargingStatus.value = uint8ArrayRes[3]
  }
}

useTransportWebHID('v8', async (instance) => {
  transport.value = instance
  console.log('transport.value ======', transport.value)
  if (!transport.value) {
    router.push('/')
    return
  }

  // 监听鼠标主动事件: 如 DPI 物理按钮变化
  transport.value.on('input-all', onInputReport)
  // 监听鼠标断开
  navigator.hid.addEventListener('disconnect', onDisconnect)

  initProfile()
})

onMounted(() => {
  userStore.fetchLatestVersion()
})

onUnmounted(() => {
  transport.value.off('input-all', onInputReport)
  navigator.hid.removeEventListener('disconnect', onDisconnect)
})

// 使用 provide 提供数据
provide<Ref<TransportWebHIDInstance>>('transport', transport)
// 选择鼠标键设置连线透明度0
provide('dotsCleanup', dotsCleanup)
provide('createConnection', createConnection)
</script>

<template>
  <div class="hid-container h-screen min-h-650px min-w-1050px w-screen flex items-center justify-center p-10px">
    <div class="left-container relative h-full w-35%">
      <MacroButton ref="macroButtonRef" v-model="profileInfo.macroList" :selected-index="currentMacroButtonRecordedKeyIndex" class="h-33% w-40% pt-13%" @mouseenter="setLeftHintCode('macro_ball_link')" @mouseup="onMacroButtonMouseUp" />

      <div class="hint-container absolute left-10% top-40% h-15% w-65%">
        <div :class="leftHintCode ? 'w-full bg-white' : 'w-0'" class="absolute left-0% top-0% h-[1px] bg-gray transition-all duration-500" />
        <div :class="leftHintCode ? 'h-full bg-white' : 'h-0'" class="absolute left-0% top-0% w-[1px] bg-gray transition-all duration-500" />
        <div :class="leftHintCode ? 'opacity-100 bg-white top-full' : 'opacity-60 top-10px'" class="absolute bottom--10px left--10px h-20px w-20px rounded-50% bg-gray duration-500" />
        <div :class="leftHintCode ? 'opacity-100 bg-white left-full' : 'opacity-60 left-10px'" class="absolute right--10px top--10px h-20px w-20px rounded-50% bg-gray duration-500" />
        <div class="absolute left--10px top--10px h-20px w-20px rounded-50% bg-white" />

        <transition v-if="leftHintCode" :key="leftHintCode" name="right-fade">
          <div v-if="leftTransitionShow" class="hint-body p-4 text-start">
            <div class="hint-title text-xl leading-8">
              {{ t(`tips.${leftHintCode}.title`) }}
            </div>
            <div class="hint-description color-#606266" v-html="t(`tips.${leftHintCode}.description`)" />
          </div>
        </transition>
      </div>

      <div class="create-macro-container absolute left-10% top-60% h-35% w-70%">
        <div class="absolute left-0 top-0 h-[1px] w-90% bg-white" />
        <div class="absolute right-10% top-0 h-full w-[1px] bg-white" />
        <div class="absolute bottom-0 h-[1px] w-30% bg-white -right-20%" />
        <ElButton class="absolute right-10% top-0 translate-x-1/2 bg-white text-base font-bold -translate-y-1/2" :icon="Plus" color="#e83ff4" plain circle size="small" @mouseenter="setLeftHintCode('macro_save')" @click="addMacro" />
        <ElButton class="absolute bottom-0 right-10% translate-1/2 bg-white text-[25px]" :icon="isRecording ? VideoPause : VideoPlay" color="#e83ff4" plain circle size="large" @mouseenter="setLeftHintCode('macro_recording')" @click="onClickPecordBtn" />
        <div class="absolute left-45% top-25px h-93% -translate-x-1/2">
          <ElSlider v-model="keyboardRecordingListScrollPercentage" vertical :show-tooltip="false" @mouseenter="setLeftHintCode('macro_view')" />
        </div>

        <ElDropdown class="absolute left-45% top-0 -translate-x-1/2 -translate-y-1/2" trigger="click" popper-class="custom-popper custom-dropdown-popper" @mouseenter="setLeftHintCode('insert_macro')" @command="insertMacro">
          <ElButton class="bg-white text-base font-bold" color="#e83ff4" plain :icon="ArrowRight" circle size="small" />
          <template #dropdown>
            <ElDropdownMenu @mouseenter="setLeftHintCode('insert_macro')">
              <ElDropdownItem :command="0">
                {{ t('button.left_button') }}
              </ElDropdownItem>
              <ElDropdownItem :command="1">
                {{ t('button.right_button') }}
              </ElDropdownItem>
              <ElDropdownItem :command="2">
                {{ t('button.middle_button') }}
              </ElDropdownItem>
              <ElDropdownItem :command="3">
                {{ t('button.forward_button') }}
              </ElDropdownItem>
              <ElDropdownItem :command="4">
                {{ t('button.back_button') }}
              </ElDropdownItem>
              <ElDropdownItem :command="5">
                {{ t('button.keyboard_key') }}
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>

        <div ref="keyboardRecordingListRef" class="keyboard-recording-list hide-scrollbar absolute left-5% top-0 mt-2 h-full overflow-auto">
          <ul class="relative text-start color-#fff leading-7" @mouseenter="setLeftHintCode('macro_revise')">
            <div v-if="isDragging" class="absolute z-10 h-[2px] w-full bg-blue-500 transition-all duration-200" :style="{ top: `${dropLinePosition}px` }" />
            <li v-for="(item, index) in recordedKeys" :key="index" class="group relative mb-1 flex border-1 border-#000 rounded-lg px-2 hover:border-#fff" :class="{ 'border-#fff': recordedKeyHighlightIndex === index, 'border-blue-500': isDragging && dragIndex === index }" draggable="true" @click="recordedKeyHighlightIndex = index" @dragstart="onDragStart($event, index)" @dragover="onDragOver($event, index)" @dragenter.prevent @drop="onDrop($event, index)">
              <ElIcon size="20" class="mr-2 mt-1">
                <Download v-if="item.type" />
                <Upload v-else />
              </ElIcon>
              <div>
                <div @dblclick="onDblclicRecordedKey(item)">
                  <input v-if="item._editable === 'KEY'" ref="inputRecordedKeyRef" type="text" :value="item.key" class="hide-focus-visible w-[70px] border-0 border-b-1" @keydown="(event) => onKeydownRecordedKey(event, item)" @blur="onblurRecordedKey(item)">
                  <span v-else>{{ item.key }}</span>
                </div>
                <div @dblclick="onDblclicIntervalTime(item)">
                  <input v-if="item._editable === 'INTERVAL_TIME'" ref="inputIntervalTimeRef" v-model.number="item.intervalTime" type="text" class="hide-focus-visible w-[70px] border-0 border-b-1" @blur="onblurRecordedKey(item)">
                  <span v-else>{{ item.intervalTime }}ms</span>
                </div>
              </div>
              <ElIcon size="20" class="absolute bottom--5px left-2 cursor-pointer opacity-0 -translate-y-1/2 hover:text-red-500 group-hover:opacity-100" @click.stop="recordedKeys.splice(index, 1)">
                <Close />
              </ElIcon>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="middle-container relative h-full w-23% flex flex-col items-center">
      <div class="relative h-60%">
        <img class="h-full pt-10%" :class="['', 'opacity-20', 'opacity-30'][profileInfo.sports_arena]" src="/mouse1.png" alt="mouse-card" draggable="false">
        <img class="absolute right-8px top-26% w-100%" :src="`/sports_arena_${profileInfo.sports_arena}.png`" alt="sports_arena" draggable="false">
        <img class="absolute top-0 h-full transform pt-10%" src="/mouse3.png" :class="['', 'opacity-20', 'opacity-30'][profileInfo.sports_arena]" alt="mouse-card" draggable="false" :style="{ transform: `rotate(${profileInfo.angle_slider}deg)` }">
        <div v-if="[1, 2].includes(profileInfo.sports_arena)" class="custom-message-container absolute top-70.4% w-100%">
          <div class="custom-message-container-text">
            {{ t(`index.sports_arena_${profileInfo.sports_arena}`) }}
          </div>
        </div>
        <MouseButton ref="mouseButtonRef" :value="mouseButtonValue" class="absolute right-0 top-0 h-full w-160%" @mouseenter="setLeftHintCode('button_ball')" @change="onMouseButtonChange" />
      </div>

      <!-- :labelTransform="angleSliderLabelTransform" -->
      <CustomSlider
        v-model="profileInfo.angle_slider"
        class="relative mt-26 w-50%"
        :bind="sliderOptions.angle_slider"
        :default-select-options="sliderDefaultSelectOptions.angle_slider"
        @mouseenter="setRightHintCode('angle')"
        @change="sendAngle"
      />

      <ElProgress class="mt-15 w-40%" color="#67c23a" :percentage="profileInfo.battery_level" />

      <div v-if="chargingStatus === 1" class="h-8 w-8" :class="profileInfo.battery_level == 100 ? 'color-green-500' : 'color-yellow-500'" draggable="false">
        <svg t="1751002332004" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="9714"><path d="M568 171.84v285.312h144.64a12.8 12.8 0 0 1 10.816 19.648l-243.84 382.208a12.8 12.8 0 0 1-23.616-6.848V566.848h-144.64a12.8 12.8 0 0 1-10.816-19.648l243.84-382.208a12.8 12.8 0 0 1 23.616 6.848z" fill="currentColor" fill-opacity=".88" p-id="9715" /></svg>
      </div>

      <div class="absolute bottom-[75px]">
        <ElAlert v-if="userStore.alertTitle" :title="userStore.alertTitle" type="success" :closable="false" :center="true" />
      </div>

      <img class="mt-8 w-[50px] cursor-pointer" :class="profileInfo.sports_arena ? 'opacity-100' : 'opacity-30 hover:opacity-100'" :src="['/sports_arena_icon_0.png', '/sports_arena_icon_1.png', '/sports_arena_icon_2.png'][profileInfo.sports_arena]" alt="sports_arena" draggable="false" @mouseenter="setRightHintCode('sports_arena')" @click="onSportsMode">
    </div>

    <div class="right-container relative h-full w-42%">
      <div class="relative h-full w-full">
        <div class="absolute left-16% top-5% h-90% w-[1px] bg-white" />
        <div class="absolute bottom-31% left-0 h-[1px] w-75% bg-white -translate-y-[15.5px]" />
        <div class="absolute bottom-14% left-16% h-[1px] w-45% bg-white -translate-y-[15.5px]" />

        <div class="hint-container absolute right-10% top-2% h-25% w-65%">
          <div :class="rightHintCode ? 'w-full bg-white' : 'w-0'" class="absolute right-0% top-0% h-[1px] bg-gray transition-width duration-500" />
          <div :class="rightHintCode ? 'h-full bg-white' : 'h-0'" class="absolute right-0% top-0% w-[1px] bg-gray transition-height duration-500" />
          <div :class="rightHintCode ? 'opacity-100 bg-white right-full' : 'opacity-60 right-10px'" class="absolute top--10px h-20px w-20px rounded-50% bg-gray transition-all duration-500" />
          <div :class="rightHintCode ? 'opacity-100 bg-white top-full' : 'opacity-60 top-10px'" class="absolute bottom--10px right--10px h-20px w-20px rounded-50% bg-gray transition-all duration-500" />
          <div class="absolute right--10px top--10px h-20px w-20px rounded-50% bg-white" />

          <transition v-if="rightHintCode" :key="rightHintCode" name="left-fade">
            <div v-if="rightTransitionShow" class="hint-body p-4 text-start">
              <div class="hint-title text-xl leading-8">
                {{ t(`tips.${rightHintCode}.title`) }}
              </div>
              <div class="hint-description color-#606266" v-html="t(`tips.${rightHintCode}.description`).replace(/\\n/g, '<br/>')" />
            </div>
          </transition>
        </div>

        <div class="profile-container absolute left-0 top-25% h-20% w-full" @mouseenter="setRightHintCode('profile_select')">
          <ProfileList :value="profileInfo" :current-profile-index="active_profile_index" :profile-list="profileList" @mouseenter-share="setRightHintCode('clone')" @change="setProfile" />
        </div>

        <!-- top -->
        <CustomSlider
          v-model="profileInfo.jitter_elimination_slider"
          class="transparent-slider absolute left-16% top-5% h-10% -translate-x-49%"
          :bind="sliderOptions.jitter_elimination_slider"
          :default-select-options="sliderDefaultSelectOptions.jitter_elimination_slider"
          :vertical="true"
          @mouseenter="setRightHintCode('jitter_elimination')"
          @change="sendJitterElimination"
        />

        <!-- right -->
        <div class="transparent-slider" @mouseenter="setRightHintCode('dpi')">
          <CustomSlider
            v-for="(_, index) in profileInfo.dpi_slider_list"
            :key="index"
            v-model="profileInfo.dpi_slider_list[index]"
            class="dpi_slider absolute bottom-31% left-20% w-55%"
            :class="{ 'dpi_slider-active': profileInfo.dpi_slider_active_index === index }"
            :bind="sliderOptions.dpi_slider"
            :default-select-options="sliderDefaultSelectOptions.dpi_slider"
            :double-click-edit="true"
            @change="sendDpi(index)"
          />
          <!-- del num add -->
          <ElInputNumber v-model="profileInfo.dpi_length" class="dpi-edit-button absolute bottom-31.5% left-78%" :min="1" :max="5" size="small" :disabled="dpi_progress" @change="sendDpiLength" />
        </div>

        <!-- left -->
        <CustomSliderLabel
          v-model="profileInfo.polling_slider"
          class="transparent-slider absolute bottom-31% left-0 w-12%"
          :bind="sliderOptions.polling_slider"
          :default-select-options="sliderDefaultSelectOptions.polling_slider"
          @mouseenter="setRightHintCode('polling')"
          @change="sendPolling"
        />

        <!-- bottom-right -->
        <CustomSlider
          v-model="profileInfo.hibernation_slider"
          class="transparent-slider absolute bottom-14% left-20% w-40%"
          :bind="sliderOptions.hibernation_slider"
          :default-select-options="sliderDefaultSelectOptions.hibernation_slider"
          @mouseenter="setRightHintCode('hibernation')"
          @change="sendHibernation"
        />

        <!-- bottom -->
        <CustomSliderLabel
          v-model="profileInfo.lod_slider"
          class="transparent-slider absolute bottom-5% left-16% h-8% -translate-x-49%"
          :bind="sliderOptions.lod_slider"
          :default-select-options="sliderDefaultSelectOptions.lod_slider"
          :vertical="true"
          @mouseenter="setRightHintCode('lod')"
          @change="sendLod"
        />

        <div class="absolute bottom-3% right-5% w-50% flex justify-around">
          <img src="/motion_sync.png" :class="profileInfo.motion_sync ? 'opacity-100' : 'opacity-30 hover:opacity-100'" class="drag-none h-[40px] w-[40px] cursor-pointer" alt="motion_sync" @mouseenter="setRightHintCode('motion_sync')" @click="onMotionSync">
          <img src="/pairing_connection.png" alt="pairing_connection" class="drag-none h-[40px] w-[40px] color-#fff opacity-30 hover:opacity-100" @mouseenter="setRightHintCode('pairing_connection')" @click="onPairingConnection">
          <img src="/restore_factory_settings.png" alt="restore_factory_settings" class="drag-none h-[40px] w-[40px] color-#fff opacity-30 hover:opacity-100" @mouseenter="setRightHintCode('restore_factory_settings')" @click="onRestoreFactorySettings">
          <ElBadge :value="userStore.latestVersion.version > (`${profileInfo.version}`) ? 'new' : ''">
            <ArrowRightBold class="w-[40px] color-#fff font-900 opacity-30 hover:opacity-100" @mouseenter="setRightHintCode('admin_page')" @click="toSettings" />
          </ElBadge>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.hid-container {
  --el-color-primary: #fff;

  .el-slider {
    --el-border-color-light: #fff;
    --el-slider-height: 1px;
  }
  .el-slider__button {
    --el-slider-main-bg-color: #fff;
  }
  /* 滑块颜色 */
  .el-slider__button-wrapper {
    --el-slider-button-wrapper-offset: -17.5px;
  }

  .middle-container {
    .el-progress__text {
      position: absolute;
      top: -30px;
      left: 50%;
      margin-left: 0;
      transform: translateX(-50%);
    }
  }

  .middle-container::after {
    content: '';
    display: table;
    clear: both;
  }

  .dpi_slider {
    /* .el-slider__stop {
      width: 16px;
      height: 16px;
      transform: translate(-50%, -50%);
      background-color: #9da3ae;
    } */
    .el-slider__button {
      width: 20px;
      height: 20px;
      background-color: #9da3ae;
    }
  }
  .dpi_slider-active {
    .el-slider__button-wrapper {
      z-index: 100;
    }
    .el-slider__button {
      width: 20px;
      height: 20px;
      background-color: #fff;
    }
  }
  .dpi-edit-button {
    width: 80px;
    .el-input {
      width: 80px;
      pointer-events: none;
    }
  }

  .transparent-slider {
    .el-slider__runway {
      background-color: transparent;
    }
    .el-slider__bar {
      background-color: transparent;
    }
  }
}

.middle-container {
  position: relative;

  .el-message {
    position: absolute;
    width: 100%;
    max-width: none;

    .el-message__content {
      width: 100%;
    }
  }

  .message-box-mask {
    min-width: 1050px;

    .custom-message-container {
      width: 18%;
      left: -4%;
    }
  }
}

.custom-dropdown-popper {
  left: calc(100vw * 0.35 * 0.5) !important;
}
</style>
