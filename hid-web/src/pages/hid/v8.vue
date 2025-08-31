<script setup lang="ts">
import { ArrowDown, ArrowDownBold, ArrowRight, ArrowRightBold, ArrowUpBold, Close, Delete, Download, Plus,Minus, Upload, VideoPause, VideoPlay } from '@element-plus/icons-vue'

import {
  ElAlert,
  ElBadge,
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElInputNumber,
  ElLoading,
  ElMessage,
  ElMessageBox,
  ElProgress,
  ElScrollbar,
  ElSlider,
  ElSpace,
} from 'element-plus'

const scale = ref(`scale(${document.body.clientWidth / 1920})`)

export type MouseButtonType = 'Left' | 'Right' | 'Wheel' | 'Forward' | 'Back' | 'dpi'
const mouseButton: MouseButtonType[] = ['Left', 'Right', 'Wheel', 'Forward', 'Back', 'dpi']

// 引入 echarts 核心模块，核心模块提供了 echarts 使用必须要的接口。
import * as echarts from 'echarts/core';
// 引入柱状图图表，图表后缀都为 Chart
import { LineChart } from 'echarts/charts';
// 引入标题，提示框，直角坐标系，数据集，内置数据转换器组件，组件后缀都为 Component
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  GraphicComponent
} from 'echarts/components';
// 标签自动布局、全局过渡动画等特性
import { LabelLayout, UniversalTransition } from 'echarts/features';
// 引入 Canvas 渲染器，注意引入 CanvasRenderer 或者 SVGRenderer 是必须的一步
import { CanvasRenderer } from 'echarts/renderers';

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
  CanvasRenderer
]);

const sliderDefaultSelectOptions = {
  jitter_elimination_slider: [{
    label: '6ms',
    value: 6,
  }, {
    label: '4ms',
    value: 4,
  }, {
    label: '2ms',
    value: 2,
  }, {
    label: '0ms',
    value: 0,
  }],
  polling_slider: [{
    label: '8000',
    value: 6,
  }, {
    label: '4000',
    value: 5,
  }, {
    label: '2000',
    value: 4,
  }, {
    label: '1000',
    value: 3,
  }, {
    label: '500',
    value: 2,
  }, {
    label: '250',
    value: 1,
  }, {
    label: '125',
    value: 0,
  }],
  dpi_slider: [{
    label: '3200',
    value: 3200,
  }, {
    label: '2400',
    value: 2400,
  }, {
    label: '1400',
    value: 1400,
  }, {
    label: '800',
    value: 800,
  }],
  hibernation_slider: [{
    label: '90s',
    value: 90,
  }, {
    label: '60s',
    value: 60,
  }, {
    label: '30s',
    value: 30,
  }, {
    label: '10s',
    value: 10,
  }],
  lod_slider: [{
    label: '2mm',
    value: 2,
  }, {
    label: '1mm',
    value: 1,
  }, {
    label: '0.7mm',
    value: 0,
  }],
  // angle_slider: [{ label: '-30', value: 1 },{ label: '-10', value: 2 },{ label: '0', value: 3 },{ label: '15', value: 4 },{ label: '30', value: 5 }],
  angle_slider: [{
    label: '-30°',
    value: -30,
  }, {
    label: '-10°',
    value: -10,
  }, {
    label: '15°',
    value: 15,
  }, {
    label: '30°',
    value: 30,
  }],
}
const sliderOptions = {
  jitter_elimination_slider: {
    min: 0,
    max: 6,
    step: 2,
  },
  polling_slider: {
    min: 0,
    max: 6,
    step: 1,
  },
  dpi_slider: {
    min: 100,
    max: 30000,
    step: 50,
  },
  hibernation_slider: {
    min: 1,
    max: 90,
    step: 1,
  },
  lod_slider: {
    min: 0,
    max: 2,
    step: 1,
  },
  angle_slider: {
    min: -30,
    max: 30,
    step: 1,
  },
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
    macroList: [{
      name: '',
      connections: [],
      value: [],
    }, {
      name: '',
      connections: [],
      value: [],
    }, {
      name: '',
      connections: [],
      value: [],
    }, {
      name: '',
      connections: [],
      value: [],
    }], // cycleTimes: 0-40（循环次数）, cycleMode: 1-4(循环直到此按键松开，循环直到任意按键按下，循环直到此按键再次按下，循环次数模式)      // { name: '鼠标宏名称1', connections: [{keyid: 'Left', cycleTimes: 40, cycleMode: 1}], value: [{ keyCode: 1, keyStatus: 0, intervalTime: 200 }] },    ] as Macro[],
  }
}

const profileInfo = reactive(initProfileInfo())

provide < ProfileInfoType > ('profileInfo', profileInfo)

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

let hover = ref(false)
let hoverSrc = ref('/public/v9/wenhao_active.png')
let originalSrc = ref('/public/v9/wenhao.png')


