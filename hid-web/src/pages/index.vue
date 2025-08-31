<script setup lang="ts">
import { ElButton, ElCarousel, ElCarouselItem } from 'element-plus'

import {  Plus } from '@element-plus/icons-vue'

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { availableLocales, loadLanguageAsync } from '~/modules/i18n'
import { createTransportWebHID, useTransportWebHID } from '~/utils/hidHandle'

defineOptions({
  name: 'Scyrox',
})

const version = __APP_VERSION__

const { t, locale } = useI18n()

const router = useRouter()

const userStore = useUserStore()

const transport = ref()

useTransportWebHID('v8', async (instance) => {
  transport.value = instance
})

const selectLanguageList = ref([
  { title: 'Deutsch', img: '/flag/DE.png', language: 'de-DE' },
  { title: 'English', img: '/flag/US.png', language: 'en-US' },
  { title: '简体中文', img: '/flag/CN.png', language: 'zh-CN' },
  { title: '한국어', img: '/flag/KR.png', language: 'ko-KR' },
  { title: '日本語', img: '/flag/JP.png', language: 'ja-JP' },
])

const languageShow = ref(false)

const slideshowList = computed(() => [
  { title: t('index.pairingGuide'), img: `/slideshow/2_${locale.value}.png` },
  { title: t('index.schematicGuide'), img: `/slideshow/1_${locale.value}.png` },
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

async function onNouseClick() {
  if (transport.value) {
    router.push(`/hid/v8`)
    return
  }

  transport.value = await createTransportWebHID({
    id: 'v8',
    filters: [
      ...toRaw(userStore.devices),
      // 其他设备
      // { vendorId: 0x3554, productId: 0xF5F6 },
      // { vendorId: 0x3554, productId: 0xF5F7 },
      // { vendorId: 0x3554, productId: 0xF5F4 },
    ],
    commandHandler: async (data) => {
      // console.log('接收的数据=======', data)
    },
  })
  if (transport.value) {
    router.push(`/hid/v8`)
  }
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
})
</script>

<template>
  <div class="flex flex-col items-center justify-center contain-content">
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

      <div class="mb-5 h-[251px] border-gray-600 w-[800px]" style="overflow: hidden;" >
        <div class="mb-5 flex justify-center items-center relative" style="width: 231px;height: 248px;border-radius: 10px;background-color: rgba(255, 255, 255, 0.1); margin-right: 10px;  float: left; border: 1px solid rgba(255, 255, 255, 0.4);">
          <img style="width: 84px;height:162px;" src="/public/mouse.png" alt="" srcset="" />
          <p class="absolute bottom-3" style="color: black; font-weight: bold;font-size: 20px;">V6</p>
          <div class="absolute right-3 top-5">
            <div class="mb-3" style="width: 18px;height: 18px;background: #333; border-radius: 50%;"></div>
            <div style="width: 18px;height: 18px;background: #fff; border-radius: 50%;"></div>
          </div>
        </div>
        <div @click="onNouseClick" class="mb-5 flex justify-center items-center relative" style="width: 231px;height: 248px;border-radius: 10px;background-color: rgba(255, 255, 255, 0.1); margin-right: 10px;float: left;border: 1px solid rgba(255, 255, 255, 0.4);">
          
          <p class="absolute top-5" style="font-weight: bold;font-size: 20px;">新增设备</p>
          <ElIcon  size="20" color="#ffff">
            <Plus />
          </ElIcon>

      
        </div>
        <!-- <div style="width: 231px;height: 248px;border-radius: 10px;background-color: rgba(255, 255, 255, 0.1);">

        </div>
        <div style="width: 231px;height: 248px;border-radius: 10px;background-color: rgba(255, 255, 255, 0.1);">

        </div> -->

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
          class="min-w-[400px] w-60vw"
          height="300px"
          direction="vertical"
          :interval="2400"
          :autoplay="true"
          indicator-position="none"
          @change="onChangeCarousel"
        >
          <ElCarouselItem v-for="item in slideshowList" :key="item.title" class="h-300px flex items-center justify-center">
            <img class="h-100%" :src="item.img" alt="item.title">
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
.contain-content{
  height: 100%;
  width: 100%;
  background-image: url('../../../public/v9/bg-s.png');
  background-size: 100% 100%;
  background-position: center center;
  background-repeat: no-repeat;
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
</style>
