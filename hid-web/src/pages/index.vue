<script setup lang="ts">
import { CircleClose, Plus } from '@element-plus/icons-vue'

import autofit from 'autofit.js'

import { ElCarousel, ElCarouselItem, ElIcon } from 'element-plus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { loadLanguageAsync } from '~/modules/i18n'

import { createTransportWebHID, getTransportWebHID, transportWebHID, useTransportWebHID } from '~/utils/hidHandle'

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
  { title: 'Deutsch', img: '/flag/DE.png', language: 'de-DE' },
  { title: 'English', img: '/flag/US.png', language: 'en-US' },
  { title: '简体中文', img: '/flag/CN.png', language: 'zh-CN' },
  { title: '한국어', img: '/flag/KR.png', language: 'ko-KR' },
  { title: '日本語', img: '/flag/JP.png', language: 'ja-JP' },
])

const languageShow = ref(false)

const slideshowList = computed(() => [
  { title:t('index.pairingGuide'), type: 'component', component: 'MouseCarouseItem' },
  { title:t('index.schematicGuide'), type: 'img', img: `/slideshow/2.png` },

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

async function onNouseClick(item: any) {
  // 获取所有已授权的设备
  const devices = await navigator.hid.getDevices()
  if (!devices || devices.length === 0) {
    showMessage(t('description.please_insert_device'))
    return
  }

  // 从现有连接中查找匹配的设备
  const matchedDevice = devices.find(device =>
    device.vendorId === item.vendorId && device.productId === item.productId,
  )

  if (!matchedDevice) {
    showMessage(t('description.please_insert_this_device'))
    return
  }

  // 使用找到的实例
  transport.value = matchedDevice
  instanceRef.value = matchedDevice
  router.push(`/hid/v8`)
}

async function onAddNouseClick() {
  console.log("1=======")
  transport.value = await createTransportWebHID({
    id: 'v8',
    filters: [
      ...toRaw(userStore.devices),
      // 其他设备
      { vendorId: 0x1532, productId: 0x00BF },
      { vendorId: 0x3554, productId: 0xF5F7 },
      { vendorId: 0x3554, productId: 0xF5F4 },
    ],
    commandHandler: async (data) => {
      // console.log('接收的数据=======', data)
    },
  })

  let data = transport.value.send([0x2E, 0x00, 0x03])

  console.log('send data====', data)



  if (transport.value) {
    const transportListCopy = localStorage.getItem('transportList') ? JSON.parse(localStorage.getItem('transportList')) : []

    const flag = transportListCopy.some((item) => {
      return (item.productId === transport.value.device.productId && item.vendorId === transport.value.device.vendorId)
    })

    if (flag) {
      // router.push(`/hid/v8`)
      localStorage.setItem('tabActive', 'performance')
      return
    }
    transportList.value.push({ ...transport.value, productId: transport.value.device.productId, vendorId: transport.value.device.vendorId, productName: transport.value.device.productName, collections: transport.value.device.collections })
    localStorage.setItem('transportList', JSON.stringify(transportList.value))
    localStorage.setItem('tabActive', 'performance')
    // router.push(`/hid/v8`)
  }
}

function deleteTransport(item) {
  const transportListCopy = localStorage.getItem('transportList') ? JSON.parse(localStorage.getItem('transportList')) : []
  transportList.value = transportListCopy.filter((k) => {
    return k.reportId !== item.reportId
  })
  localStorage.setItem('transportList', JSON.stringify(transportList.value))
}

const clickCount = ref(0)
let clickTimer: number | null = null

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
// function onDisconnect() {
//   instanceRef.value = null
// }

// useTransportWebHID('v8', async (instance) => {

//   instanceRef.value = instance
//   transport.value = instance
//   // 监听鼠标断开
//   navigator.hid.addEventListener('disconnect', onDisconnect)
// })

async function setColor(mode: any, profileInfo: any) {
  // if (profileInfo.mouseColor === mode.id) {
  //   return
  // }
  // profileInfo.mouseColor = mode.id
  // await instanceRef.value.send([0x29, 0x00, 0x00, mode.id])

  // transportList.value = transportList.value.map((item: any) => {
  //   if (item.reportId === transport.value.reportId) {
  //     item.mouseColor = mode.id
  //   }
  //   return item
  // })
  // localStorage.setItem('transportList', JSON.stringify(transportList.value))
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

// 监听 transportList 变化，更新按钮状态
watch(() => transportList.value, () => {
  nextTick(() => {
    setTimeout(() => {
      updateScrollButtons()
    }, 100)
  })
}, { deep: true })
</script>

<template>
  <div class="contain-content flex flex-col items-center justify-center">
    <a class="absolute left-30px top-30px" href="https://baidu.com" target="_blank">
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
            <p  style="color: #fff; font-weight: bold;font-size: 18px;">
              {{ item.productName }}
            </p>

            <img
              style="width: 84px; height:142px;object-fit: contain;margin-top: 10px;"
              :src="`/mouse_${{
                3: 'black',
                4: 'white',
              }[item.mouseColor] || 'black'}.png`"
              alt=""
              srcset=""
            >

            <div class="flex mt-3 ">
              <img src="/v9/icon3.png" alt="" srcset="" class="mr-2" >
              <img src="/v9/icon4.png" alt="" srcset="" class="mr-2" >
              <img src="/v9/icon5.png" alt="" srcset="" class="mr-2">
              <img src="/v9/icon6.png" alt="" srcset="" class="mr-2">
            </div>

            
      
            <div class="color-box absolute right-3 top-4">
              <div v-for="key in sortedColorItems(item.mouseColor)" :key="key.id" class="mb-2" :style="{ background: key.backgroundColor }" style="width: 18px;height: 18px; border-radius: 50%;" @click.stop="setColor(key, item)" />
            </div>

            <el-icon size="5" color="#ffff" class="absolute left-2 top-3" @click.stop="deleteTransport(item)">
              <CircleClose />
            </el-icon>
          </div>

          <div
            class="relative mb-5 flex flex-shrink-0 items-center justify-center"
            style="width: 231px;height: 248px;border-radius: 10px;background-color: rgba(255, 255, 255, 0.1); margin-right: 10px;border: 1px solid rgba(255, 255, 255, 0.4);"
            @click="onAddNouseClick"
          >
            <p class="absolute top-5" style="font-weight: bold;font-size: 20px;">
              {{ t('title.new_device') }}
            </p>
            <ElIcon size="20" color="#ffff">
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
          <div v-for="(item, index) in slideshowList" class="absolute top-0 w-100% cursor-pointer transition-all duration-500" :class="activeIndex === index ? 'top-8 text-2xl color-#e1fe52' : ''" @click="carouselRef?.setActiveItem(index)">
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
</style>
