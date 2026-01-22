<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

interface Props {
  sortPage?: number
  sort?: boolean
  endStop?: boolean
  width?: number
  height?: number
  animateTime: number
  url: string
  srcImg: Array
  imgType?: string
  imgLength: number
  editIndex?: number
  callback?: (value: any) => void
}

const props = withDefaults(defineProps<Props>(), {
  sortPage: 25,
  sort: false,
  endStop: false,
  width: 0,
  height: 0,
  animateTime: 50,
  imgType: 'png',
  imgLength: 1,
  editIndex: -1,
})

const imgList = ref([])
const clearAnima = ref(null)

watch(props.editIndex, (n) => {
  clearInterval(clearAnima.value)
  animate(Math.abs(n))
})

onUnmounted(() => {
  clearInterval(clearAnima.value)
})

if (props.url) {
  initImg()
}
else {
  imgList.value = props.srcImg
  animate(0, props.callback)
}

function reload(callback) {
  clearInterval(clearAnima.value)
  imgList.value = []
  if (props.url) {
    initImg()
  }
  else {
    imgList.value = props.srcImg
    animate(0, callback)
  }
}

function initImg() {
  for (let i = 0; i < props.imgLength; i++) {
    const img = new Image()
    let item = i
    if (i < 10) {
      item = `000${i}`
    }
    else if (i < 100) {
      item = `00${i}`
    }
    else if (i < 1000) {
      item = `0${i}`
    }
    img.src = `${props.url + item}.${props.imgType}`

    imgList.value.push(img)
  }
  let loadIndex = 0
  // eslint-disable-next-line array-callback-return
  imgList.value.map((item) => {
    item.onload = () => {
      loadIndex++
      if (loadIndex === props.imgLength) {
        clearInterval(clearAnima.value)
        animate()
      }
    }
  })
}

const getCanvas = ref(null)

function animate(editIndex = -1, callback) {
  let i = editIndex
  clearInterval(clearAnima.value)
  clearAnima.value = setInterval(() => {
    const canvas = getCanvas.value
    i++
    if (i === props.imgLength) {
      if (props.endStop) {
        clearInterval(clearAnima.value)
        callback && callback()
        return
      }
      if (!props.sort) {
        i = 0
      }
      else {
        i = props.sortPage
      }
    }
    if (props.width && canvas) {
      canvas.width = props.width
      canvas.height = props.height
    }
    else {
      if (imgList.value[i] && canvas) {
        canvas.width = imgList.value[i].width
        canvas.height = imgList.value[i].height
      }
    }
    if (imgList.value[i] && canvas) {
      canvas
        .getContext('2d')
        .drawImage(imgList.value[i], 0, 0, canvas.width, canvas.height)
    }
  }, props.animateTime)
}
</script>

<template>
  <canvas ref="getCanvas" />
</template>