const imageToDisplay = computed(()=>{
  return hover.value ? hoverSrc.value : originalSrc.value; 
})

const radioActive = ref(false)

function radioChange() {
  radioActive.value = !radioActive.value
}
const activeBg = ref('performance')

function activeBgChange(type) {
  if (activeBg.value === type) {
    return
  }
  activeBg.value = type

  if(type == 'advanced'){
    nextTick(()=>{
      initEcharts()
    })
  }
}

const startXYFlag = ref(false)

function startXY(){
  startXYFlag.value = !startXYFlag.value
}




const initEcharts = ()=>{
  var myChart = echarts.init(document.getElementById('myChart'))
  const symbolSize = 20;
  const data = [
    [0, 1],
    [18, 1.2],
    [50, 1],
    [60, 1.5],
    [80.1, 0.5]
  ];
  let option = {

    grid: {
      top: '8%',
      bottom: '20%',
      left:"10%",
      right: '3%'
    },
    xAxis: {
      min: 0,
      max: 105,
      type: 'value',

      splitLine:{
        lineStyle:{
          color: '#262626', // 轴线颜色
          width: 1,
          type:'dashed'

        }
      },
      axisLine: { 
        onZero: false,
        lineStyle: {
          color: '#DAFF00'
        } 
      }
    },
    yAxis: {
      min: 0,
      max: 1.5,
      type: 'value',
      splitLine:{
        lineStyle:{
          color: '#262626', // 轴线颜色
          width: 1,
          type:'dashed'
        }
      },
      axisLine: { 
        onZero: false,
        lineStyle: {
          color: '#DAFF00'
        } 
      }
    },

    series: [
      {
        id: 'a',
        type: 'line',
        smooth: true,
        symbolSize: symbolSize,
        data: data,
        itemStyle: {
          color: '#DAFF00'  // 折线点颜色（番茄色）
        },
        lineStyle: {
          color: '#DAFF00', // 折线颜色（皇家蓝）
          width: 3
        }
      }
    ]
  };

  myChart.setOption(option)
  
  setTimeout(function () {
    // Add shadow circles (which is not visible) to enable drag.
    myChart.setOption({
      graphic: data.map(function (item, dataIndex) {
        return {
          type: 'circle',
          position: myChart.convertToPixel('grid', item),
          shape: {
            cx: 0,
            cy: 0,
            r: symbolSize / 2
          },
          invisible: true,
          draggable: true,
          ondrag: function (dx, dy) {
            onPointDragging(dataIndex, [this.x, this.y]);
          },
          z: 100
        };
      })
    });
  }, 0);


  function onPointDragging(dataIndex, pos) {
    data[dataIndex] = myChart.convertFromPixel('grid', pos);
    // Update data
    myChart.setOption({
      series: [
        {
          id: 'a',
          data: data
        }
      ]
    })
  }
  }

let bottomItem = ref(0)

function bottomItemChange(type) {
  // if(type == 1){
  //   bottomItem.value = 2
  //   return
  // }
  if (bottomItem.value === type) {
    return
  }
  bottomItem.value = type

}



</script>

