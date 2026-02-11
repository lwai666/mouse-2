<script setup lang="ts">
import type { DraggableChart } from '~/composables/useDraggableChart'

import type { Macro, ProfileInfoType } from '~/types'

import type { TransportWebHIDInstance } from '~/utils/hidHandle'
import { ArrowDownBold, ArrowRightBold, Close, Delete, Download, Minus, Plus, Share, Upload } from '@element-plus/icons-vue'

import { useClipboard } from '@vueuse/core'
import autofit from 'autofit.js'

// 引入柱状图图表，图表后缀都为 Chart
import { LineChart } from 'echarts/charts'

// 引入标题，提示框，直角坐标系，数据集，内置数据转换器组件，组件后缀都为 Component
import { DatasetComponent, GraphicComponent, GridComponent, TitleComponent, TooltipComponent, TransformComponent, VisualMapComponent } from 'echarts/components'

// 引入 echarts 核心模块，核心模块提供了 echarts 使用必须要的接口。
import * as echarts from 'echarts/core'

// 标签自动布局、全局过渡动画等特性
import { LabelLayout, UniversalTransition } from 'echarts/features'
// 引入 Canvas 渲染器，注意引入 CanvasRenderer 或者 SVGRenderer 是必须的一步
import { CanvasRenderer } from 'echarts/renderers'
import { ElButton, ElDropdown, ElDropdownItem, ElDropdownMenu, ElIcon, ElInput, ElLoading, ElProgress, ElScrollbar, ElSlider, ElSpace } from 'element-plus'

import { useGlobalInputListener } from '~/composables/useGlobalInputListener.ts'

import { loadLanguageAsync } from '~/modules/i18n'
import { base64ToJson, checkProfile, chunkArray, combineLowAndHigh8Bits, decodeArrayBufferToArray, decodeArrayBufferToString, encodeStringToArrayBuffer, getLowAndHigh8Bits, insertAt9th, jsonToBase64, mapHexToRange, mapRangeToHex, processArrayToObject, removeAt9th } from '~/utils'
import { connectAndStoreDevice, keyMap, transportWebHID, useTransportWebHID } from '~/utils/hidHandle'

const { t, locale } = useI18n()

// console.log('Mouse position:', handleMouseMove())

// 注册必须的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  GraphicComponent,
  LineChart,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  VisualMapComponent,
])

export type MouseButtonType = 'Left' | 'Right' | 'Wheel' | 'Forward' | 'Back' | 'dpi'

const mouseButton: MouseButtonType[] = ['Left', 'Right', 'Wheel', 'Forward', 'Back', 'dpi']

const router = useRouter()
const userStore = useUserStore()

const transport = ref()

const constants = useConstants(t)

const chargingStatus = ref(0) // 充电状态 0:未充电，1:充电中

let loading = { close: () => {} }

// 当前修改的录制宏下标
const currentMacroButtonRecordedKeyIndex = ref()

const sliderDefaultSelectOptions = {
  jitter_elimination_slider: [
    { label: '6ms', value: 6 },
    { label: '4ms', value: 4 },
    { label: '2ms', value: 2 },
    { label: '0ms', value: 0 },
  ],
  polling_slider: [
    { label: '1000', value: 3 },
    { label: '2000', value: 4 },
    { label: '4000', value: 5 },
    { label: '8000', value: 6 },

    // { label: '500', value: 2 },
    // { label: '250', value: 1 },
    // { label: '125', value: 0 },
  ],
  dpi_slider: [
    { label: '3200', value: 3200 },
    { label: '2400', value: 2400 },
    { label: '1400', value: 1400 },
    { label: '800', value: 800 },
  ],
  hibernation_slider: [
    { label: '90s', value: 90 },
    { label: '60s', value: 60 },
    { label: '30s', value: 30 },
    { label: '10s', value: 10 },
  ],
  lod_slider: [
    { label: '0.7mm', value: 0 },
    { label: '1mm', value: 1 },
    { label: '2mm', value: 2 },
  ],
  // angle_slider: [{ label: '-30', value: 1 },{ label: '-10', value: 2 },{ label: '0', value: 3 },{ label: '15', value: 4 },{ label: '30', value: 5 }],
  angle_slider: [
    { label: '5°', value: 5 },
    { label: '20°', value: 20 },
    // { label: '15°', value: 15 },
    // { label: '30°', value: 30 },
  ],
}
const sliderOptions = {
  jitter_elimination_slider: { min: 0, max: 6, step: 2 },
  polling_slider: { min: 0, max: 6, step: 1 },
  dpi_slider: { min: 100, max: 30000, step: 50 },
  hibernation_slider: { min: 30, max: 500, step: 10 },
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
    ], // cycleTimes: 0-40（循环次数）, cycleMode: 1-4(循环直到此按键松开，循环直到任意按键按下，循环直到此按键再次按下，循环次数模式)      // { name: '鼠标宏名称1', connections: [{keyid: 'Left', cycleTimes: 40, cycleMode: 1}], value: [{ keyCode: 1, keyStatus: 0, intervalTime: 200 }] },    ] as Macro[],

    // 高级-灵敏度开关
    sensitivity: 0,
    // 直线修正
    lineUpdate: 0,
    // 20K采样率
    FPS: 0,
    // XY DPI 开关
    DPIStartList: [0, 0, 0, 0, 0],

    // XY 每一个档位的 XY值 {0:[400,400],1:[400,400]} - 控制XY拖动
    XYObjDataList: {
      0: [100, 100],
      1: [100, 100],
      2: [100, 100],
      3: [100, 100],
      4: [100, 100],
    } as { [key: number]: number[] },

    // 动态灵敏度折线图
    sensitivityLineData: [],

    // 鼠标当前选中模版状态
    sensitivityModeIndex: 0,

    xAxisMax: 70,
    yAxisMax: 1.5,

    // 鼠标链接状态

    mouseConnectionStatus: 0,

    // 鼠标颜色

    mouseColor: 3,

  }
}

const localeStr = ref(null)
// const initData = ref([])

const initData = ref([])

const XYObjDataList = ref<{ [key: number]: number[] }>({
  0: [100, 100],
  1: [100, 100],
  2: [100, 100],
  3: [100, 100],
  4: [100, 100],
})

// 折线图-经典
const lineDataMap = {
  // 经典-0
  0: [
    [0, 1.0],
    [17.5, 1.1],
    [35, 1.2],
    [52.5, 1.3],
    [70, 1.4],
  ],
  // 折线图-自然
  1: [
    [0, 1.0],
    [10, 1.45],
    [22, 1.5],
    [32, 1.5],
    [70, 1.5],
  ],
  // 折线图-跳跃
  2: [
    [0, 1.0],
    [11, 1.0],
    [24, 1.5],
    [28, 1.5],
    [70, 1.5],
  ],
  // 自定义-无
  3: [
    [0, 1.0],
    [20, 1.0],
    [30, 1.1],
    [50, 1.3],
    [70, 1.5],
  ],
  // 自定义-经典-4
  4: [
    [0, 1.0],
    [15, 1.06],
    [35, 1.14],
    [70, 1.28],
    [100, 1.4],
  ],
  // 自定义-自然-5
  5: [
    [0, 1.0],
    [10, 1.45],
    [22, 1.5],
    [32, 1.5],
    [100, 1.5],
  ],
  // 自定义-跳跃-6
  6: [
    [0, 1.0],
    [11, 1.0],
    [24, 1.5],
    [28, 1.5],
    [100, 1.5],
  ],
} as Record<number, [number, number][]>

const profileInfo = reactive(initProfileInfo())

provide < ProfileInfoType > ('profileInfo', profileInfo)
provide('language', localeStr)

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

let profileList = reactive([
  { title: 'Profile 1', base64: '', uint8Array: [], value: undefined },
  { title: 'Profile 2', base64: '', uint8Array: [], value: undefined },
  { title: 'Profile 3', base64: '', uint8Array: [], value: undefined },
  { title: 'Profile 4', base64: '', uint8Array: [], value: undefined },
])

const active_profile_index = ref(0)

async function setProfileInfo(index: number, flag: boolean) {
  if (profileList[active_profile_index.value].value && !flag) {
    profileList[active_profile_index.value].value = JSON.parse(JSON.stringify(profileInfo))
  }

  active_profile_index.value = index

  // 有缓存数据则直接使用
  if (profileList[index].value) {
    Object.assign(profileInfo, JSON.parse(JSON.stringify(profileList[index].value)))
    XYObjDataList.value = profileInfo.XYObjDataList
  }
  // 没有缓存数据则使用获取到的 uint8Array 数据
  else {
    Object.assign(profileInfo, uint8ArrayToProfileInfo(profileList[active_profile_index.value].uint8Array))
    profileList[active_profile_index.value].base64 = insertAt9th(jsonToBase64(profileInfo), 'd')
    profileList[active_profile_index.value].value = JSON.parse(JSON.stringify(profileInfo))
    XYObjDataList.value = profileInfo.XYObjDataList
  }

  // 创建连线监听
  // nextTick(restartConnection)
}

function uint8ArrayToProfileInfo(uint8Array: Uint8Array[]) {
  const profileInfo = initProfileInfo()

  uint8Array.forEach((res) => {
    // 获取 profile 基础配置信息
    if (res[0] === 1) {
      const start_index = 3
      const dpi_slider_active_index = res[start_index + 2]
      const dpi_length = res[start_index + 3]

      const dpi_data_length = 5 * 2
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
      const angle = mapHexToRange(res[31]) // 0xE2-0xFF（-30,-1） 和 0x00-0x1E (0, 30)     以前的：[-30, -10, 0, 15, 30] 角度 1-61 表示 -30度 ～ 30度

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

    // XY 值
    else if (res[0] === 35) {
      const XYDataList = res.slice(4, (res[2] * 4) + 4)
      const dataObj = processArrayToObject(decodeArrayBufferToArray(XYDataList), 4)
      profileInfo.XYObjDataList = Object.assign(profileInfo.XYObjDataList, dataObj)
      XYObjDataList.value = JSON.parse(JSON.stringify(Object.assign(profileInfo.XYObjDataList, dataObj)))
    }

    // 灵敏度&速度开关 0 为关，1 为开
    else if (res[0] === 36) {
      const start_index = 3
      const sensitivity = res[start_index]
      profileInfo.sensitivity = sensitivity
      if (profileInfo.sensitivity === 1 && activeBg.value === 'advanced') {
        nextTick(() => {
          initEcharts()
        })
      }
    }

    // DPD XY轴开关
    else if (res[0] === 37) {
      const DPIStartList = res.slice(3, 3 + res[2])
      profileInfo.DPIStartList = decodeArrayBufferToArray(DPIStartList)
    }

    // 折线图
    else if (res[0] === 38) {
      profileInfo.sensitivityModeIndex = res[3]
      profileInfo.yAxisMax = res[4] / 10
      profileInfo.xAxisMax = combineLowAndHigh8Bits(res[5], res[6])

      // 如果模版是自定义，则使用自定义数据
      if (profileInfo.sensitivityModeIndex === 3) {
        const sensitivityLineDataList = res.slice(7, 7 + res[2])
        initData.value = chunkArray(decodeArrayBufferToArray(sensitivityLineDataList), 2, (a, b) => [a, b / 10]) as any
        // 存着用于分享
        profileInfo.sensitivityLineData = initData.value
        return
      }
      initData.value = lineDataMap[profileInfo.sensitivityModeIndex] as any
      // 存着用于分享
      profileInfo.sensitivityLineData = initData.value
    }

    // 20K采样率开关 0 为关，1 为开
    else if (res[0] === 39) {
      const start_index = 3
      const FPS = res[start_index]
      profileInfo.FPS = FPS
    }

    // 直线修正开关 0 为关，1 为开
    else if (res[0] === 40) {
      const start_index = 3
      const lineUpdate = res[start_index]
      profileInfo.lineUpdate = lineUpdate
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
      console.log(data, '宏按键返回')
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
      });
      (profileInfo.macroList[res[0] - 26].value as any).push(...recordedKey)
    }
  })

  return profileInfo
}

