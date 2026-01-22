<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const emit = defineEmits<{
  (e: 'complete'): void
}>()
const radius = 45
const circumference = 2 * Math.PI * radius
const progress = ref(0)
const isComplete = ref(false)
const checkmarkOpacity = ref(0)

const progressOffset = computed(() => circumference * (1 - progress.value))

function animateCircle() {
  const duration = 200
  const startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - startTime
    progress.value = Math.min(elapsed / duration, 1)

    if (progress.value < 1) {
      requestAnimationFrame(animate)
    }
    else {
      isComplete.value = true
      setTimeout(() => {
        checkmarkOpacity.value = 1
        setTimeout(() => {
          emit('complete')
        }, 0)
      }, 300)
    }
  }

  requestAnimationFrame(animate)
}

onMounted(() => {
  animateCircle()
})
</script>

<template>
  <div class="circle-loader">
    <svg class="circle-svg" viewBox="0 0 100 100">
      <!-- <circle class="circle-bg" cx="50" cy="50" r="45" /> -->
      <circle
        class="circle-progress"
        cx="50"
        cy="50"
        r="45"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="progressOffset"
      />
      <path
        v-if="isComplete"
        class="checkmark"
        d="M30,50 L45,65 L70,35"
        :style="{ opacity: checkmarkOpacity }"
      />
    </svg>
  </div>
</template>

<style scoped>
.circle-loader {
  width: 35px;
  height: 35px;
  margin: 0 auto;
}

.circle-svg {
  width: 100%;
  height: 100%;
}

.circle-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 10;
}

.circle-progress {
  fill: none;
  stroke: #daff00;
  stroke-width: 10;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 0.1s linear;
}

.checkmark {
  fill: none;
  stroke: #daff00;
  stroke-width: 10;
  stroke-linecap: round;
  stroke-dasharray: 50;
  stroke-dashoffset: 50;
  animation: draw-checkmark 0.1s ease-out forwards;
  animation-delay: 0.3s;
  opacity: 0;
}

@keyframes draw-checkmark {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