<template>
  <div :style="{ width: '1920px', transform: scale }" class="hid-container">
    <a class="absolute left-30px top-30px" href="https://baidu.com" target="_blank">
      <img class="h-45px" src="/logo.png" alt="logo">
    </a>

    <div class="logo-box absolute right-90px top-50px" >
      <img class="h-45px" src="/v9/china.png" alt="logo" style="margin-bottom: 5px;">
      <img class="h-45px" src="/v9/china.png" alt="logo" style="margin-bottom: 5px;">
      <img class="h-45px" src="/v9/china.png" alt="logo" style="margin-bottom: 5px;">
      <img class="h-45px" src="/v9/china.png" alt="logo" style="margin-bottom: 5px;">
      <img class="h-45px" src="/v9/china.png" alt="logo" style="margin-bottom: 5px;">
    </div>

    <div style="flex: 1;">
      <div class="flex" style="flex-direction: column;align-items: center;margin-bottom: 20px;">
        <div class="flex" style="align-items: center;font-size: 16px;">
          40%
          <!-- 电量图标 -->
          <!-- v-if="chargingStatus === 1" -->
          <!-- :class="profileInfo.battery_level == 100 ? 'color-green-500' : 'color-yellow-500'"  -->
          <div class="h-6 w-6">
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
        <!-- :percentage="profileInfo.battery_level" -->
        <ElProgress color="#67c23a" style="width: 115px;" :percentage="40" :show-text="false" />
      </div>

      <div style="position: relative;">
        <!-- 鼠标图片 -->
        <!-- :class="['', 'opacity-20', 'opacity-30'][profileInfo.sports_arena]" -->
        <img src="/v9/mouse1.png" alt="mouse-card" class="mouse">

        <!-- sports_arena 竞技模式图片 -->
        <!-- ${profileInfo.sports_arena} -->
        <!-- <img class="absolute" src="/sports_arena_1.png" alt="sports_arena" style="top: 75px;"> -->

        <!-- 鼠标后旋转背景图 -->
        <!-- :class="['', 'opacity-20', 'opacity-30'][profileInfo.sports_arena]" -->
        <!-- <img
          class="absolute top-0 transform" src="/mouse3.png" alt="mouse-card" draggable="false"
          :style="{ transform: `rotate(0deg)` }"
        > -->

        <!-- 鼠标左侧设置按钮功能 -->
        <!-- @mouseenter="setLeftHintCode('button_ball')" -->
        <!-- @change="onMouseButtonChange" -->
        <!-- :value="mouseButtonValue" -->
        <MouseButton
          ref="mouseButtonRef" :value="mouseButtonValue" class="absolute right-0 h-full w-200%"
          style="top: -16px;"
        />
      </div>
    </div>
    <div class="bottom-con relative">
      <div class="config-box">
        <div class="flex items-center" @click="bottomItemChange(0)">
          <img src="/v9/Motion.png" alt="Motion" style="margin-right: 5px;">
          <span>运动模式</span>
        </div>
        <div class="flex items-center"  @click="bottomItemChange(1)">
          <img src="/v9/icon2.png" alt="Motion" style="margin-right: 5px;">
          <span>竞技模式</span>
        </div>
        <div class="flex items-center"  @click="bottomItemChange(3)">
          <img src="/v9/icon1.png" alt="Motion" style="margin-right: 5px;">
          <span>配对</span>
        </div>
        <div class="flex items-center">
          <img src="/v9/icon.png" alt="Motion" style="margin-right: 5px;">
          <span>恢复出厂</span>
        </div>
      </div>

      <Transition name="bottom-opacity">
        <div class="bottom-box" v-if="bottomItem == 0" >
          <div class="config-child-box">
            <span class="ahover active">配置 1</span>
            <span class="ahover">配置 2</span>
            <span class="ahover">配置 3</span>
            <span class="ahover">配置 4</span>
          </div>
          <div style="width: 100%;flex:1;align-items: center;" class="flex">
            <div class="left-item-box">
              <div :class="{ activeBg: activeBg == 'performance' }" @click="activeBgChange('performance')">
                性能
              </div>
              <div :class="{ activeBg: activeBg == 'hong' }" style="margin-bottom: 10px;" @click="activeBgChange('hong')">
                宏
              </div>
              <div :class="{ activeBg: activeBg == 'advanced' }" @click="activeBgChange('advanced')">
                高级
              </div>
            </div>
            <div style="position: relative;height: 100%; display: flex; align-items: center;">
              <Transition name="slide-up">
                <div v-if="activeBg == 'performance'"  class="flex absolute" >
                  <div class="right-f-b h-100" style="padding: 50px 25px 25px 25px;position: relative;">
                    <div class="flex items-center justify-between">
                      <span style="font-size: 20px;">DPI设置</span>
                      <div class="flex items-center">
                        <span style="display: inline-block; font-size: 30px;">+</span>
                        <span
                          style="margin: 0 15px; width: 24px; height: 24px; border-radius: 50%;background-color: #DAFF00;color: #333;"
                        >1</span>
                        <span style="display: inline-block; font-size: 30px;">-</span>
                      </div>
                    </div>

                    <div class="flex justify-between">
                      <div>
                        <div
                          class="triangle-top flex items-center"
                          style="width: 99.56px;height: 118px;border:1px dashed #fff;padding-top: 7px;flex-direction: column;"
                        >
                          <div style="font-size: 14px;margin-bottom: 30px;">
                            等级1
                          </div>
                          <div
                            style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                          >
                            400
                          </div>
                        </div>
                        <div class="triangle" />
                      </div>
                      <div>
                        <div
                          class="triangle-top active flex items-center"
                          style="width: 99.56px;height: 118px;border:1px dashed #fff;padding-top: 7px;flex-direction: column;"
                        >
                          <div style="font-size: 14px;margin-bottom: 30px;">
                            等级2
                          </div>
                          <div
                            style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                          >
                            400
                          </div>
                        </div>
                        <div class="triangle triangle1" />
                      </div>
                      <div>
                        <div
                          class="triangle-top flex items-center"
                          style="width: 99.56px;height: 118px;border:1px dashed #fff;padding-top: 7px;flex-direction: column;"
                        >
                          <div style="font-size: 14px;margin-bottom: 30px;">
                            等级3
                          </div>
                          <div
                            style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                          >
                            400
                          </div>
                        </div>
                        <div class="triangle triangle2" />
                      </div>
                      <div>
                        <div
                          class="triangle-top flex items-center"
                          style="width: 99.56px;height: 118px;border:1px dashed #fff;padding-top: 7px;flex-direction: column;"
                        >
                          <div style="font-size: 14px;margin-bottom: 30px;">
                            等级4
                          </div>
                          <div
                            style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                          >
                            400
                          </div>
                        </div>
                        <div class="triangle triangle3" />
                      </div>
                      <div>
                        <div
                          class="triangle-top flex items-center"
                          style="width: 99.56px;height: 118px;border:1px dashed #fff;padding-top: 7px;flex-direction: column;"
                        >
                          <div style="font-size: 14px;margin-bottom: 30px;">
                            等级5
                          </div>
                          <div
                            style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                          >
                            400
                          </div>
                        </div>
                        <div class="triangle triangle4" />
                      </div>
                    </div>

                    <div class="flex" style="margin-top: 12px;">
                      <span style="font-size: 20px; margin-right: 50px;" class="flex items-center">启用X-Y <img @click="startXY"
                        style="margin-left: 5px;" src="/public/v9/wenhao.png" alt="" srcset=""
                      ></span>
                      <div
                        class="flex items-center" style="position: relative;  width: 51px; height: 25px; border:1px solid #8B8A8A; border-radius: 30px; background-color: #242424;overflow: hidden;"
                        @click="radioChange"
                      >
                        <Transition name="right-fade">
                          <div
                            :key="radioActive" class="absolute" :class="[radioActive ? 'right-0.5' : 'left-0.5']"
                            style="width: 19px;height: 19px;border-radius: 50%;"
                            :style="{ &quot;background-color&quot;: radioActive ? &quot;#DAFF00&quot; : &quot;#8B8A8A&quot; }"
                          />
                        </Transition>
                      </div>
                    </div>
                    <!-- @mouseenter="setRightHintCode('dpi')" -->
                    <!-- <div class="transparent-slider" >

    </div> -->

                    <!-- @change="sendDpi(index)" -->
                    <CustomSlider
                      v-for="(_, index) in profileInfo.dpi_slider_list" :key="index"
                      v-model="profileInfo.dpi_slider_list[index]" class="dpi_slider absolute bottom-6 w-90%"
                      :bind="sliderOptions.dpi_slider" :default-select-options="sliderDefaultSelectOptions.dpi_slider"
                      :double-click-edit="true" :marks="{
                        [sliderOptions.dpi_slider.min]: `${sliderOptions.dpi_slider.min}`,
                        [sliderOptions.dpi_slider.max]: `${sliderOptions.dpi_slider.max}`,
                      }"
                    />
                  </div>

                  <div style="flex:1;" class="relative">
                    <Transition name="slide-right">
                      <div  class="flex absolute" style="flex:1;" v-if="!startXYFlag" >
                        <div  class="right-s-b" style="margin-left: 10px;padding: 50px 25px 25px 25px;position: relative;">
                          <div class="flex items-center justify-between">
                            <p style="font-size: 20px; width: 100px;text-align: right;">
                              轮询率(Hz)
                            </p>
                            <div class="flex items-center justify-between" style="flex: 1;margin-left: 20px;">
                              <div
                                class="block_item active"
                                style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                              >
                                400
                              </div>
                              <div
                                class="block_item"
                                style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                              >
                                400
                              </div>
                              <div
                                class="block_item"

                                style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                              >
                                400
                              </div>
                              <div
                                class="block_item"

                                style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                              >
                                400
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center justify-between">
                            <p style="font-size: 20px;width: 100px;text-align: right;">
                              LOD 高度
                            </p>
                            <div class="flex items-center justify-between" style="flex: 1;margin-left: 20px;">
                              <div
                                class="block_item"

                                style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                              >
                                0.7mm
                              </div>
                              <div

                                class="block_item active"
                                style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                              >
                                1mm
                              </div>
                              <div
                                class="block_item"

                                style="width: 69px;height: 25px; text-align: center;line-height: 25px; border:1px dashed #fff;"
                              >
                                2mm
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center justify-between">
                            <p style="font-size: 20px;width: 100px;text-align: right;">
                              响应时间
                            </p>
                            <CustomSlider
                              v-for="(_, index) in profileInfo.dpi_slider_list" :key="index"
                              v-model="profileInfo.dpi_slider_list[index]" class="dpi_slider absolute right-5 w-66%"
                              :bind="sliderOptions.dpi_slider" :default-select-options="sliderDefaultSelectOptions.dpi_slider"
                              :double-click-edit="true" :show-fixed="true"
                            />
                          </div>
                          <div class="flex items-center justify-between">
                            <p style="font-size: 20px;width: 100px;text-align: right;">
                              休眠时间
                            </p>
                            <!-- @mouseenter="setRightHintCode('hibernation')"
                            @change="sendHibernation" -->
                            <CustomSlider
                              v-model="profileInfo.hibernation_slider"
                              class="transparent-slider absolute right-5 w-66%" :bind="sliderOptions.hibernation_slider"
                              :default-select-options="sliderDefaultSelectOptions.hibernation_slider" :show-fixed="true"
                            />
                          </div>
                        </div>
                        <div
                          class="right-t-b"
                          style="margin-left: 10px;padding: 50px 25px 25px 25px;position: relative; flex-direction: column;"
                        >
                          <div class="flex" style="width: 100%;">
                            <span style="font-size: 20px; text-align: left;">旋转角度</span>
                          </div>
                          <img
                            class="absolute"
                            style="left: 50%; top: 50%; margin-left: -42px; margin-top: -96px; width: 84px;height:152px;"
                            src="/public/v9/mouse.png" alt="" srcset=""
                          >
                          <!-- @mouseenter="setRightHintCode('angle')"
                      @change="sendAngle" -->
                          <CustomSlider
                            v-model="profileInfo.angle_slider" class="absolute bottom-6 w-85%"
                            :bind="sliderOptions.angle_slider" :default-select-options="sliderDefaultSelectOptions.angle_slider"
                            :marks="{
                              [sliderOptions.angle_slider.min]: `${sliderOptions.angle_slider.min}`,
                              [sliderOptions.angle_slider.max]: `${sliderOptions.angle_slider.max}`,
                            }"
                          />
                        </div>
                      </div>
                      <div v-else style="width: 840px; margin-left: 30px; justify-content: center;align-items: center;  height:100%; flex-direction: column;background-image: linear-gradient(to right, #0E0E0D, #31350F, #A5AA5290);" class="absolute flex"  >
                        <p style="font-size: 30px;margin-bottom: 10px;">启用X-Y</p>
                        <span style="font-size: 16px;line-height: 24px;color: #FFFFFF;">开启该功能后可以分别设定鼠标在滑动时的x轴与y轴的灵敏度值。</span>
                        <div style="height:197px;width:593px;margin-top: 50px;">
                          <AnimateCanvas
                            :width="593"
                            :height="197"
                            :img-length="91"
                            :end-stop="false"
                            url="/xy/启用X-Y轴_0"
                          />
                        </div>

                        <ElIcon size="30" style="position: absolute; right: 10px; top: 10px;" @click="startXYFlag = false">
                          <Close />
                        </ElIcon>

                        
                      </div>
                    </Transition>
                  </div>
                </div>
                <div v-else-if="activeBg === 'hong'"  class="flex absolute" >
                  <div style="width: 564px;">
                    <div class="config-child-box">
                      <span class="active">新建宏</span>
                    </div>
                    <div class="relative flex">
                      <!-- @scroll="scroll" -->
                      <ElScrollbar ref="scrollbarRef" height="387px" always style="width: 100%; height:387px; margin-top: 8px;padding-top: 20px; justify-content: normal;" class="right-s-b">
                        <div ref="innerRef">
                          <div class="hover hong_active" style="width: 100%;padding: 6px 55px 6px 15px;background-color: #2F2F2F; border-radius: 30px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                            001
                            <ElIcon size="20">
                              <Delete />
                            </ElIcon>
                          </div>
                          <div class="ahover" style="width: 100%;padding: 6px 55px 6px 15px;background-color: #2F2F2F; border-radius: 30px; display: flex; align-items: center; justify-content: space-between;margin-bottom: 8px;">
                            002
                            <ElIcon size="20">
                              <Delete />
                            </ElIcon>
                          </div>
                          <div class="ahover" style="width: 100%;padding: 6px 55px 6px 15px;background-color: #2F2F2F; border-radius: 30px; display: flex; align-items: center; justify-content: space-between;margin-bottom: 8px;">
                            002
                            <ElIcon size="20">
                              <Delete />
                            </ElIcon>
                          </div>
                          <div class="ahover" style="width: 100%;padding: 6px 55px 6px 15px;background-color: #2F2F2F; border-radius: 30px; display: flex; align-items: center; justify-content: space-between;margin-bottom: 8px;">
                            002
                            <ElIcon size="20">
                              <Delete />
                            </ElIcon>
                          </div>
                        </div>
                      </ElScrollbar>
                      <!-- <el-slider vertical height="367px" class="absolute" /> -->
                    </div>
                  </div>
                  <div style="width: 617px;margin-left: 60px;">
                    <div class="flex items-center justify-between">
                      <!-- <span style="font-size: 20px;">DPI设置</span> -->
                      <div class="config-child-box">
                        <span style="border: 0; justify-content: flex-start; background: transparent">DPI设置</span>
                      </div>

                      <div  class="relative charu" style="overflow: hidden;">
                        <div class="flex items-center justify-end" style="width: 122px;height: 36px; padding-right: 10px; background-color: #242424;;border-radius: 30px">
                          插入
                          <ElIcon style="margin-left: 10px;" size="20" color="#DAFF00">
                            <!-- <ArrowUpBold /> -->
                            <ArrowDownBold />
                          </ElIcon>
                        </div>
                        <ul class="absolute" style="width: 100%;background: #212121;margin-top: 3px;z-index: 10;padding: 10px 3px 0;border-radius: 10px;">
                          <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                            延迟
                          </li>
                          <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                            右键
                          </li>
                          <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                            中键
                          </li>
                          <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                            前进键
                          </li>
                          <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                            后退键
                          </li>
                          <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                            键盘按键
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div class="relative flex">
                      <!-- @scroll="scroll" -->
                      <ElScrollbar ref="scrollbarRef" height="387px" always style="width: 100%; height:387px; margin-top: 8px;padding-top: 20px; justify-content: normal;" class="right-s-b">
                        <div ref="innerRef">
                          <div class="hong_active" style="width: 100%;padding: 6px 55px 6px 15px;background-color: #2F2F2F; border-radius: 30px; display: flex; align-items: center; justify-content: space-between;margin-bottom: 8px;">
                            <!-- v-if="item.type" -->
                            <div class="flex items-center">
                              <ElSpace>
                                <ElIcon size="20">
                                  <Download />
                                  <!-- <Upload /> -->
                                </ElIcon>
                                Q
                              </ElSpace>
                            </div>

                            <ElSpace>
                              <ElIcon size="20">
                                <ArrowUpBold />
                              </ElIcon>
                              <ElIcon size="20">
                                <ArrowDownBold />
                              </ElIcon>
                              <ElIcon size="20">
                                <Delete />
                              </ElIcon>
                            </ElSpace>
                          </div>
                          <div class="hong" style="width: 100%;padding: 6px 55px 6px 15px;background-color: #2F2F2F; border-radius: 30px; display: flex; align-items: center; justify-content: space-between;margin-bottom: 8px;">
                            <!-- v-if="item.type" -->
                            <div class="flex items-center">
                              <ElSpace>
                                <ElIcon size="20">
                                  <Download />
                                  <!-- <Upload /> -->
                                </ElIcon>
                                Q
                              </ElSpace>
                            </div>

                            <ElSpace>
                              <ElIcon size="20">
                                <ArrowUpBold />
                              </ElIcon>
                              <ElIcon size="20">
                                <ArrowDownBold />
                              </ElIcon>
                              <ElIcon size="20">
                                <Delete />
                              </ElIcon>
                            </ElSpace>
                          </div>
                        </div>
                      </ElScrollbar>
                      <!-- <el-slider vertical height="367px" class="absolute" /> -->
                    </div>
                  </div>

                  <div style="margin-left: 20px;flex-direction: column; justify-content: end;" class="flex">
                    <div class="flex items-center" style="width: 123px;height: 123px; background-color: #242424;flex-direction: column; padding-top: 25px;border-radius: 10px;">
                      <div style="width: 17px;height: 17px;border-radius: 50%; background: #FF0000; margin-bottom: 10px;" />
                      <div>开始</div>
                      <div>录制</div>
                    </div>
                    <div style="height: 63px; line-height: 63px; text-align: center; width: 123px;border: 1px solid #DAFF00; border-radius: 10px;margin-top: 20px;background:#242424 ;">
                      保 存
                    </div>
                  </div>
                </div>
                <div v-else-if="activeBg === 'advanced'"  class="flex absolute justify-between" style="width: 1543px ;height: 433px; border-radius: 10px; border: 1px solid #333333;background: #0D0D0D; ">

                  <div style="padding: 25px 25px 0 25px;">
                    <div>
                      <div style="font-size: 20px; display: flex; align-items: center;">
                        <div style="width: 170px;" class="flex items-center">
                          <div>动态灵敏度</div>
                          <img @mouseenter="hover = true" @mouseleave="hover = false"  style=" margin-left: 5px;margin-right: 30px;" :src="imageToDisplay"  srcset="">
                        </div>
                        <div
                          class="flex items-center" style="position: relative;  width: 51px; height: 25px; border:1px solid #8B8A8A; border-radius: 30px; background-color: #242424;overflow: hidden;"
                          @click="radioChange"
                        >
                          <transition name="right-fade">
                            <div
                              :key="radioActive" class="absolute" :class="[radioActive ? 'right-0.5' : 'left-0.5']"
                              style="width: 19px;height: 19px;border-radius: 50%;"
                              :style="{ &quot;background-color&quot;: radioActive ? &quot;#DAFF00&quot; : &quot;#8B8A8A&quot; }"
                            />
                          </transition>
                        </div>
                      </div>
                      <div style="width: 180px; text-align: left; color: #A6A6A6;margin-top: 20px;">
                        选择你喜欢的鼠标速度或 自定义加速输出。
                      </div>
                    </div>

                    <div style="margin-top: 30px;">
                      <div style="font-size: 20px; display: flex; align-items: center;">
                        <div style="width: 170px;" class="flex items-center">
                          <div>20K FPS</div>
                          <img @mouseenter="hover = true" @mouseleave="hover = false"  style=" margin-left: 5px;margin-right: 30px;" :src="imageToDisplay"  srcset="">
                        </div>
                        <div
                          class="flex items-center" style="position: relative;  width: 51px; height: 25px; border:1px solid #8B8A8A; border-radius: 30px; background-color: #242424;overflow: hidden;"
                          @click="radioChange"
                        >
                          <transition name="right-fade">
                            <div
                              :key="radioActive" class="absolute" :class="[radioActive ? 'right-0.5' : 'left-0.5']"
                              style="width: 19px;height: 19px;border-radius: 50%;"
                              :style="{ &quot;background-color&quot;: radioActive ? &quot;#DAFF00&quot; : &quot;#8B8A8A&quot; }"
                            />
                          </transition>
                        </div>
                      </div>

                    </div>
                  </div>
                  <Transition>
                    <!-- <div style="padding: 25px 25px 0 25px;justify-content: flex-end; background-image: linear-gradient(to right, #0D0D0D 30%, #31350F, #A5AA5290);" class="flex">
                      <div>
                        <div style="font-size: 20px;text-align: left">动态灵敏度</div>
                        <div style="width: 180px; text-align: left; color: #A6A6A6;margin-top: 10px;">
                          优化了精度和响应速度
                        </div>
                      </div>
                      <div style="text-align: left;">
                        <p>使用预设或你喜欢的自定义设置来调整鼠标的响应速度和加速度，使其适应你的需求。 </p>
                        <p>· 经典:采用传统的灵敏度设置，非常适合在日常使用中进行精确控制。</p>
                        <p>· 自然:光标移动可预测，最大灵敏度有上限。</p>
                        <p>· 跳跃:缓慢移动时使用低灵敏度，快速移动时立即转换为高灵敏度。 </p>
                        <p> &nbsp;&nbsp;是喜欢超低灵敏度的 FPS 玩家的理想之选，同时还能在快速移动中完成 180 度旋转，实现出色的控制。</p>
                        <p>· 自定义:你自己的动态灵敏度设置。</p>
                        <AnimateCanvas
                          :width="593"
                          :height="287"
                          :img-length="91"
                          :end-stop="false"
                          url="/advanced/2_0"
                        />
                      </div>

                      <ElIcon size="40" style="position: absolute; right: 10px; top: 10px;">
                        <Close />
                      </ElIcon>
                    </div> -->
                    <div class="flex justify-between relative" style="flex:1">
                      <div class="h-100% w-100% absolute" style="z-index:1; background: #0D0D0D95;">蒙版</div>
                      <div  style="padding: 25px 25px 0 25px; flex:1;" >
                        <div class="flex items-center">
                          <div class="icon-box">
                            <ElIcon size="18">
                              <Plus />
                            </ElIcon>
                            <ElIcon size="18">
                              <Minus />
                            </ElIcon>
                          </div>
                          <div class="flex items-center ml-15">
                            <span class="mr-3">选择模板</span>
                            <div class="relative charu" style="overflow: hidden;">
                              <div class="flex items-center justify-end" style="width: 112px;height: 36px; padding-right: 10px; background-color: #242424;;border-radius: 30px">
                                经典
                                <ElIcon style="margin-left: 10px;" size="20" color="#DAFF00">
                                  <!-- <ArrowUpBold /> -->
                                  <ArrowDownBold />
                                </ElIcon>
                              </div>
                              <ul class="absolute" style="width: 100%;background: #212121;margin-top: 3px;z-index: 10;padding: 10px 3px 0;border-radius: 10px;">
                                <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                                  经典
                                </li>
                                <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                                  自然
                                </li>
                                <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                                  跳跃
                                </li>
                                <li style="width: 115px; height: 30px; text-align: center;line-height: 30px;border-radius: 5px;margin-bottom: 10px;">
                                  自定义
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div style="width:100%" class="relative">

                          <div id="myChart" style="width:100%; height:350px;"></div>

                          <div class="icon-box absolute bottom-0 right-0" >
                            <ElIcon size="18">
                              <Plus />
                            </ElIcon>
                            <ElIcon size="18">
                              <Minus />
                            </ElIcon>
                          </div>
                          <p class="absolute bottom-0 left-[50%] ml-[-64px]">输入速度(计数/毫秒)</p>
                          <p class="absolute top-[50%] left-0 mt-[-49px]" style="transform: rotate(90deg);">输出与输入比率</p>


                        </div>
                          
                      </div>
                      <div class="config-child-box" style="height: 100%; flex-direction: column; margin-left: 30px; justify-content: center;">
                        <span style="margin-bottom: 35px;">经典</span>
                        <span style="margin-bottom: 35px;">自然</span>
                        <span style="margin-bottom: 35px;">跳跃</span>
                        <span style="margin-bottom: 35px;" class="active">自定义</span>
                      </div>
                    </div>
                  </Transition>
                </div>
              </Transition>
            </div>
            
          </div>
        </div>

        <div class="bottom-box bottom-box1 relative" v-else-if="bottomItem == 1">
          <ElIcon size="50" style="position: absolute; margin-left: -15px; left: 50%; top: 50px;" @click="startXYFlag = false">
            <Close />
          </ElIcon>
          <div class="config-child-box absolute" style=" margin-left: -50px; left: 50%; top: 150px;">
            <span class="active">保存</span>
          </div>
          <p class="mt-3 mb-3" style="font-size: 18px;line-height: 40px;"> 开启此模式后，鼠标的各项参数将提升至竞技所需</p>
          <p style="font-size: 18px;line-height: 40px; color: red;">在开启光学引擎的采样率将达到20K FPS，同时功耗将大幅度提升</p>
        </div>

        <div class="bottom-box bottom-box1 relative" v-else-if="bottomItem == 2">
          <ElIcon size="50" style="position: absolute; margin-left: -15px; left: 50%; top: 50px;" @click="startXYFlag = false">
            <Close />
          </ElIcon>
          <div class="config-child-box absolute" style=" margin-left: -50px; left: 50%; top: 150px;">
            <span class="active">保存</span>
          </div>

          <p class="mt-3 mb-3" style="font-size: 18px;line-height: 40px;"> 开启此模式后，鼠标的各项参数将提升至职业强化训练所需</p>
          <p style="font-size: 18px;line-height: 40px; color: red;">同时功耗也会相应提升</p>
        </div>

        <div class="bottom-box bottom-box1 relative" v-else-if="bottomItem == 3">
          <ElIcon size="50" style="position: absolute; margin-left: -15px; left: 50%; top: 50px;" @click="startXYFlag = false">
            <Close />
          </ElIcon>
      

          <p class="mt-10 mb-3" style="font-size: 18px;line-height: 40px;"> 与接收器配对说明</p>

          <img class="h-300px" src="/slideshow/2_zh-CN.png" alt="item.title">


          <div class="config-child-box absolute" style=" margin-left: -50px; left: 50%; bottom: 80px;">
            <span class="active">确认</span>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style>
  .hid-container {
  height: 1080px;
  background-image: url('/public/v9/bg-w.png');
  background-size: 100% 100%;
  background-position: center center;
  background-repeat: no-repeat;

  /* backdrop-filter: blur(5px); */
  padding: 32px 89px;
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
    /* height: 544px; */
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
    position: absolute;
    bottom: 524px;
    left: 50%;
    margin-left: -497px;
    
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
    position: absolute;
    bottom: 0px;
    left: 0;
  }

  .bottom-box1{
    background-image: url('/public/v9/bg-b.png');
    background-size: 100% 90%;
    /* background-position: center center; */
    background-repeat: no-repeat;
    /* background-image: linear-gradient(to bottom, #5E6719 10px, #0E0E0D); */
  }

  .bottom-box .config-child-box {
    display: flex;
  }

  .bottom-box .config-child-box span {
    width: 123px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #333333;
    border-radius: 30px;
    margin-right: 30px;
    font-size: 16px;
    background-color: #242424;
  }

  .bottom-box .config-child-box span.active {
    background-color: #daff00;
    color: #060606;
  }

  .bottom-box .config-child-box span:last-child {
    margin-right: 0px;
  }

  .left-item-box > div {
    font-size: 20px;
    width: 219px;
    height: 107px;
    line-height: 107px;
    background-image: url('/public/v9/bg.png');
    background-size: 84% 54%;
    background-repeat: no-repeat;
    background-position: -15px center;
  }

  .left-item-box > div.activeBg {
    width: 219px;
    height: 107px;
    line-height: 100px;
    background-size: 100% 100%;
    background-image: url('/public/v9/active-bg.png');
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

    .block_item.active {
      color: #333;
      background-color: #daff00;
    }
    .block_item:hover {
      color: #333;
      background-color: #daff00;
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
    border-bottom: 12px solid #34b4d7;
  }

  .triangle2 {
    border-bottom: 12px solid #6cb461;
  }

  .triangle3 {
    border-bottom: 12px solid #ffffff;
  }

  .triangle4 {
    border-bottom: 12px solid #dfdc54;
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

  .hong_active {
    background-color: #daff00 !important;
    color: #333;
  }

  .ahover:hover {
    background-color: #daff00 !important;
    color: #333;
  }

  .logo-box{
    padding: 3px;
    border-radius: 50px;
    transition: all 0.5s ease; /* 平滑过渡效果 */
    border: 1px solid transparent; /* 初始无边框 */
    cursor: pointer; /* 鼠标悬停样式 */
    height: 54px;
    overflow: hidden;
  }

  .logo-box:hover{
    height: 254px;
  }

  .charu:hover{
    overflow: visible !important;
  }

  .charu li:hover{
    background-color: #DAFF00;
    color: #333;
  }

  .icon-box{
    width: 73px;
    height: 29px;
    display: flex;
    align-items: center;
    justify-content: space-around;
    background: #242424;
    border-radius: 30px;
  }



  --el-color-primary: #b8e200;

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

 



}
</style>