function profileInfoToUint8Array(profileInfo: any): Uint8Array[] {
  const uint8Array: Uint8Array[] = []
  // 获取 profile 基础配置信息：0
  let uint8Array0: number[] = []
  const fillArray = arr => arr.concat(Array.from({ length: Math.max(0, 5 - arr.length) }).fill(0))
  const dpi_data = fillArray(profileInfo.dpi_slider_list).reduce((arr: number[], item: number) => {
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
      // 分包发送
      // 52 字节一个包 code + status + high + low 一个按键是 4个字节 52 刚好够除, 加上 id 索引 length   发送状态 Checksum
      const num = Math.ceil(recordedKey!.flat()!.length / 56)
      for (let i = 0; i < num; i++) {
        const index = num - 1 - i
        const sendData = recordedKey!.flat()!.slice(i * 56, (i + 1) * 56)
        uint8Array.push(transport.value.generatePacket(new Uint8Array([0x1A + macroIndex, index, sendData.length / 4, ...sendData])))
      }
    }
  })

  // 获取宏录制名字:  (6-9 录制宏（球1-球4）| @todo: 0x0a-0x0d（profile 名字）)
  profileInfo.macroList.forEach((macro: Macro, macroIndex: number) => {
    if (macro.name) {
      const macroName = encodeStringToArrayBuffer(macro.name)
      uint8Array.push(transport.value.generatePacket(new Uint8Array([0x19, 0, macroName.length, macroIndex + 6, ...macroName])))
    }
  })

  // 高级-灵敏度开关
  uint8Array.push(transport.value.generatePacket(new Uint8Array([0x24, 0x00, 0x00, Number(profileInfo.sensitivity)])))

  // 直线修正
  uint8Array.push(transport.value.generatePacket(new Uint8Array([0x28, 0x00, 0x00, profileInfo.lineUpdate])))

  // 20K采样率
  uint8Array.push(transport.value.generatePacket(new Uint8Array([0x27, 0x00, 0x00, profileInfo.FPS])))

  // XY DPI 开关
  uint8Array.push(transport.value.generatePacket(new Uint8Array([0x25, 0x00, profileInfo.dpi_slider_list.length, ...profileInfo.DPIStartList])))

  // XY 每一个档位的 XY值 {0:[400,400],1:[400,400]}
  const currentLowAndHigh8 = Object.values(profileInfo.XYObjDataList).map((item: any) => {
    return [...getLowAndHigh8Bits(item[0]), ...getLowAndHigh8Bits(item[1])]
  })
  uint8Array.push(transport.value.generatePacket(new Uint8Array([0x23, 0x00, 5, profileInfo.dpi_slider_active_index, ...currentLowAndHigh8.flat()])))

  // 动态灵敏度折线图

  if (profileInfo.sensitivityLineData.length) {
    // 存起来的折线图数据需要格式化之后才能发给硬件
    const formatData = profileInfo.sensitivityLineData.map((item: any) => {
      return [Number(Math.ceil(item[0])), Number(Math.ceil(item[1] * 10))]
    })
    const xAxisMax = getLowAndHigh8Bits(profileInfo.xAxisMax)

    uint8Array.push(transport.value.generatePacket(new Uint8Array([0x22, 0, 5, Number(profileInfo.sensitivityModeIndex), profileInfo.yAxisMax * 10, ...xAxisMax, ...formatData.flat()])))
  }

  // 当前第几个配置
  // uint8Array.push(transport.value.generatePacket(new Uint8Array([0x1E, 0x00, 0x01, active_profile_index.value])))

  // 结束包
  // uint8Array.push(transport.value.generatePacket(new Uint8Array([0])))

  return uint8Array
}

/** **************** 连线逻辑 start */

const mouseButtonRef = ref()

// 离开页面删除连线
onBeforeRouteLeave(() => {

})

function restartConnection() {

}

async function initProfile() {
  await getProfile()
  await getVersion()

  await sendChargingStatus() // 获取充电状态
  await sendMouseConnectionStatus()
  await sendMouseColor()
}

// 四个配置的数据

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
      setTimeout(() => {
        base64.value = profileList[active_profile_index.value].base64
      }, 500)
      // const isCurrentProfile = active_profile_index.value === profile_index
    }

    setTimeout(() => {
      reject()
    }, 6000)
  })
}

// 粘贴分享设置 Profile
async function setProfile(index: number, type: string) {
  if (index === active_profile_index.value && type === 'top') { return }

  let profileInfo = ''

  try {
    profileInfo = base64ToJson(removeAt9th(base64.value))
  }
  catch (e) {
    console.error('格式错误=======', e)
  }

  // 重置选中的宏
  resetSelectedMacro()

  const newProfileInfo = profileInfo

  // 切换 Profile
  if (index !== undefined) {
    await transport.value.send([0x1E, 0x00, 0x01, index])

    // 如果当前 profile 有缓存数据，则直接使用
    if (profileList[index].uint8Array?.length > 0) {
      setProfileInfo(index)
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

  profileList[active_profile_index.value].value = newProfileInfo

  // 用于回显折线图
  if (newProfileInfo.sensitivityLineData.length) {
    initData.value = newProfileInfo.sensitivityLineData
    nextTick(() => {
      initEcharts()
    })
  }

  setProfileInfo(active_profile_index.value, true)
  setLoadingStatus(t('message.profile_success'))
}

function onExecutionSuccess() {
  setLoadingStatus(t('message.execution_success'))
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
  // nextTick(() => setTimeout(restartConnection, 400))
}

/** 发送设置组合键宏 */
async function sendConnectionMacro(id: MouseButtonType, value: number, data: { cycleTimes: number, cycleMode: number, macroIndex: number }) {
  console.log(id, value, data, 'datadata')
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

  if (profileInfo.dpi_slider_active_index !== index) {
    // eslint-disable-next-line ts/no-use-before-define
    dpi_slider_edit.value = null
    // eslint-disable-next-line ts/no-use-before-define
    dpi_slider_value.value = ''
  }

  if (index !== undefined) {
    profileInfo.dpi_slider_active_index = index
  }

  // [设置类型，发多少条消息，后面传入数据长度，当前DPI挡位下标， DPI挡位个数， DPI挡位1(低8位)，DPI挡位1(高8位)，...]
  await transport.value.send([0x0A, 0x00, 2 + list.length, profileInfo.dpi_slider_active_index, dpi_length, ...list])

  dpi_progress.value = false

  // if (index !== undefined) {
  //   profileInfo.XYObjDataList[profileInfo.dpi_slider_active_index][0] = profileInfo.dpi_slider_list[profileInfo.dpi_slider_active_index]
  //   XYObjDataList.value[profileInfo.dpi_slider_active_index][0] = profileInfo.dpi_slider_list[profileInfo.dpi_slider_active_index]
  // }

  onExecutionSuccess()
}
// newLength: number | undefined, oldLength: number | undefined
// Dpi加减
async function sendDpiLength(type) {
  if (dpi_progress.value) {
    return
  }

  if ((type === 'add' && profileInfo.dpi_slider_list.length === 5) || (type === 'minu' && profileInfo.dpi_slider_list.length === 1)) {
    return
  }

  const oldLength = profileInfo.dpi_slider_list.length
  const newLength = type === 'add' ? profileInfo.dpi_slider_list.length + 1 : profileInfo.dpi_slider_list.length - 1

  const default_dpi_slider_list = [400, 800, 1600, 3200, 6400]
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

/** 设置回报率 */
async function sendPolling(value: any) {
  if (profileInfo.polling_slider === value) {
    return
  }

  await transport.value.send([0x0C, 0x00, 0x01, value])

  onExecutionSuccess()

  profileInfo.polling_slider = value

  if (value < 5) {
    // 关闭竞技模式
    profileInfo.sports_arena === 1 && onSportsMode(0, true)
    // 关闭 20K FPS
    profileInfo.FPS && radioChange()
  }
}

/** 设置进入休眠时间 */
async function sendHibernation() {
  const byte = profileInfo.hibernation_slider * 1000
  await transport.value.send([0x15, 0x00, 0x04, ...[byte & 0xFF, byte >> 8 & 0xFF, byte >> 16 & 0xFF, byte >> 24 & 0xFF]])
  onExecutionSuccess()
}

function XYEliminationChange(index: number) {
  const xNum = profileInfo.XYObjDataList[index][0]
  const yNum = profileInfo.XYObjDataList[index][1]

  profileInfo.XYObjDataList[index] = [xNum + (Math.abs(50 - xNum % 50)), yNum + (Math.abs(50 - yNum % 50))]

  XYObjDataList.value = JSON.parse(JSON.stringify(profileInfo.XYObjDataList))
}

async function sendXYElimination() {
  profileInfo.XYObjDataList = JSON.parse(JSON.stringify(XYObjDataList.value))

  const currentLowAndHigh8 = Object.values(profileInfo.XYObjDataList).map((item) => {
    return [...getLowAndHigh8Bits(item[0]), ...getLowAndHigh8Bits(item[1])]
  })

  await transport.value.send([0x23, 0x00, 5, profileInfo.dpi_slider_active_index, ...currentLowAndHigh8.flat()])
  onExecutionSuccess()
}

/** 设置静默高度 */
async function sendLod(index: number) {
  profileInfo.lod_slider = index
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
async function onSportsMode(type: any, flag: boolean) {
  // const sports_arena = profileInfo.sports_arena === 0 ? 1 : 0

  type === 1 && await sendPolling(6)

  await transport.value.send([0x12, 0x00, 0x01, type])

  profileInfo.sports_arena = type

  // eslint-disable-next-line ts/no-use-before-define
  bottomItem.value = 0
  !flag && onExecutionSuccess()
}

// 获取充电状态 0:不充电  1：充电
async function sendChargingStatus() {
  const res = await transport.value.send([0x20])
  chargingStatus.value = res[3]
}

// 获取鼠标连接状态 0 为断线，1 为连接
async function sendMouseConnectionStatus() {
  const res = await transport.value.send([0x2A])
  profileInfo.mouseConnectionStatus = res[3]

  res[3] === 0 && ElLoading.service({
    lock: true,
    text: '',
    spinner: 'none',
    background: 'rgba(0, 0, 0, 0.7)',
  })
}

const transportList = ref(JSON.parse(localStorage.getItem('transportList') || JSON.stringify([])))

// 获取鼠标颜色 1：红色 ，2：黄色 3：黑色 4：白色，后面再增加颜色继续往后移
async function sendMouseColor() {
  const res = await transport.value.send([0x2B])
  profileInfo.mouseColor = res[3]

  transportList.value = transportList.value.map((item: any) => {
    if (item.reportId === transport.value.reportId) {
      item.mouseColor = profileInfo.mouseColor
    }
    return item
  })
  localStorage.setItem('transportList', JSON.stringify(transportList.value))
}

// 底部功能区

async function onMotionSync() {
  await transport.value.send([0x16, 0x00, 0x01, Number(!profileInfo.motion_sync)])
  profileInfo.motion_sync = !profileInfo.motion_sync
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
  if (recordedKeys.value.length >= 64) {
    setLoadingStatus(t('index.record_macro_warning'))
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
  // const connection = async () => {
  //   const res = await transport.value.send([0x14])
  //   console.log('配对链接成功===========', res)
  //   setLoadingStatus(t('message.pairing_connection_success'))
  //   // eslint-disable-next-line ts/no-use-before-define
  //   window.removeEventListener('keydown', handleSpaceKey)
  // }
  // // 监听空格键按下执行配对方法
  // const handleSpaceKey = async (event: any) => {
  //   if (event.code === 'Space') {
  //     connection()
  //   }
  // }
  // window.addEventListener('keydown', handleSpaceKey)

  // connection()
  // window.removeEventListener('keydown', handleSpaceKey)
}

async function onRestoreFactorySettings() {
  await transport.value.send([0x10])
  setLoadingStatus(t('message.restore_factory_settings_success'))
  setTimeout(() => {
    location.reload()
  }, 1000)
}

function toSettings() {
  router.push('/hid/settings')
}

// 新建宏
async function addMacroFn() {
  // 停止录制
  if (isRecording.value) {
    onClickPecordBtn()
  }

  // 添加第几个宏录制
  const macroIndex = profileInfo.macroList.findIndex(item => !item.name)

  if (macroIndex === -1) {
    setLoadingStatus(t('index.add_macro_warning'))
    return
  }

  const macroName = `Macro ${macroIndex + 1}`

  const data = recordedKeys.value.map((item: any) => {
    const [_low, _high] = getLowAndHigh8Bits(item.intervalTime)
    return [item.keyCode, item.keyStatus, _high, _low]
  })

  console.log('添加组合键宏球=======', macroIndex + 1)

  // 分包发送
  // 52 字节一个包 code + status + high + low 一个按键是 4个字节 52 刚好够除, 加上 id 索引 length   发送状态 Checksum
  const num = Math.ceil(data!.flat()!.length / 56)
  for (let i = 0; i < num; i++) {
    const index = num - 1 - i
    const sendData = data!.flat()!.slice(i * 56, (i + 1) * 56)
    try {
      await transport.value.send([0x1A + macroIndex, index, sendData.length / 4, ...sendData])
    }
    catch (err) {
      console.error(err)
      return
    }
  }

  console.log('设置宏按键名字=======', macroName)
  const macroNameArrayBuffer = encodeStringToArrayBuffer(macroName)
  await transport.value.send([0x19, 0x00, macroNameArrayBuffer.length, 6 + macroIndex, ...macroNameArrayBuffer])

  profileInfo.macroList[macroIndex].name = macroName
  profileInfo.macroList[macroIndex].value = []

  nextTick(() => {
    restartConnection()
    onExecutionSuccess()
    // currentMacroButtonRecordedKeyIndex.value = macroIndex
  })
}

// 保存宏
async function saveMacro() {
  // 停止录制
  if (isRecording.value) {
    onClickPecordBtn()
  }

  if (recordedKeys.value.length === 0) {
    setLoadingStatus(t('index.add_macro_warning_1'))
    return
  }

  // 添加第几个宏录制
  let macroIndex = profileInfo.macroList.findIndex(item => item.value.length === 0)
  // 改变第几个宏录制
  if (currentMacroButtonRecordedKeyIndex.value !== undefined) {
    macroIndex = currentMacroButtonRecordedKeyIndex.value
  }

  if (macroIndex === -1) {
    setLoadingStatus(t('index.add_macro_warning'))
    return
  }

  console.log(profileInfo.macroList, 'profileInfo.macroList')

  const macroName = profileInfo.macroList[macroIndex].name || `Macro ${macroIndex + 1}`

  const data = recordedKeys.value.map((item) => {
    const [_low, _high] = getLowAndHigh8Bits(item.intervalTime)
    return [item.keyCode, item.keyStatus, _high, _low]
  })

  console.log('添加组合键宏球=======', macroIndex + 1)

  // 分包发送
  // 52 字节一个包 code + status + high + low 一个按键是 4个字节 52 刚好够除, 加上 id 索引 length   发送状态 Checksum
  const num = Math.ceil(data!.flat()!.length / 56)
  for (let i = 0; i < num; i++) {
    const index = num - 1 - i
    const sendData = data!.flat()!.slice(i * 56, (i + 1) * 56)
    try {
      await transport.value.send([0x1A + macroIndex, index, sendData.length / 4, ...sendData])
    }
    catch (err) {
      console.error(err)
      return
    }
  }

  console.log('添加组合键宏球=======', macroIndex + 1)

  // await transport.value.send([0x1A + macroIndex, 0x00, recordedKeys.value.length, ...data.flat()])

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
    onMacroButtonMouseUp(macroIndex, false)
  })
}

// 录制宏插入
function insertMacro(command: number) {
  const index = recordedKeyHighlightIndex.value === undefined ? recordedKeys.value.length : recordedKeyHighlightIndex.value
  if (recordedKeys.value.length <= 62) {
    if (command === 5) {
      recordedKeys.value.splice(index + 1, 0, { key: 'A', type: 1, keyCode: 4, keyStatus: 1, intervalTime: 10 }, { key: 'A', type: 0, keyCode: 4, keyStatus: 0, intervalTime: 10 },
      )
    }
    else {
      recordedKeys.value.splice(index + 1, 0, {
        key: mouseButton[command],
        type: 1,
        keyCode: command,
        keyStatus: 0xB1,
        intervalTime: 10,
      }, { key: mouseButton[command], type: 0, keyCode: command, keyStatus: 0xB0, intervalTime: 10 })
    }
  }
}

function resetSelectedMacro() {
  currentMacroButtonRecordedKeyIndex.value = void 0
  recordedKeys.value = []
}

function onMacroButtonMouseUp(index: number, flag) {
  if (currentMacroButtonRecordedKeyIndex.value === index && flag) {
    resetSelectedMacro()
  }
  else {
    currentMacroButtonRecordedKeyIndex.value = index
    recordedKeys.value = profileInfo.macroList[index]?.value.map(item => ({
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

  recordedKeyHighlightIndex.value = index
}

function dragend() {
  isDragging.value = false
  dropPosition.value = 'before' // 清理状态
}

function onDrop(event: DragEvent, dropIndex: number) {
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
  const reportId = uint8ArrayRes[0]

  // 🐛 调试模式：记录所有输入报告
  console.log(
    `[HID Input] 报告ID: 0x${reportId.toString(16).toUpperCase().padStart(2, '0')}`,
  )

  // 按下鼠标 DPI 物理按钮
  if (reportId === 0x0B) {
    const dpiIndex = uint8ArrayRes[3]
    if (dpiIndex >= 0 && dpiIndex < profileInfo.dpi_slider_list.length) {
      console.log('  ✅ [DPI切换] 索引:', dpiIndex, 'DPI:', profileInfo.dpi_slider_list[dpiIndex])
      profileInfo.dpi_slider_active_index = dpiIndex
    }
  }

  // 返回充电状态
  else if (reportId === 0x20) {
    const newStatus = uint8ArrayRes[3]
    chargingStatus.value = newStatus
  }

  // 🆕 电量变化主动上报（需要确认报告 ID，暂时先监听所有未知报告）
  else if (reportId === 0x0E) {
    const oldLevel = profileInfo.battery_level
    const newLevel = uint8ArrayRes[3]
    console.log('  ✅ [电量更新]', oldLevel, '% →', newLevel, '%')
    profileInfo.battery_level = newLevel
  }
}

/**
 * 初始化 transport 实例
 * 设置监听器并初始化配置
 */
async function initTransport(instance: TransportWebHIDInstance) {
  transport.value = instance
  console.log('transport.value ======', transport.value)

  // 监听鼠标主动事件: 如 DPI 物理按钮变化
  transport.value.on('input-all', onInputReport)
  // 监听鼠标断开
  navigator.hid.addEventListener('disconnect', onDisconnect)

  // 初始化配置
  initProfile()
}

/**
 * 处理页面刷新后的设备重连
 */
async function handlePageRefresh() {
  const currentDeviceStr = localStorage.getItem('currentDevice')

  if (!currentDeviceStr) {
    console.error('[v8.vue] 未找到设备信息，请从首页进入')
    router.push('/')
    return
  }

  const currentDevice = JSON.parse(currentDeviceStr)
  const { vendorId, productId } = currentDevice

  console.log(`[v8.vue] 检测到页面刷新，重新连接设备: vendorId=0x${vendorId.toString(16)}, productId=0x${productId.toString(16)}`)

  const reconnectedDevice = await connectAndStoreDevice(
    vendorId,
    productId,
    'v8',
    {
      showMessage: msg => console.error('[v8.vue]', msg),
      noDeviceMessage: t('settings.noDeviceMessage'),
      deviceNotFoundMessage: t('settings.deviceNotFoundMessage'),
    },
  )

  if (reconnectedDevice) {
    await initTransport(reconnectedDevice)
  }
  else {
    console.error('[v8.vue] 重新连接设备失败')
  }
}

// 判断是否有缓存的 transport 实例
const cachedTransport = transportWebHID?._s.get('v8')

if (cachedTransport) {
  // ✅ 有缓存：正常跳转
  console.log('[v8.vue] 检测到缓存的 transport 实例，正常加载')
  useTransportWebHID('v8', async (instance) => {
    await initTransport(instance)
  })
}
else {
  // ❌ 无缓存：页面刷新
  console.log('[v8.vue] 未检测到缓存的 transport 实例，尝试重新连接')
  handlePageRefresh()
}

onMounted(() => {
  getLatestVersion()

  const tabActive = localStorage.getItem('tabActive') || 'performance'
  activeBgChange(tabActive)
  autofit.init({
    dh: 1080,
    dw: 1920,
    el: '#app',
    resize: true,
    allowScroll: true,
  })
})

onUnmounted(() => {
  transport.value.off('input-all', onInputReport)
  navigator.hid.removeEventListener('disconnect', onDisconnect)
})

// 使用 provide 提供数据
provide<Ref<TransportWebHIDInstance>>('transport', transport)

const hover = ref('')

function mouseenter(type) {
  if (hover.value === type) {
    hover.value = ''
    return
  }
  hover.value = type
}

const showMouseenter = ref('show')

async function radioChange() {
  if (profileInfo.FPS === 1 || profileInfo.FPS) {
    profileInfo.FPS = false
    await transport?.value.send([0x27, 0x00, 0x00, 0])
    return
  }

  if (profileInfo.sports_arena === 1 && profileInfo.polling_slider >= 5) {
    showMouseenter.value = 'FPS'
    return
  }
  showMouseenter.value = 'FPS1'
}

async function setDPIXY() {
  const DPIStartListCopy = profileInfo.DPIStartList
  DPIStartListCopy[profileInfo.dpi_slider_active_index] = DPIStartListCopy[profileInfo.dpi_slider_active_index] === 0 ? 1 : 0
  profileInfo.DPIStartList = DPIStartListCopy
  await transport?.value.send([0x25, 0x00, profileInfo.dpi_slider_list.length, ...profileInfo.DPIStartList])

  const dpi_number = profileInfo.dpi_slider_list[profileInfo.dpi_slider_active_index]
  profileInfo.XYObjDataList[profileInfo.dpi_slider_active_index as number] = [dpi_number, dpi_number]
  XYObjDataList.value[profileInfo.dpi_slider_active_index as number] = [dpi_number, dpi_number]

  sendXYElimination()

  // setLoadingStatus()
}

async function FPSChange(type) {
  if (type === 0) {
    showMouseenter.value = 'show'
    return
  }
  await transport?.value.send([0x27, 0x00, 0x00, type])

  // 会出现竞技模式打开 && 但是轮询率低于 4k 的情况, 这时候先关闭竞技模式, 在打开就行了, 就会自动打开 8k
  if (showMouseenter.value === 'FPS1') {
    onSportsMode(1)
  }

  profileInfo.FPS = !!type
  setLoadingStatus('')
  showMouseenter.value = 'show'
}

// 直线修正
async function lineUpdate() {
  if (profileInfo.lineUpdate === 1 || profileInfo.lineUpdate) {
    profileInfo.lineUpdate = false
    await transport?.value.send([0x28, 0x00, 0x00, 0])
    return
  }
  showMouseenter.value = 'line'
}

// 直线修正发送鼠标信息

async function lineUpdateSent(type) {
  if (type === 0) {
    showMouseenter.value = 'show'
    return
  }
  await transport?.value.send([0x28, 0x00, 0x00, type])
  profileInfo.lineUpdate = !!type
  setLoadingStatus()
  showMouseenter.value = 'show'
}

// 动态灵敏度
async function radioChange1() {
  profileInfo.sensitivity = !profileInfo.sensitivity
  await transport?.value.send([0x24, 0x00, 0x00, Number(profileInfo.sensitivity)])
  if (Number(profileInfo.sensitivity) === 1) {
    nextTick(() => {
      if (!profileInfo.sensitivityLineData.length) {
        initData.value = lineDataMap[profileInfo.sensitivityModeIndex] as any
        profileInfo.sensitivityLineData = initData.value as any
        initEcharts()
        lineDropChange()
        return
      }
      initEcharts()
    })
    return
  }

  removeHandleMouseMoveFn()

  setLoadingStatus()
}

// 动态灵敏度折线图拖拽变更

async function lineDropChange() {
  const formatData = initData.value.map((item) => {
    return [Number(Math.ceil(item[0])), Number(Math.ceil(item[1] * 10))]
  })
  // profileInfo.xAxisMax 需要转成高8 和 低8
  const xAxisMax = getLowAndHigh8Bits(profileInfo.xAxisMax)

  await transport?.value.send([0x22, 0, 5, Number(profileInfo.sensitivityModeIndex), profileInfo.yAxisMax * 10, ...xAxisMax, ...formatData.flat()])
  setLoadingStatus()
}

const activeBg = ref('performance')

function activeBgChange(type) {
  if (activeBg.value === type) {
    return
  }
  activeBg.value = type
  localStorage.setItem('tabActive', type)

  if (type === 'advanced') {
    nextTick(() => {
      console.log('切换到高级模式')
      // 切换到高级 && 动态灵敏度是开着的情况下,去渲染折线图
      if (profileInfo.sensitivity === 1) {
        if (!profileInfo.sensitivityLineData.length) {
          initData.value = lineDataMap[profileInfo.sensitivityModeIndex] as any
          profileInfo.sensitivityLineData = initData.value as any
          lineDropChange()
        }
        initEcharts()
        openHandleMouseMoveFn()
      }
    })
    return
  }
  removeHandleMouseMoveFn()
}

const mouseMoveTimer = ref<NodeJS.Timeout | null>(null)
const chartUpdateTimer = ref<NodeJS.Timeout | null>(null)

let flag = false

let idleTimer = null
let isMouseMoving = false

function handleMouseMoveFn(event: MouseEvent) {
  // 清除空闲计时器，重新设置
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    myChart.value?.setOption({
      seriesIndex: 1,
      visualMap: {
        pieces: [
          {
            gt: 0,
            lt: 0.1,
            color: 'rgba(219, 255, 6, .7)',
          },
        ],
      },
    })
    flag = false
    if (chartUpdateTimer.value) {
      clearTimeout(chartUpdateTimer.value)
      chartUpdateTimer.value = null
    }
  }, 100)

  // 标记鼠标正在移动
  if (!isMouseMoving) {
    isMouseMoving = true
  }

  // eslint-disable-next-line ts/no-use-before-define
  const data = handleMouseMoveRefFn.value(event)
  if (flag) {
    return
  }

  flag = true
  chartUpdateTimer.value = setTimeout(() => {
    myChart.value?.setOption({
      seriesIndex: 1,
      visualMap: {
        pieces: [
          {
            gt: 0,
            lt: data.x,
            color: 'rgba(219, 255, 6, .7)',
          },
        ],
      },
    })
    flag = false
  }, data.speed)
}

// 开启 鼠标移动监听

function openHandleMouseMoveFn() {
  document.body.addEventListener('mousemove', handleMouseMoveFn)
}

function removeHandleMouseMoveFn() {
  if (chartUpdateTimer.value) {
    clearTimeout(chartUpdateTimer.value)
    chartUpdateTimer.value = null
  }
  if (mouseMoveTimer.value) {
    clearTimeout(mouseMoveTimer.value)
    mouseMoveTimer.value = null
  }
  document.body.removeEventListener('mousemove', handleMouseMoveFn)
}

// 获取模板的折线点
// 0:是经典,1:自然，2;跳跃，3;无，4，不能修改

// async function getProfileData(type) {
//   const data = await transport?.value.send([0x26, 0, 0, type])

//   console.log(data, 'datadata0x26')
// }

const startXYFlag = ref(false)

function startXY() {
  startXYFlag.value = !startXYFlag.value
}
const myChart = ref(null) as any
const chart = ref(null) as any

const handleMouseMoveRefFn = ref(null) as any

function alwaysRoundUp(num: number, decimals: number = 1): string {
  const factor = 10 ** decimals
  const rounded = Math.ceil(num * factor) / factor
  return rounded.toFixed(decimals)
}

function initEcharts() {
  myChart.value = echarts.init(document.getElementById('myChart'))
  const symbolSize = 15
  chart.value = new DraggableChart(initData.value, profileInfo.xAxisMax, profileInfo.yAxisMax)
  const option = {
    tooltip: {
      triggerOn: 'none',
      position: 'top',
      formatter(params: any) {
        return (
          `X: ${
            Math.ceil(params.data[0])
          } Y:${alwaysRoundUp(params.data[1])}`
        )
      },
    },

    grid: {
      top: '8%',
      bottom: '20%',
      left: '5%',
      right: '3%',
    },

    xAxis: {
      min: 0,
      max: profileInfo.xAxisMax,
      interval: profileInfo.xAxisMax / 7,
      type: 'value',

      splitLine: {
        lineStyle: {
          color: '#262626', // 轴线颜色
          width: 1,
          type: 'dashed',

        },
      },
      axisLine: {
        onZero: false,
        lineStyle: {
          color: '#DAFF00',
        },
      },
    },
    yAxis: {
      min: [0, 1, 2].includes(profileInfo.sensitivityModeIndex) ? 1.0 : 0,
      max: profileInfo.yAxisMax,
      type: 'value',
      // axisLabel: {
      //   formatter(value: any, index: any) {
      //     return index % 2 === 0 ? (value.toFixed(1)) : ''
      //   },
      // },
      splitLine: {
        lineStyle: {
          color: '#262626', // 轴线颜色
          width: 1,
          type: 'dashed',
        },
      },
      axisLine: {
        onZero: false,
        lineStyle: {
          color: '#DAFF00',
        },
      },
    },
    visualMap: {
      type: 'piecewise',
      show: false,
      dimension: 0,
      seriesIndex: 1,
      pieces: [
        {
          gt: 0,
          lt: 0.1,
          color: 'rgba(219, 255, 6, 0)',
        },
      ],
    },
    animation: false,
    series: [
      {
        id: 'line',
        type: 'line',
        smooth: 0.6,
        symbolSize: [0, 1, 2].includes(profileInfo.sensitivityModeIndex) ? 0 : symbolSize,
        data: initData.value,
        itemStyle: {
          color: '#DAFF00',
        },
        lineStyle: {
          color: '#DAFF00',
          width: 3,
        },
      },

      {
        id: 'area',
        type: 'line',
        smooth: 0.6,
        symbolSize: 0,
        data: initData.value,
        areaStyle: {},
        itemStyle: {
          color: 'transparent',
        },
        lineStyle: {
          color: 'transparent',
          width: 0,
        },
      },
    ],
  }

  myChart.value.setOption(option)

  setTimeout(() => {
    // 双重保险-非自定义不可拖拽
    if ([0, 1, 2].includes(profileInfo.sensitivityModeIndex)) {
      return
    }

    myChart.value.setOption({
      graphic: initData.value.map((item, dataIndex) => {
        return {
          type: 'circle',
          position: myChart.value.convertToPixel('grid', item),
          shape: {
            cx: 0,
            cy: 0,
            r: symbolSize / 2,
          },
          invisible: true,
          draggable: true,
          ondrag() {
            onPointDragging(dataIndex, [this.x, this.y])
          },
          onmousemove() {
            showTooltip(dataIndex)
          },
          onmouseout() {
            hideTooltip()
          },
          ondragend() {
            // 拖拽之后, 设置成自定义-无
            profileInfo.sensitivityModeIndex = 3
            lineDataMap[profileInfo.sensitivityModeIndex] = initData.value as any
            // 存着用于分享
            profileInfo.sensitivityLineData = initData.value.map((item: any) => {
              return [Math.ceil(item[0]), Number(item[1].toFixed(1))]
            })
            lineDropChange()
            myChart.value?.setOption({
              graphic: initData.value.map((item) => {
                return {
                  type: 'circle',
                  position: myChart.value?.convertToPixel('grid', item),
                }
              }),
            })
          },
          z: 100,
        }
      }),
    })
  }, 0)

  // 数据设置完之后, 启动鼠标移动监听

  nextTick(() => {
    const { handleMouseMove } = useGlobalInputListener(myChart.value)
    handleMouseMoveRefFn.value = handleMouseMove
    setTimeout(() => {
      openHandleMouseMoveFn()
    }, 1000)
  })
  function showTooltip(dataIndex: any) {
    myChart.value.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex,
    })
  }
  function hideTooltip() {
    myChart.value.dispatchAction({
      type: 'hideTip',
    })
  }

  function onPointDragging(dataIndex: number, pos: any) {
    const [x, y] = myChart.value.convertFromPixel('grid', pos)
    initData.value = chart.value.dragPoint(dataIndex, x, y).map((item: any) => {
      return [item[0], item[1]]
    })

    myChart.value.setOption({
      series: [
        {
          id: 'line',
          data: initData.value,
        },
        {
          id: 'area',
          data: initData.value,
        },
      ],
    })
  }
}

async function changeXAxisMax(num: number) {
  profileInfo.xAxisMax = profileInfo.xAxisMax + num

  if (profileInfo.xAxisMax > 280) {
    profileInfo.xAxisMax = 280
    return
  }
  if (profileInfo.xAxisMax < 35) {
    profileInfo.xAxisMax = 35
    return
  }

  await lineDropChange()

  initEcharts()
}

async function changeYAxisMax(num: number) {
  profileInfo.yAxisMax = Number((profileInfo.yAxisMax + num).toFixed(1))

  if (profileInfo.yAxisMax > 6) {
    profileInfo.yAxisMax = 6
    return
  }
  if (profileInfo.yAxisMax < 1.5) {
    profileInfo.yAxisMax = 1.5
    // chart.value.setBounds(0, 50, 0, profileInfo.yAxisMax)
    return
  }

  await lineDropChange()

  initEcharts()
}

const bottomItem = ref(0)

function bottomItemChange(type) {
  if (type === 1) {
    showMouseenter.value = 'show'
  }
  if (type === 1 && profileInfo.sports_arena !== 0) {
    onSportsMode(0)
    return
  }

  if (type === 0) {
    onMotionSync()
    return
  }

  if (bottomItem.value === type) {
    return
  }

  bottomItem.value = type
}

const imgActive = ref(false)

function showMouseenterChange(type) {
  if (imgActive.value) {
    imgActive.value = false
    showMouseenter.value = 'show'
    return
  }
  imgActive.value = true
  showMouseenter.value = type
}

const isEditingProfile = ref(false)
const tempBase64 = ref('')
const base64 = ref('')
const buttonType = ref('share')

const profileInputField = ref()

const dblClickIndex = ref()

async function onProfileDblClick() {
  isEditingProfile.value = true
  tempBase64.value = ''
  // 这里记录一下需要分享的 配置文件索引 后面应用的时候会用到
  dblClickIndex.value = active_profile_index.value

  await nextTick()
  if (profileInputField.value) {
    profileInputField.value.focus()
  }
}

function onInput(value: string) {
  tempBase64.value = value
  buttonType.value = 'check'
}

function onProfileBlur() {
  isEditingProfile.value = false
}

function createHong(index, buttonType) {
  mouseButtonRef.value.onConnection(index, buttonType)
}

const dpi_slider_edit = ref()
const dpi_slider_value = ref('')

const dpiInputRef = ref(null)

function dpiEditValue(editActive, value) {
  dpi_slider_edit.value = editActive
  dpi_slider_value.value = value
  nextTick(() => {
    dpiInputRef.value[0].focus()
  })
}

function inputSendDpi(value: number, index: number) {
  const formatValue = value % 50 === 0 ? value : value + (Math.abs(50 - value % 50)) as any
  dpi_slider_value.value = formatValue
  profileInfo.dpi_slider_list[index] = formatValue

  if (formatValue < 100) {
    profileInfo.dpi_slider_list[index] = 100
    dpi_slider_edit.value = 100
    return
  }

  if (formatValue > 30000) {
    profileInfo.dpi_slider_list[index] = 30000
    dpi_slider_edit.value = 30000
  }

  sendDpi(index)
}

const { copied, copy } = useClipboard({ source: base64 })

watch(copied, (newV) => {
  if (newV) {
    setLoadingStatus(t('message.profile_copied'))
  }
})

function copyBase64() {
  const base64 = insertAt9th(jsonToBase64(profileInfo!), 'd')
  copy(base64)
}

// 应用按钮

function setProfileYS() {
  if (checkProfile(removeAt9th(tempBase64.value))) {
    base64.value = tempBase64.value
    buttonType.value = 'share'
    isEditingProfile.value = false
    setProfile()
  }
  else {
    setLoadingStatus(t('message.format_error'))
    buttonType.value = 'share'
  }
}

async function deleteMacro(macro: Macro, index: number) {
  console.log(index, currentMacroButtonRecordedKeyIndex.value, 'indexindexindexindex')
  const macroIndex = profileInfo.macroList.findIndex(item => item === macro)
  console.log('删除组合键宏========', macroIndex)
  await transport?.value.send([0x08, 0x00, 1, 1, 1, 0xFF, macroIndex])
  const connections = profileInfo.macroList[macroIndex].connections
  connections.forEach(async (item: any) => {
    profileInfo[item.keyid] = mouseButton.findIndex(key => key === item.keyid)
  })

  profileInfo.macroList[macroIndex] = { name: '', connections: [], value: [] }

  if (currentMacroButtonRecordedKeyIndex.value === index) {
    recordedKeys.value = []
  }
  // setLoadingStatus(t('message.format_error'))
}

const loadingShow = ref(false)
const loadingText = ref('')
let loadingTimer: number | null = null

function setLoadingStatus(text?: any) {
  // 清除上一次的定时器
  if (loadingTimer !== null) {
    clearTimeout(loadingTimer)
    loadingTimer = null
  }

  // 如果前一次 loading 还在显示，先立即关闭它
  if (loadingShow.value) {
    loadingShow.value = false
    // 使用 nextTick 确保 DOM 更新后重新开始新的 loading
    nextTick(() => {
      loadingShow.value = true
      loadingText.value = text
      startLoadingTimer()
    })
  }
  else {
    loadingShow.value = true
    loadingText.value = text
    startLoadingTimer()
  }
}

function startLoadingTimer() {
  loadingTimer = window.setTimeout(() => {
    loadingShow.value = false
    loadingTimer = null
  }, 800)
}

const isHovered = ref('')

async function onChange(macroName: string, index: number) {
  console.log('设置宏按键名字=======', macroName, index)
  const macroNameArrayBuffer = encodeStringToArrayBuffer(macroName)
  await transport?.value.send([0x19, 0x00, macroNameArrayBuffer.length, 6 + index, ...macroNameArrayBuffer])

  profileInfo.macroList[index].name = macroName
  isHovered.value = ''
  setLoadingStatus('')
}

const modeShow = ref(false)

function changeModeShow() {
  modeShow.value = true
  // observeWidthChange(document.querySelector('.mode-box'))
}

function changeModeHide() {
  modeShow.value = false
  // observeWidthChange(document.querySelector('.mode-box'))
}

const selectLanguageList = ref([
  { title: t('language.zhCN'), img: '/flag/CN1.png', language: 'zh-CN' },
  { title: t('language.deDE'), img: '/flag/DE1.png', language: 'de-DE' },
  { title: t('language.enUS'), img: '/flag/US1.png', language: 'en-US' },
  { title: t('language.koKR'), img: '/flag/KR1.png', language: 'ko-KR' },
  { title: t('language.jaJP'), img: '/flag/JP1.png', language: 'ja-JP' },
])

toggleLocales(locale.value)

async function toggleLocales(language: string) {
  await loadLanguageAsync(language)
  locale.value = language
  localeStr.value = language
  const list = JSON.parse(JSON.stringify(selectLanguageList.value))
  const index = list.findIndex((item) => {
    return item.language === language
  })
  list.splice(0, 0, list.splice(index, 1)[0])
  selectLanguageList.value = list
}

function mouseButtonClickFn() {
  bottomItem.value = 5
}

const originalItems = [
  { id: 4, text: t('title.sensitivity_preset_classic') },
  { id: 5, text: t('title.sensitivity_preset_natural') },
  { id: 6, text: t('title.sensitivity_preset_jump') },
  { id: 3, text: t('title.none') },
]

const sortedItems = computed(() => {
  // 过滤出需要显示的项目
  const filteredItems = originalItems.filter(item =>
    profileInfo.sensitivityModeIndex === item.id || modeShow.value,
  )

  // 如果当前激活项在过滤后的列表中，把它移到第一个
  const activeItemIndex = filteredItems.findIndex(item => item.id === profileInfo.sensitivityModeIndex)
  if (activeItemIndex > -1) {
    const activeItem = filteredItems[activeItemIndex]
    filteredItems.splice(activeItemIndex, 1)
    filteredItems.unshift(activeItem)
  }

  return filteredItems
})

// 1：红色 ，2：黄色 3：黑色 4：白色，后面再增加颜色继续往后移

const colorItems = [
  { id: 3, color: 'black', backgroundColor: '#8B8B8B' },
  { id: 4, color: 'white', backgroundColor: '#fff' },
]

const sortedColorItems = computed(() => {
  // 过滤出需要显示的项目
  const filteredItems = colorItems

  // 如果当前激活项在过滤后的列表中，把它移到第一个
  const activeItemIndex = filteredItems.findIndex(item => item.id === profileInfo.mouseColor)
  if (activeItemIndex > -1) {
    const activeItem = filteredItems[activeItemIndex]
    filteredItems.splice(activeItemIndex, 1)
    filteredItems.unshift(activeItem)
  }

  return filteredItems
})

async function setColor(mode: any) {
  if (profileInfo.mouseColor === mode.id) {
    return
  }
  profileInfo.mouseColor = mode.id

  await transport?.value.send([0x29, 0x00, 0x00, mode.id])

  transportList.value = transportList.value.map((item: any) => {
    if (item.reportId === transport.value.reportId) {
      item.mouseColor = mode.id
    }
    return item
  })
  localStorage.setItem('transportList', JSON.stringify(transportList.value))

  setLoadingStatus()
}
const currentVersion = ref(0)
const latestVersion = ref(0)
const latestFilePath = ref('')

async function getLatestVersion() {
  await userStore.fetchLatestVersion()
  latestVersion.value = userStore.latestVersion.mouseVersion
  latestFilePath.value = !!userStore.latestVersion.usbFilePath
}

async function getVersion() {
  const data = await transport?.value.send([0x0F, 0x00, 0x00])
  currentVersion.value = combineLowAndHigh8Bits(data[3], data[4])
}

const getUpdateFlag = computed(() => {
  return (currentVersion.value < latestVersion.value) && latestFilePath.value
})

function selectMode(mode: number) {
  if (profileInfo.sensitivityModeIndex === mode) {
    return
  }
  profileInfo.sensitivityModeIndex = mode

  profileInfo.xAxisMax = profileInfo.xAxisMax > 105 ? profileInfo.xAxisMax : profileInfo.xAxisMax < 70 ? profileInfo.xAxisMax : [0, 1, 2].includes(profileInfo.sensitivityModeIndex) ? 70 : 105

  initData.value = JSON.parse(JSON.stringify(lineDataMap[mode]))
  // 存着用于分享
  profileInfo.sensitivityLineData = initData.value as any
  initEcharts()
  lineDropChange()
}

provide('createHong', createHong)

provide('mouseButtonClickFn', mouseButtonClickFn)
</script>

<template>
  <div class="hid-container">
    <a class="absolute left-30px top-30px" href="https://scyrox2.shunyue.top" target="_blank">
      <img class="h-45px" src="/logo.png" alt="logo">
    </a>

    <div class="logo-box absolute right-90px top-50px">
      <img v-for="item in selectLanguageList" :key="item.title" class="h-38px w-38px" :src="item.img" :alt="item.title" style="margin-bottom: 10px;border-radius:50%;" @click="toggleLocales(item.language)">
    </div>

    <div class="profile-item absolute right-190px top-260px w-24% flex items-center" style="height: 50px;">
      <template v-if="isEditingProfile">
        <ElInput
          ref="profileInputField"
          v-model="tempBase64"
          class="profile-input mb-3 text-lg"
          :placeholder="t('input.profile_input')"
          @input="onInput"
          @blur="onProfileBlur"
        />
      </template>
      <template v-else>
        <div class="flex-1 cursor-pointer overflow-hidden text-ellipsis px-3 text-center" @dblclick="onProfileDblClick">
          {{ base64 || t('input.profile_input') }}
        </div>
      </template>
      <!-- 分享 -->
      <ElButton v-if="buttonType === 'share'" :icon="Share" circle size="small" style="margin-left:10px" @click="copyBase64" />
      <!-- 应用 -->
      <ElButton v-else-if="buttonType === 'check'" style="border:1px solid #DAFF00; color:#DAFF00;margin-left:10px" type="success" round color="#2F3603" size="small" @click="setProfileYS">
        <!-- 应用 -->
        {{ t('button.application') }}
      </ElButton>

      <img style="margin-left: 10px;width: 20px ;height: 20px;" :src="`/v9/wenhao${hover === 'share' ? '_active' : ''}.png`" srcset="" @mouseenter="mouseenter('share')" @mouseleave="mouseenter('share')">
      <!--  -->
      <p v-if="hover === 'share'" class="absolute top-12 w-[88%]" style="font-size:15px; color:#DAFF00;text-align: left;">
        <!-- 已复制当前模式所有设置，可以通过粘贴分享给好友应用
        应用时双击横杠上代码点击鼠标右键粘贴替换，应用即可 -->
        {{ t('tips.application.description') }}
      </p>
    </div>

    <div style="flex: 1;">
      <div class="flex" style="flex-direction: column;align-items: center;margin-bottom: 20px;">
        <div class="flex" style="align-items: center;font-size: 16px;">
          {{ profileInfo.battery_level }}%
          <!-- 电量图标 -->
          <div v-if="chargingStatus === 1" class="h-6 w-6" :class="profileInfo.battery_level === 100 ? 'color-green-500' : 'color-yellow-500'">
            <svg
              t="1751002332004" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
              p-id="9714"
            >
              <path
                d="M568 171.84v285.312h144.64a12.8 12.8 0 0 1 10.816 19.648l-243.84 382.208a12.8 12.8 0 0 1-23.616-6.848V566.848h-144.64a12.8 12.8 0 0 1-10.816-19.648l243.84-382.208a12.8 12.8 0 0 1 23.616 6.848z"
                fill="currentColor" fill-opacity=".88" p-id="9715"
              /></svg>
          </div>
        </div>
        <!-- 电量 -->
        <ElProgress color="#67c23a" style="width: 115px;" :percentage="profileInfo.battery_level" :show-text="false" />
      </div>

      <div style="position: relative;">
        <!-- 鼠标图片 -->
        <img
          :src="`/mouse_${{
            3: 'black',
            4: 'white',
          }[profileInfo.mouseColor] || 'black'}.png`" alt="mouse-card" class="mouse"
        >

        <MouseButton
          ref="mouseButtonRef" :value="mouseButtonValue" class="absolute right-0 h-full w-200%" style="top: -16px;"
          @change="onMouseButtonChange"
        />

        <div class="color-box absolute right-[-50px] top-0">
          <div v-for="item in sortedColorItems" :key="item.id" class="mb-3" :style="{ background: item.backgroundColor }" style="width: 18px;height: 18px; border-radius: 50%;" @click="setColor(item)" />
        </div>
      </div>
    </div>
    <div class="bottom-con relative">
      <div class="config-box">
        <div class="flex items-center" @click="bottomItemChange(0)">
          <img :src="`/v9/Motion${profileInfo.motion_sync ? '_active' : ''}.png`" alt="Motion" style="margin-right: 5px;">
          <span>
            <!-- 运动模式 -->
            {{ t('tabs.MotionMode') }}
          </span>
        </div>
        <div class="flex items-center" @click="bottomItemChange(1)">
          <img :src="`/v9/icon2${profileInfo.sports_arena === 0 ? '' : '_active'}.png`" alt="Motion" style="margin-right: 5px;">
          <span>
            {{ t('tabs.competitiveMode') }}
            <!-- 竞技模式 -->
          </span>
        </div>
        <div class="flex items-center" @click="bottomItemChange(3)">
          <img src="/v9/icon1.png" alt="Motion" style="margin-right: 5px;">
          <span>
            {{ t('deviceManagement.pairing') }}
            <!-- 配对 -->
          </span>
        </div>
        <div class="flex items-center" @click="bottomItem = 4">
          <img src="/v9/icon.png" alt="Motion" style="margin-right: 5px;">
          <span>
            {{ t('deviceManagement.restoreFactory') }}
            <!-- 恢复出厂 -->
          </span>
        </div>
      </div>

      <div class="bottom-box relative">
        <div class="config-child-box">
          <span v-for="(item, index) in profileList" :key="index" class="ahover" :class="active_profile_index === index ? 'active' : ''" @click="setProfile(index, 'top')">{{ item.title }}</span>
        </div>
        <div style="width: 100%;flex:1;align-items: center;" class="flex">
          <div class="left-item-box">
            <div :class="{ activeBg: activeBg === 'performance' }" :style="{ textAlign: locale == 'ja-JP' ? 'left' : '', paddingLeft: locale == 'ja-JP' ? '10px' : '' }" @click="activeBgChange('performance')">
              <!-- 性能 -->
              {{ t('tabs.Performance') }}
            </div>
            <div :class="{ activeBg: activeBg === 'hong' }" @click="activeBgChange('hong')">
              <!-- 宏 -->
              {{ t('macro.Macro') }}
            </div>
            <div :class="{ activeBg: activeBg === 'advanced' }" @click="activeBgChange('advanced')">
              <!-- 高级 -->
              {{ t('tabs.Advanced') }}
            </div>
          </div>
          <div style="position: relative;height: 100%; display: flex; align-items: center;">
            <Transition name="slide-up">
              <div v-show="activeBg === 'performance'" class="absolute flex">
                <div class="right-f-b h-100" style="padding: 40px 25px 25px 25px;position: relative;">
                  <div class="flex items-center justify-between">
                    <span style="font-size: 20px;"> {{ t('title.sensitivity_settings_heading') }} </span>
                    <div class="flex items-center">
                      <span style="display: inline-block; font-size: 30px;" @click="sendDpiLength('minu')">-</span>
                      <span
                        style="margin: 0 15px; width: 24px; height: 24px; border-radius: 50%;background-color: #DAFF00;color: #333;"
                      >{{ profileInfo.dpi_slider_list.length }}</span>
                      <span style="display: inline-block; font-size: 30px;" @click="sendDpiLength('add')">+</span>
                    </div>
                  </div>

                  <div class="flex">
                    <div v-for="(item, index) in profileInfo.dpi_slider_list" :key="index" class="mr-6">
                      <div
                        class="triangle-top flex items-center"
                        :class="profileInfo.dpi_slider_active_index === index ? 'active' : ''"
                        style="width: 99.56px;height: 118px;padding-top: 7px;flex-direction: column;"
                        @click="sendDpi(index)"
                      >
                        <div style="font-size: 14px;" :style="{ 'margin-bottom': !!profileInfo.DPIStartList[index] ? '0px' : '30px' }">
                          {{ t('title.sensitivity_level') }} {{ index + 1 }}
                        </div>
                        <div v-if="!profileInfo.DPIStartList[index]" style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px solid #444444; border-radius: 10px;" @click.stop="dpiEditValue(index, item)">
                          <input v-if="dpi_slider_edit === index" ref="dpiInputRef" v-model.number="dpi_slider_value" style="border-radius: 10px;" class="h-[25px] w-[69px] text-center" type="text" @blur="inputSendDpi(dpi_slider_value, index)" @keyup.enter="inputSendDpi(dpi_slider_value, index)">
                          <span v-else>{{ item }}</span>
                        </div>

                        <template v-else>
                          <span style="font-size:10px">X</span>
                          <div style="width: 69px; text-align: center; border-radius: 10px;" @click.stop>
                            <input v-model.number="profileInfo.XYObjDataList[index][0]" style="border-radius: 10px;color:#fff" class="h-[25px] w-[69px] text-center" type="text" @change="XYEliminationChange(index)" @blur="sendXYElimination" @keyup.enter="sendXYElimination">
                          </div>
                          <span style="font-size:10px">Y</span>
                          <div style="width: 69px; text-align: center; border-radius: 10px;" @click.stop>
                            <input v-model.number="profileInfo.XYObjDataList[index][1]" style="border-radius: 10px;color:#fff" class="h-[25px] w-[69px] text-center" type="text" @change="XYEliminationChange(index)" @blur="sendXYElimination" @keyup.enter="sendXYElimination">
                          </div>
                        </template>
                      </div>
                      <div class="triangle" :class="index === 0 ? '' : `triangle${index + 1}`" />
                    </div>
                  </div>

                  <div class="flex" style="margin-top: 12px;">
                    <span style="font-size: 20px; margin-right: 50px;" class="flex items-center">{{ t('tips.sensitivity_enable_xy.title') }}
                      <img
                        style="margin-left: 5px;"
                        :src="`/v9/wenhao${startXYFlag ? '_active' : ''}.png`"
                        alt=""
                        srcset=""
                        @mouseenter="startXY" @mouseleave="startXY"
                      ></span>
                    <div
                      class="flex items-center" style="position: relative;  width: 51px; height: 25px; border:1px solid #8B8A8A; border-radius: 30px; background-color: #242424;overflow: hidden;"
                      @click="setDPIXY"
                    >
                      <Transition name="right-fade">
                        <div
                          :key="!!profileInfo.DPIStartList[profileInfo.dpi_slider_active_index]" class="absolute" :class="[profileInfo.DPIStartList[profileInfo.dpi_slider_active_index] === 1 ? 'right-0.5' : 'left-0.5']"
                          style="width: 19px;height: 19px;border-radius: 50%;"
                          :style="{ 'background-color': profileInfo.DPIStartList[profileInfo.dpi_slider_active_index] === 1 ? '#DAFF00' : '#8B8A8A' }"
                        />
                      </Transition>
                    </div>
                  </div>

                  <CustomSlider
                    v-if="!!!profileInfo.DPIStartList[profileInfo.dpi_slider_active_index]"
                    v-model="profileInfo.dpi_slider_list[profileInfo.dpi_slider_active_index]"
                    class="dpi_slider absolute bottom-6 w-90%" :bind="sliderOptions.dpi_slider"
                    :default-select-options="sliderDefaultSelectOptions.dpi_slider" :double-click-edit="true"
                    :marks="{
                      [sliderOptions.dpi_slider.min]: `${sliderOptions.dpi_slider.min}`,
                      [sliderOptions.dpi_slider.max]: `${sliderOptions.dpi_slider.max}`,
                    }"
                    @change="sendDpi(profileInfo.dpi_slider_active_index)"
                  />
                  <CustomSlider
                    v-if="!!profileInfo.DPIStartList[profileInfo.dpi_slider_active_index]"
                    v-model="XYObjDataList[profileInfo.dpi_slider_active_index][0]"
                    class="dpi_slider slider1 absolute bottom-23 w-90%"
                    :bind="sliderOptions.dpi_slider"
                    :default-select-options="sliderDefaultSelectOptions.dpi_slider"
                    :double-click-edit="true"
                    :show-fixed="true"
                    :marks="{
                      [sliderOptions.dpi_slider.min]: `${sliderOptions.dpi_slider.min}`,
                      [sliderOptions.dpi_slider.max]: `${sliderOptions.dpi_slider.max}`,
                    }"
                    @change="sendXYElimination"
                  />
                  <CustomSlider
                    v-if="!!profileInfo.DPIStartList[profileInfo.dpi_slider_active_index]"
                    v-model="XYObjDataList[profileInfo.dpi_slider_active_index][1]"
                    class="dpi_slider slider2 absolute bottom-6 w-90%"
                    :bind="sliderOptions.dpi_slider"
                    :default-select-options="sliderDefaultSelectOptions.dpi_slider"
                    :double-click-edit="true"
                    :show-fixed="true"
                    :marks="{
                      [sliderOptions.dpi_slider.min]: `${sliderOptions.dpi_slider.min}`,
                      [sliderOptions.dpi_slider.max]: `${sliderOptions.dpi_slider.max}`,
                    }"
                    @change="sendXYElimination"
                  />
                </div>

                <div style="flex:1;" class="relative">
                  <Transition name="slide-right">
                    <div v-show="!startXYFlag" class="absolute flex" style="flex:1;">
                      <div class="right-s-b" style="margin-left: 10px;padding: 50px 25px 25px 25px;position: relative;">
                        <div class="flex items-center justify-between">
                          <p style="font-size: 20px; min-width: 100px;text-align: left;">
                            {{ t('title.polling_rate') }}
                          </p>

                          <!-- <CustomSliderLabel
                            v-model="profileInfo.polling_slider"
                          <p style="font-size: 20px; min-width: 100px;text-align: left-5 w-66%"
                            :bind="sliderOptions.polling_slider"
                            :default-select-options="sliderDefaultSelectOptions.polling_slider"
                            :show-fixed="true"
                            @change="sendPolling"
                          /> -->

                          <div class="flex items-center justify-between" style="flex: 1;margin-left: 20px;">
                            <div
                              v-for="(item, index) in sliderDefaultSelectOptions.polling_slider"
                              :key="index"
                              class="block_item"
                              :class="[profileInfo.polling_slider === item.value ? 'active' : '']"
                              style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px solid #3D3D3D;background:#242424"
                              @click="sendPolling(item.value)"
                            >
                              {{ item.label }}<span style="font-size:12px"> Hz</span>
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center justify-between">
                          <p style="font-size: 20px; min-width: 100px;text-align: left;">
                            <!-- LOD 高度 -->
                            {{ t('title.lod_height') }}
                          </p>
                          <div class="flex items-center justify-between" style="flex: 1;margin-left: 20px;">
                            <div
                              v-for="(item, index) in sliderDefaultSelectOptions.lod_slider"
                              :key="index"
                              class="block_item"
                              :class="item.value === profileInfo.lod_slider ? 'active' : ''"
                              style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px solid #3D3D3D;background:#242424"
                              @click="sendLod(item.value)"
                            >
                              {{ item.label }}
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center justify-between">
                          <p style="font-size: 20px; min-width: 100px;text-align: left;">
                            {{ t('title.key_response') }}
                          </p>
                          <div style="flex:1;height: 100%;" class="relative">
                            <CustomSlider
                              v-model="profileInfo.jitter_elimination_slider"
                              class="transparent-slider dpi_slider absolute left-5 w-95%"
                              :bind="sliderOptions.jitter_elimination_slider"
                              :default-select-options="sliderDefaultSelectOptions.jitter_elimination_slider"
                              :show-fixed="true"
                              @change="sendJitterElimination"
                            />
                          </div>
                        </div>
                        <div class="flex items-center justify-between">
                          <p style="font-size: 20px; min-width: 100px;text-align: left;">
                            <!-- 休眠时间 -->
                            {{ t('title.sleep_time') }}
                          </p>
                          <div style="flex:1;height: 100%;" class="relative">
                            <CustomSlider
                              v-model="profileInfo.hibernation_slider"
                              class="transparent-slider absolute left-5 w-95%"
                              :bind="sliderOptions.hibernation_slider"
                              :default-select-options="sliderDefaultSelectOptions.hibernation_slider"
                              :show-fixed="true"
                              @change="sendHibernation"
                            />
                          </div>
                        </div>
                      </div>
                      <div
                        class="right-t-b"
                        style="margin-left: 10px;padding: 50px 25px 25px 25px;position: relative; flex-direction: column;"
                      >
                        <div class="flex" style="width: 100%;">
                          <span style="font-size: 20px; text-align: left;">{{ t('title.rotation_angle') }}</span>
                        </div>
                        <div style="width:224px;height:214px;left: 50%; top: 45%; margin-left: -112px; margin-top: -107px; " class="absolute flex items-center justify-center">
                          <!-- profileInfo.angle_slider -->
                          <img
                            style="width: 84px;height:152px;z-index:1"
                            src="/v9/mouse.png"
                            :style="{ transform: `rotate(${profileInfo.angle_slider}deg)` }"
                            alt="" srcset=""
                          >
                          <div class="cross-horizontal" />
                          <div class="cross-vertical" />
                        </div>

                        <CustomSlider
                          v-model="profileInfo.angle_slider" class="absolute bottom-6 w-85%"
                          :bind="sliderOptions.angle_slider" :default-select-options="sliderDefaultSelectOptions.angle_slider"
                          :marks="{
                            [sliderOptions.angle_slider.min]: `${sliderOptions.angle_slider.min}`,
                            [sliderOptions.angle_slider.max]: `${sliderOptions.angle_slider.max}`,
                          }"
                          @change="sendAngle"
                        />
                      </div>
                    </div>
                  </Transition>
                  <Transition name="slide-right">
                    <div v-show="startXYFlag" style="width: 890px; margin-left: 10px; justify-content: center;align-items: center;  height:100%; flex-direction: column;background-image: linear-gradient(to right, #0E0E0D, #31350F, #A5AA5290);border-radius: 15px;" class="absolute flex">
                      <p style="font-size: 30px;margin-bottom: 10px;">
                        {{ t('tips.sensitivity_enable_xy.title') }}
                      </p>

                      <span style="font-size: 16px;line-height: 24px;color: #FFFFFF; width:85%;">{{ t('tips.sensitivity_enable_xy.description') }}</span>
                      <div style="height:197px;width:593px;margin-top: 50px;">
                        <AnimateCanvas
                          :width="593"
                          :height="197"
                          :img-length="91"
                          :end-stop="false"
                          url="/xy/1_0"
                        />
                      </div>

                      <ElIcon size="30" style="position: absolute; right: 10px; top: 10px;" @click="startXYFlag = false">
                        <Close />
                      </ElIcon>
                    </div>
                  </Transition>
                </div>
              </div>
            </Transition>
            <Transition name="slide-up">
              <div v-show="activeBg === 'hong'" class="absolute flex">
                <div style="width: 564px;">
                  <div class="config-child-box" @click="addMacroFn">
                    <span class="active">{{ t('macro.newMacro') }}</span>
                  </div>
                  <div class="relative flex">
                    <!-- @scroll="scroll" -->
                    <ElScrollbar ref="scrollbarRef" height="387px" always style="width: 100%; height:387px; margin-top: 8px;padding-top: 20px; justify-content: normal;" class="right-s-b">
                      <div ref="innerRef">
                        <template v-for="(item, index) in profileInfo.macroList" :key="index">
                          <div v-show="item.name || isHovered === index" class="hong_active" :class="[currentMacroButtonRecordedKeyIndex === index ? 'hong' : '']" style="width: 100%;padding: 6px 55px 6px 15px;background-color: #2F2F2F; border-radius: 30px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;" @click="onMacroButtonMouseUp(index, true)">
                            <div v-show="isHovered !== index" @dblclick.stop="isHovered = index">
                              {{ item.name }}
                            </div>
                            <ElInput v-show="isHovered === index" v-model="item.name" class="macro-button-item-input mx-1" :placeholder="item.name" style="width: 100px" :input-style="{ textAlign: 'right' }" :maxlength="10" @blur="onChange(item.name, index)" />

                            <ElIcon size="20" @click.stop="deleteMacro(item, index)">
                              <Delete />
                            </ElIcon>
                          </div>
                        </template>
                      </div>
                    </ElScrollbar>
                  </div>
                </div>
                <div style="width: 617px;margin-left: 60px;">
                  <div class="flex items-center justify-between">
                    <!-- <span style="font-size: 20px;">灵敏度设置</span> -->
                    <div class="config-child-box">
                      <span style="border: 0; justify-content: flex-start; background: transparent">{{ t('title.key_list') }}</span>
                    </div>

                    <ElDropdown ref="ElDropdownRef" :teleported="false" class="" trigger="click" popper-class="custom-popper custom-dropdown-popper" @command="insertMacro">
                      <div class="flex items-center justify-center" style="width: 122px;height: 36px;  background-color: #242424;;border-radius: 30px">
                        {{ t('macro.insertMacro') }}
                        <ElIcon class="absolute right-3" style="margin-left: 10px;" size="20" color="#DAFF00">
                          <!-- <ArrowUpBold /> -->
                          <ArrowDownBold />
                        </ElIcon>
                      </div>
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
                          <!-- <ElDropdownItem :command="5">
                            {{ t('button.keyboard_key') }}
                          </ElDropdownItem> -->
                        </ElDropdownMenu>
                      </template>
                    </ElDropdown>
                  </div>
                  <div class="relative flex">
                    <div ref="keyboardRecordingListRef" class="hide-scrollbar right-s-b relative overflow-auto" style="width: 100%; height:387px; margin-top: 8px;padding-top: 20px; justify-content: normal;">
                      <ul ref="innerRef">
                        <div
                          v-if="isDragging" class="absolute z-10 h-[2px] w-full transition-all duration-200" style="border-top:4px dashed purple" :style="{ top: `${dropLinePosition}px`,
                          }"
                        />
                        <li
                          v-for="(item, index) in recordedKeys"
                          :key="index"
                          class="hong_active"
                          :class="[recordedKeyHighlightIndex === index ? 'hong' : '']"
                          style="width: 100%;padding: 6px 55px 6px 15px;background-color: #2F2F2F; border-radius: 30px; display: flex; align-items: center; justify-content: space-between;margin-bottom: 5px;"
                          draggable="true"
                          @click="recordedKeyHighlightIndex = index"
                          @dragstart="onDragStart($event, index)"
                          @dragover="onDragOver($event, index)"
                          @dragenter.prevent
                          @drop="onDrop($event, index)"
                          @dragend="dragend"
                        >
                          <div class="flex items-center">
                            <ElSpace>
                              <ElIcon size="20" class="mr-2 mt-1">
                                <Download v-if="item.type" />
                                <Upload v-else />
                              </ElIcon>
                              <div class="flex">
                                <!-- 录制按键内容 & 毫秒, 双击可编辑 -->
                                <div @dblclick="onDblclicRecordedKey(item)">
                                  <input v-if="item._editable === 'KEY'" ref="inputRecordedKeyRef" type="text" :value="item.key" class="hide-focus-visible w-[70px] border-0 border-b-1" @keydown="(event) => onKeydownRecordedKey(event, item)" @blur="onblurRecordedKey(item)">
                                  <span v-else>{{ item.key }}</span>
                                </div>

                                <div class="ml-5" @dblclick="onDblclicIntervalTime(item)">
                                  <input v-if="item._editable === 'INTERVAL_TIME'" ref="inputIntervalTimeRef" v-model.number="item.intervalTime" type="text" class="hide-focus-visible w-[70px] border-0 border-b-1" @blur="onblurRecordedKey(item)">
                                  <span v-else>{{ item.intervalTime }}ms</span>
                                </div>
                              </div>
                            </ElSpace>
                          </div>

                          <ElSpace>
                            <!-- <ElIcon size="20">
                              <ArrowUpBold />
                            </ElIcon>
                            <ElIcon size="20">
                              <ArrowDownBold />
                            </ElIcon> -->
                            <ElIcon size="20" @click.stop="recordedKeys.splice(index, 1)">
                              <Delete />
                            </ElIcon>
                          </ElSpace>
                        </li>
                      </ul>
                    </div>
                    <div class="hiddinbg absolute right-[-18px] top-11px h-95%">
                      <ElSlider v-model="keyboardRecordingListScrollPercentage" vertical :show-tooltip="false" />
                    </div>
                    <!-- <el-slider vertical height="367px" class="absolute" /> -->
                  </div>
                </div>

                <div style="margin-left: 20px;flex-direction: column; justify-content: end;" class="flex">
                  <div class="flex items-center" style="width: 123px;height: 123px; background-color: #242424;flex-direction: column; padding-top: 25px;border-radius: 10px;" :style="{ background: isRecording ? '#DAFF00' : '#242424', color: isRecording ? '#333' : '#fff' }" @click="onClickPecordBtn">
                    <div style="width: 17px;height: 17px;border-radius: 50%; background: #FF0000; margin-bottom: 10px;" />
                    <div>{{ isRecording ? t('macro.stopRecording') : t('macro.startRecording') }}</div>
                    <div>{{ t('macro.recordMacro') }}</div>
                  </div>
                  <div style="height: 63px; line-height: 63px; text-align: center; width: 123px;border: 1px solid #DAFF00; border-radius: 10px;margin-top: 20px;background:#242424 ;" @click="saveMacro">
                    <!-- 保 存 -->
                    {{ t('macro.saveMacro') }}
                  </div>
                </div>
              </div>
            </Transition>
            <Transition name="slide-up">
              <div v-show="activeBg === 'advanced'" class="absolute flex justify-between" style="width: 1543px ;height: 433px; border-radius: 10px; border: 1px solid #333333;background: #0D0D0D; ">
                <div style="padding: 25px 25px 0 25px;">
                  <div>
                    <div style="font-size: 20px; display: flex; align-items: center;">
                      <div style="width: 170px; margin-right: 10px;" class="flex items-center">
                        <div style="text-align:left;">
                          {{ t('macro.dynamicSensitivity') }}
                        </div>
                        <img
                          style="margin-left: 10px;margin-right: 30px;" :src="`/v9/wenhao${imgActive ? '_active' : ''}.png`" srcset=""
                          @mouseenter="showMouseenterChange('showMouseenter')"
                          @mouseleave="showMouseenterChange('showMouseenter')"
                        >
                      </div>
                      <div
                        class="flex items-center" style="position: relative;  width: 51px; height: 25px; border:1px solid #8B8A8A; border-radius: 30px; background-color: #242424;overflow: hidden;"
                        @click="radioChange1"
                      >
                        <transition name="right-fade">
                          <div
                            :key="!!profileInfo.sensitivity" class="absolute" :class="[!!profileInfo.sensitivity ? 'right-0.5' : 'left-0.5']"
                            style="width: 19px;height: 19px;border-radius: 50%;"
                            :style="{ backgroundColor: !!profileInfo.sensitivity ? '#DAFF00' : '#8B8A8A' }"
                          />
                        </transition>
                      </div>
                    </div>
                    <div style="width: 180px; text-align: left; color: #A6A6A6;margin-top: 20px;">
                      <!-- 选择你喜欢的鼠标速度或 自定义加速输出。 -->
                      {{ t('description.main_ui_heading') }}
                    </div>
                  </div>

                  <div style="margin-top: 30px;">
                    <div style="font-size: 20px; display: flex; align-items: center;">
                      <div style="width: 170px;" class="flex items-center">
                        <div>20K FPS</div>
                      </div>
                      <div
                        class="flex items-center" style="position: relative;  width: 51px; height: 25px; border:1px solid #8B8A8A; border-radius: 30px; background-color: #242424;overflow: hidden;"
                        @click="radioChange"
                      >
                        <transition name="right-fade">
                          <div
                            :key="profileInfo.FPS" class="absolute" :class="[profileInfo.FPS ? 'right-0.5' : 'left-0.5']"
                            style="width: 19px;height: 19px;border-radius: 50%;"
                            :style="{ 'background-color': profileInfo.FPS ? '#DAFF00' : '#8B8A8A' }"
                          />
                        </transition>
                      </div>
                    </div>
                  </div>

                  <div style="margin-top: 50px;">
                    <div style="font-size: 20px; display: flex; align-items: center;">
                      <div style="width: 170px;" class="flex items-center">
                        <div style="text-align:left">
                          {{ t('title.straight_line_correction') }}
                        </div>
                      </div>
                      <div
                        class="flex items-center" style="position: relative;  width: 51px; height: 25px; border:1px solid #8B8A8A; border-radius: 30px; background-color: #242424;overflow: hidden;"
                        @click="lineUpdate"
                      >
                        <transition name="right-fade">
                          <div
                            :key="profileInfo.lineUpdate" class="absolute" :class="[profileInfo.lineUpdate ? 'right-0.5' : 'left-0.5']"
                            style="width: 19px;height: 19px;border-radius: 50%;"
                            :style="{ backgroundColor: profileInfo.lineUpdate ? '#DAFF00' : '#8B8A8A' }"
                          />
                        </transition>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="absolute right-0 flex justify-between" style="width:1250px" :style="{ opacity: showMouseenter === 'show' ? 1 : 0 }">
                  <div v-if="!profileInfo.sensitivity" class="absolute h-100% w-100%" style="z-index:1; background: #0D0D0D;" />
                  <div style="padding: 25px 25px 0 25px; flex:1;">
                    <div class="ml-25 flex items-center" style="height: 40px;">
                      <div class="icon-box">
                        <ElIcon size="18" @click.stop="changeYAxisMax(-1.5)">
                          <Plus />
                        </ElIcon>
                        <ElIcon size="18" @click.stop="changeYAxisMax(1.5)">
                          <Minus />
                        </ElIcon>
                      </div>
                      <div v-if="[3, 4, 5, 6].includes(profileInfo.sensitivityModeIndex)" class="ml-15 flex items-center">
                        <span class="mr-3">{{ t('title.select_preset') }}</span>
                        <div class="mode-box relative flex items-center pl-10" style="height: 32px;  background-color: #242424;border-radius: 30px" @mouseenter="changeModeShow" @mouseleave="changeModeHide">
                          <span
                            v-for="item in sortedItems"
                            :key="item.id"
                            class="mr-10"
                            @click="selectMode(item.id)"
                          >
                            {{
                              {
                                4: t('title.sensitivity_preset_classic'),
                                5: t('title.sensitivity_preset_natural'),
                                6: t('title.sensitivity_preset_jump'),
                                3: t('title.none'),
                              }[item.id]
                            }}
                          </span>
                          <ElIcon class="absolute right-3" style="margin-left: 15px;" size="20" color="#DAFF00">
                            <ArrowDownBold v-if="!modeShow" />
                            <ArrowRightBold v-else />
                          </ElIcon>
                        </div>
                      </div>
                    </div>
                    <p style="transform: rotate(90deg) translate(-50%);position: absolute; transform-origin: left;top: 50%;">
                      <span> {{ t('title.output_input_ratio') }}</span>
                    </p>
                    <div style="width:100%" class="relative flex">
                      <div id="myChart" style="flex:1; height:350px;" />
                      <div class="icon-box absolute bottom-0 right-0">
                        <ElIcon size="18" @click.stop="changeXAxisMax(35)">
                          <Minus />
                        </ElIcon>
                        <ElIcon size="18" @click.stop="changeXAxisMax(-35)">
                          <Plus />
                        </ElIcon>
                      </div>
                      <p class="absolute bottom-0 left-[50%]" style="transform: translate(-50%);">
                        {{ t('title.input_speed') }}
                      </p>
                    </div>
                  </div>
                  <div class="config-child-box" style="flex-direction: column; margin-left: 30px; justify-content: center;padding-right:10px">
                    <span style="margin-bottom: 35px;" :class="{ active: profileInfo.sensitivityModeIndex === 0 }" @click="selectMode(0)">{{ t('title.sensitivity_preset_classic') }}</span>
                    <span style="margin-bottom: 35px;" :class="{ active: profileInfo.sensitivityModeIndex === 1 }" @click="selectMode(1)">{{ t('title.sensitivity_preset_natural') }}</span>
                    <span style="margin-bottom: 35px;" :class="{ active: profileInfo.sensitivityModeIndex === 2 }" @click="selectMode(2)">{{ t('title.sensitivity_preset_jump') }}</span>
                    <!-- 自定义 -->
                    <span style="margin-bottom: 35px;" :class="{ active: [3, 4, 5, 6].includes(profileInfo.sensitivityModeIndex) }" @click="selectMode(4)">{{ t('title.sensitivity_preset_custom') }}</span>
                  </div>
                </div>
                <Transition name="slide-right">
                  <div v-show="showMouseenter === 'showMouseenter'" style="padding: 25px 100px 0 25px;justify-content: flex-end; background-image: linear-gradient(to right, #0D0D0D 30%, #31350F, #A5AA5290); z-index:1;border-radius: 10px;" class="flex">
                    <div style="margin-right: 50px;">
                      <div style="font-size: 20px;text-align: left">
                        {{ t('macro.dynamicSensitivity') }}
                      </div>
                      <div style="text-align: left; color: #A6A6A6;margin-top: 10px;">
                        {{ t('description.main_ui_subheading') }}
                      </div>
                    </div>
                    <div style="text-align: left;">
                      <p>{{ t('description.main_ui_description') }}</p>
                      <p>· {{ t('title.sensitivity_preset_classic') }}:{{ t('description.sensitivity_preset_classic') }}</p>
                      <p>· {{ t('title.sensitivity_preset_natural') }}:{{ t('description.sensitivity_preset_natural') }}</p>
                      <p>· {{ t('title.sensitivity_preset_jump') }}:{{ t('description.sensitivity_preset_jump') }}</p>
                      <p> &nbsp;&nbsp;{{ t('description.sensitivity_preset_jump1') }}</p>
                      <p>· {{ t('title.sensitivity_preset_custom') }}:{{ t('description.sensitivity_preset_custom') }}</p>
                      <AnimateCanvas
                        :width="593"
                        :height="287"
                        :img-length="71"
                        :end-stop="false"
                        url="/advanced/1_0"
                      />
                    </div>

                    <!-- <ElIcon size="40" style="position: absolute; right: 10px; top: 10px;" @click="showMouseenter = 'show'">
                      <Close />
                    </ElIcon> -->
                  </div>
                </Transition>
                <Transition name="slide-right">
                  <div v-show="showMouseenter === 'FPS'" style="width: 75%; padding: 25px 25px 0 25px; background-image: linear-gradient(to right, #0D0D0D 30%, #31350F, #A5AA5290); z-index:1;border-radius: 10px;" class="flex">
                    <div>
                      <div style="font-size: 20px;text-align: left">
                        20K FPS
                      </div>
                      <div style="text-align: left; color: #C8EA01;margin-top: 10px;">
                        {{ t('description.high_performance_warning_20k') }}
                      </div>

                      <div class="mt-20 flex">
                        <div class="button mr-10" @click="FPSChange(0)">
                          {{ t('macro.cancel') }}
                        </div>
                        <div class="button1" @click="FPSChange(1)">
                          {{ t('macro.confirm') }}
                        </div>
                      </div>
                    </div>

                    <ElIcon size="40" style="position: absolute; right: 10px; top: 10px;" @click="showMouseenter = 'show'">
                      <Close />
                    </ElIcon>
                  </div>
                </Transition>
                <Transition name="slide-right">
                  <div v-show="showMouseenter === 'FPS1'" style="padding: 25px 25px 0 25px; background-image: linear-gradient(to right, #0D0D0D 30%, #31350F, #A5AA5290); z-index:1; border-radius: 10px;" class="flex">
                    <div>
                      <div style="font-size: 20px;text-align: left">
                        20K FPS
                      </div>
                      <div style="width: 410px; text-align: left; color: #C8EA01;margin-top: 10px;">
                        {{ t('description.high_performance_warning_20k') }}
                      </div>

                      <div style="width: 410px; text-align: left; color: #C8EA01;margin-top: 10px; line-height: 18px;">
                        {{ t('description.high_performance_requirement') }}
                      </div>

                      <div class="mt-20 flex">
                        <div class="button mr-10" @click="FPSChange(0)">
                          {{ t('macro.cancel') }}
                        </div>
                        <div class="button1" @click="FPSChange(1)">
                          {{ t('macro.confirm') }}
                        </div>
                      </div>
                    </div>
                    <img src="/v9/huibao.png" alt="" srcset="">
                  </div>
                </Transition>
                <Transition name="slide-right">
                  <div v-show="showMouseenter === 'line'" style="padding: 25px 25px 0 25px; background-image: linear-gradient(to right, #0D0D0D 30%, #31350F, #A5AA5290); z-index:1; border-radius: 10px;" class="flex">
                    <div>
                      <div style="font-size: 20px;text-align: left">
                        {{ t('title.straight_line_correction') }}
                      </div>

                      <div style="width: 410px; text-align: left; color: #C8EA01;margin-top: 10px;">
                        {{ t('title.straight_line_correction_action') }} <br>{{ t('title.straight_line_correction_reason') }}
                      </div>

                      <div style="width: 380px; text-align: left; color: #E80872;margin-top: 10px; line-height: 18px;">
                        {{ t('title.straight_line_correction_warning') }}
                      </div>

                      <div class="mt-20 flex">
                        <div class="button mr-10" @click="lineUpdateSent(0)">
                          {{ t('macro.cancel') }}
                        </div>
                        <div class="button1" @click="lineUpdateSent(1)">
                          {{ t('macro.confirm') }}
                        </div>
                      </div>
                    </div>
                    <div style="height:297px;width:593px;">
                      <AnimateCanvas
                        :width="593"
                        :height="297"
                        :img-length="60"
                        :end-stop="false"
                        url="/01/01_00000_0"
                      />
                    </div>
                  </div>
                </Transition>
              </div>
            </Transition>
          </div>
        </div>
        <div class="absolute right-[25px] top-[-56px] flex items-center">
          <div v-if="loadingShow" class="flex items-center">
            <p style="font-size: 16px;color: #DAFF00;" class="mr-3">
              {{ t('description.settings_saved') }}
            </p>
            <AnimateLoading />
          </div>
          <img v-show="!getUpdateFlag" src="/v9/setting.png" alt="mouse-card" class="ml-6" @click="toSettings">
          <div v-show="getUpdateFlag" style="position: relative;">
            <img src="/v9/setting_active.png" alt="mouse-card" class="ml-6" @click="toSettings">
            <span style="position: absolute;left: 64%;top: 15%;">1</span>
          </div>
        </div>
      </div>

      <Transition name="bottom-opacity">
        <div v-if="bottomItem === 1" class="bottom-box bottom-box1 relative">
          <p class="mb-3 mt-3" style="font-size: 18px;line-height: 40px;">
            {{ t('description.competitive_mode_description') }}
          </p>
          <p style="font-size: 18px;line-height: 40px; ">
            {{ t('description.competitive_mode_description1') }} <span style="color: red">{{ t('description.competitive_mode_description2') }}</span>
          </p>

          <div class="flex" style="margin-top: 30px;">
            <div class="config-child-box config-child-box1 mr-2" @click="bottomItem = 0">
              <span>{{ t('button.cancel') }}</span>
            </div>
            <div class="config-child-box" @click="onSportsMode(1)">
              <span class="active">{{ t('macro.confirm') }}</span>
            </div>
          </div>
        </div>

        <div v-else-if="bottomItem === 2" class="bottom-box bottom-box1 relative">
          <div class="config-child-box absolute" style=" margin-left: -50px; left: 50%; top: 150px;">
            <span class="active">{{ t('button.save') }}</span>
          </div>

          <p class="mb-3 mt-3" style="font-size: 18px;line-height: 40px;">
            {{ t('description.performance_mode_description') }}
          </p>
          <p style="font-size: 18px;line-height: 40px; color: red;">
            {{ t('description.power_consumption_increase_note') }}
          </p>
        </div>

        <div v-else-if="bottomItem === 3" class="bottom-box bottom-box1 relative">
          <p class="mb-3" style="font-size: 18px;line-height: 40px;">
            {{ t('description.receiver_pairing_instructions') }}
          </p>

          <div style="width: 100%;height: 400px;">
            <MouseCarouseItem />
          </div>

          <!-- <img class="mb-10 h-240px" :src="`/slideshow/2_${locale}.png`" alt="item.title"> -->

          <div class="config-child-box absolute" style="margin-left: -50px; left: 50%; bottom: 60px;" @click="bottomItem = 0">
            <span class="active">{{ t('macro.confirm') }}</span>
          </div>
        </div>

        <div v-else-if="bottomItem === 4" class="bottom-box bottom-box1 relative">
          <p style="font-size: 18px;line-height: 40px;">
            {{ t('description.factory_reset_confirmation') }}
          </p>
          <p class="mb-3" style="font-size: 18px;line-height: 40px;">
            {{ t('description.factory_reset_confirmation1') }}
          </p>

          <div class="config-child-box absolute" style="margin-left: -150px; left: 50%; bottom: 100px;" @click="onRestoreFactorySettings">
            <span class="active">{{ t('macro.confirm') }}</span>
          </div>
          <div class="config-child-box absolute" style="margin-left: 5px; left: 50%; bottom: 100px;" @click="bottomItem = 0">
            <span class="button" style="border: 1px solid #daff00;">{{ t('button.cancel') }}</span>
          </div>
        </div>

        <div v-else-if="bottomItem === 5" class="bottom-box bottom-box1 relative">
          <p style="font-size: 18px;line-height: 40px;">
            <!-- 必须保留左键 -->
            {{ t('description.left_button_restriction') }}
          </p>
          <p class="mb-3" style="font-size: 18px;line-height: 40px;">
            {{ t('description.left_button_restriction1') }}
          </p>

          <div class="config-child-box absolute" style="margin-left: -50px; left: 50%; bottom: 100px;" @click="bottomItem = 0">
            <span class="active">{{ t('macro.confirm') }}</span>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style>
  .hid-container {
  height: 1080px;
  background-image: url('/v9/bg-w.png');
  background-size: 100% 100%;
  background-position: center center;
  background-repeat: no-repeat;
  padding: 32px 0px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  transform-origin: 0 0;
  width: 100%;

  .mouse {
    width: 186px;
    height: 352px;
    top: 0;
  }

  .bottom-con {
    width: 100%;
    height: 614cm;
    display: flex;
    justify-content: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    /* display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center; */
  }

  .config-box {
    width: 994px;
    height: 60px;
    display: flex;
    justify-content: space-around;
    border-radius: 27px;
    border: 1px solid #ffffff;
    align-items: center;
    margin-bottom: 10px;
    background-color: rgba(255, 255, 255, 0.1);
    /* position: absolute;
    bottom: 524px;
    left: 50%;
    margin-left: -497px; */
  }

  .bottom-box {
    width: 1783px;
    height: 524px;
    border: 1px solid #333333;
    border-radius: 30px;
    background: #060606;
    padding: 10px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    /* position: absolute;
    bottom: 0px; */
    /* left: 0; */
  }

  .bottom-box1 {
    background-image: url('/v9/bg-b.png');
    background-size: 100% 90%;
    /* background-position: center center; */
    background-repeat: no-repeat;
    z-index: 1;
    position: absolute;
    bottom: 0;
    height: 533px;
    /* background-image: linear-gradient(to bottom, #5E6719 10px, #0E0E0D); */
  }

  .bottom-box .config-child-box {
    display: flex;
    padding-right: 10321;
  }

  .config-child-box1 span {
    border: 1px solid #daff00 !important;
    background-color: #333333 !important;
  }

  .bottom-box .config-child-box span {
    min-width: 123px;
    width: 100%;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #333333;
    border-radius: 30px;
    margin-right: 30px;
    font-size: 16px;
    background-color: #242424;
    padding: 0 7px;
  }

  .button {
    width: 142px;
    height: 42px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #daff00;
    border-radius: 30px;
    font-size: 16px;
    background-color: #242424;
    color: '#fff';
  }
  .button1 {
    width: 142px;
    height: 42px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #daff00;
    border-radius: 30px;
    font-size: 16px;
    color: #333;
  }

  .bottom-box .config-child-box span.active {
    background-color: #daff00;
    color: #060606;
  }

  .bottom-box .config-child-box span:last-child {
    margin-right: 0px;
  }

  .cross-horizontal,
  .cross-vertical {
    position: absolute;
  }

  .cross-horizontal {
    top: 50%;
    left: 0;
    width: 100%;
    border: 1px dashed #363d0a;
    transform: translateY(-50%);
  }

  .cross-vertical {
    left: 50%;
    top: 0;
    border: 1px dashed #363d0a;
    height: 100%;
    transform: translateX(-50%);
  }

  .left-item-box > div {
    padding-right: 35px;
    font-size: 20px;
    width: 219px;
    height: 107px;
    line-height: 107px;
    background-image: url('/v9/bg.png');
    background-size: 84% 54%;
    background-repeat: no-repeat;
    background-position: -15px center;
  }

  .left-item-box > div.activeBg {
    width: 219px;
    height: 107px;
    line-height: 100px;
    background-size: 100% 100%;
    background-image: url('/v9/active-bg.png');
    background-position: -15px center;
  }

  .right-f-b {
    border: 1px solid #333333;
    width: 653px;
    height: 433px;
    border-radius: 15px;
  }

  .right-s-b {
    border: 1px solid #333333;
    width: 493px;
    height: 433px;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .block_item {
      border-radius: 5px;
    }

    .block_item.active {
      color: #333;
      background-color: #daff00 !important;
    }
    .block_item:hover {
      color: #333;
      background-color: #daff00 !important;
    }
  }

  .right-t-b {
    border: 1px solid #333333;
    width: 377px;
    height: 433px;
    border-radius: 15px;
  }

  .triangle {
    margin: 10px auto;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 12px solid red;
  }
  .triangle1 {
    border-bottom: 12px solid red;
  }
  .triangle2 {
    border-bottom: 12px solid #34b4d7;
  }

  .triangle3 {
    border-bottom: 12px solid #6cb461;
  }

  .triangle4 {
    border-bottom: 12px solid #ffffff;
  }

  .triangle5 {
    border-bottom: 12px solid #dfdc54;
  }

  .triangle-top {
    background-color: #242424;
    border-radius: 10px;
  }

  .triangle-top > div:nth-child(2) {
    background-color: #333;
  }

  .triangle-top.active {
    background-color: #daff00;
    color: #333333;
  }

  .triangle-top.active > div:nth-child(2) {
    color: #fff;
  }

  .triangle-top:hover {
    background-color: #daff00;
    color: #333333;
    > div:nth-child(2) {
      color: #fff;
    }
  }
  .hong {
    background-color: #daff00 !important;
    color: #333;
  }
  .hong_active:hover {
    background-color: #daff00 !important;
    color: #333;
  }

  .ahover:hover {
    background-color: #daff00 !important;
    color: #333;
  }

  .logo-box {
    padding: 3px;
    border-radius: 50px;
    transition: all 0.5s ease; /* 平滑过渡效果 */
    border: 1px solid transparent; /* 初始无边框 */
    cursor: pointer; /* 鼠标悬停样式 */
    height: 46px;
    overflow: hidden;
  }

  .logo-box:hover {
    height: 254px;
  }

  .color-box {
    transition: all 0.5s ease; /* 平滑过渡效果 */
    border: 1px solid transparent; /* 初始无边框 */
    cursor: pointer; /* 鼠标悬停样式 */
    height: 30px;
    overflow: hidden;
  }

  .color-box:hover {
    height: 64px;
  }

  .mode-box {
    transition: all 0.5s ease; /* 平滑过渡效果 */
  }

  .mode-box:hover {
    /* width: 320px !important; */
  }

  .mode-box span:hover {
    color: #daff00;
  }

  .charu:hover {
    overflow: visible !important;
  }

  .charu li:hover {
    background-color: #daff00;
    color: #333;
  }

  .icon-box {
    width: 73px;
    height: 29px;
    display: flex;
    align-items: center;
    justify-content: space-around;
    background: #242424;
    border-radius: 30px;
  }

  .text-ellipsis {
    border-bottom: 1px solid #fff;
  }

  --el-color-primary: #b8e200;

  .hiddinbg {
    .el-slider {
      --el-border-color-light: transparent;
      --el-slider-height: 4px;
    }
    .el-slider__bar {
      background-color: transparent;
    }
  }

  .el-slider {
    --el-border-color-light: #637806;
    --el-slider-height: 4px;
  }

  .el-slider__button {
    --el-slider-main-bg-color: #daff00;
    background-color: #daff00;
  }

  /* 滑块颜色 */
  .el-slider__button-wrapper {
    --el-slider-button-wrapper-offset: -17px;
  }

  .el-scrollbar {
    /* --el-scrollbar-bg-color: transparent */
  }

  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.25s ease-out;
  }
  .slide-up-enter-from {
    opacity: 0;
    transform: translateY(30px);
  }
  .slide-up-leave-to {
    opacity: 0;
    transform: translateY(-30px);
  }

  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: all 0.25s ease-out;
  }
  .slide-right-enter-from {
    opacity: 0;
    transform: translateX(30px);
  }
  .slide-right-leave-to {
    opacity: 0;
    transform: translateX(-30px);
  }

  .bottom-opacity-enter-active,
  .bottom-right-leave-active {
    transition: all 0.25s ease-out;
  }
  .bottom-opacity-enter-from {
    opacity: 0;
    transform: translateY(40px);
  }
  .bottom-opacity-leave-to {
    opacity: 0;
    transform: translateY(-40px);
  }

  .profile-item .profile-input {
    flex: 1;
    border-bottom: 1px solid #ffffff;

    .el-input__inner {
      text-align: center;
    }

    --el-input-bg-color: transparent;
    --el-fill-color-blank: transparent;
    --el-input-border-color: transparent;
    --el-border-color: transparent;
    --el-input-focus-border-color: transparent;
    --el-input-hover-border-color: transparent;
    --el-input-text-color: #fff;
  }
}
.el-dropdown-menu__item {
  width: 90%;
  display: flex;
  justify-content: center;
  border-radius: 5px;
  padding: 0 16px;
  margin-bottom: 5px;
}
.el-dropdown-menu__item:not(.is-disabled):focus {
  background-color: #daff00;
  color: #333;
}
.el-dropdown-menu__item:hover {
  background-color: #daff00 !important;
  color: #333 !important;
}

.custom-popper {
  top: 40px !important;
  left: 0px !important;
  width: 100%;
  .el-dropdown-menu {
    background-color: #212121;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 5px;
  }
}

.slider1 .el-slider__button {
  position: relative;
}

.slider2 .el-slider__button {
  position: relative;
}

.slider1 .el-slider__button::after {
  position: absolute;
  width: 10px;
  height: 10px;
  content: 'X';
  color: #333;
  left: 50%;
  top: -6%;
  margin-left: -5px;
}

.slider2 .el-slider__button::after {
  position: absolute;
  width: 10px;
  height: 10px;
  content: 'Y';
  color: #333;
  left: 50%;
  top: -6%;
  margin-left: -5px;
}
</style>
