<route lang="yaml">
  meta:
    layout: normal
</route>

<script setup lang="ts">
import { ref } from 'vue'
import { createTransportWebHID } from '~/renderer/utils/hidHandle';

const active = ref(0)
const loading = ref(false)

const activeText = [ '连接适配器', '开始配对', '配对成功', '配对失败' ]
const activeColor = [ '#000', '#000', '#79cb50', 'red' ]

const userStore = useUserStore()

const transport = ref()

onMounted(() => {
  navigator.hid.onconnect = (event) => {
    active.value = 0
  };
  navigator.hid.ondisconnect = (event) => {
    active.value = 0
  };
})

const nextStep = async (index: number) => {
  switch (index) {
    case 0:
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
          console.log('接收的数据=======', data)
        },
      })
      console.log("transport.value=======", transport.value)
      if (transport.value) {
        active.value = 1
      }
      break;
    case 1:
      try {
        loading.value = true
        const res = await transport.value.send([0x14])
        console.log('配对成功=======', res)
        active.value = 2
      } catch(err) {
        active.value = 3
      } finally {
        loading.value = false
      }
      break;

    default:
      // nothing
      break;
  }
}
</script>

<template>
  <div class="button-wrap">
    <button @click="nextStep(active)">
      <svg class="mouse-outline" viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg" :style="active === 2 ? 'color: #79cb50;' : 'color: #000;'">
        <path d="M30,50 L30,110 Q30,140 50,140 Q70,140 70,110 L70,50 Q70,20 50,20 Q30,20 30,50"
              fill="none"
              stroke="currentColor"
              stroke-width="2"/>
        <line x1="50" y1="40" x2="50" y2="70" stroke="currentColor" stroke-width="2"/>
      </svg>
      <span :style="`color: ${activeColor[active]};`">{{ loading ? '连接中...' : activeText[active] }}</span>
    </button>
    <div class="button-shadow"></div>
  </div>

  <!-- Background -->
  <svg style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; z-index: 0;" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="dottedGrid" width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.15)" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dottedGrid)" />
  </svg>
</template>

<style>
/* Defs */
@property --angle-1 {
  syntax: "<angle>";
  inherits: false;
  initial-value: -75deg;
}

@property --angle-2 {
  syntax: "<angle>";
  inherits: false;
  initial-value: -45deg;
}

:root {
  --global--size: clamp(2rem, 4vw, 5rem);
  --anim--hover-time: 400ms;
  --anim--hover-ease: cubic-bezier(0.25, 1, 0.5, 1);
}

/* Base Styles */
body {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--global--size);
  background-color: rgba(215, 215, 215, 1);
  font-family: "Inter", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

/* ========== BUTTON ========== */

/* Button Wrap Container */
.button-wrap {
  position: relative;
  z-index: 2;
  border-radius: 999vw;
  background: transparent;
  pointer-events: none;
  transition: all var(--anim--hover-time) var(--anim--hover-ease);
}

/* Button Shadow Container */
.button-shadow {
  --shadow-cuttoff-fix: 2em;
  position: absolute;
  width: calc(100% + var(--shadow-cuttoff-fix));
  height: calc(100% + var(--shadow-cuttoff-fix));
  top: calc(0% - var(--shadow-cuttoff-fix) / 2);
  left: calc(0% - var(--shadow-cuttoff-fix) / 2);
  filter: blur(clamp(2px, 0.125em, 12px));
  -webkit-filter: blur(clamp(2px, 0.125em, 12px));
  -moz-filter: blur(clamp(2px, 0.125em, 12px));
  -ms-filter: blur(clamp(2px, 0.125em, 12px));
  overflow: visible;
  pointer-events: none;
}

/* Shadow */
.button-shadow::after {
  content: "";
  position: absolute;
  z-index: 0;
  inset: 0;
  border-radius: 40%;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.1));
  width: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
  height: calc(100% - var(--shadow-cuttoff-fix) - 0.25em);
  top: calc(var(--shadow-cuttoff-fix) - 0.5em);
  left: calc(var(--shadow-cuttoff-fix) - 0.875em);
  padding: 0.125em;
  box-sizing: border-box;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  transition: all var(--anim--hover-time) var(--anim--hover-ease);
  overflow: visible;
  opacity: 1;
}

/* ========== BUTTON BASE STYLES ========== */

button {
  /* Basic Styling */
  --border-width: clamp(1px, 0.0625em, 4px);
  all: unset;
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  pointer-events: auto;
  z-index: 3;
  background: linear-gradient(
    -75deg,
    rgba(255, 255, 255, 0.05),
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.05)
  );
  border-radius: 40%;  /* 修改为更大的圆角 */
  padding: 2em 0.5em;  /* 增加内边距 */
  width: 368px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05),
    inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5),
    0 0.25em 0.125em -0.125em rgba(0, 0, 0, 0.2),
    0 0 0.1em 0.25em inset rgba(255, 255, 255, 0.2),
    0 0 0 0 rgba(255, 255, 255, 1);
  backdrop-filter: blur(clamp(1px, 0.125em, 4px));
  -webkit-backdrop-filter: blur(clamp(1px, 0.125em, 4px));
  -moz-backdrop-filter: blur(clamp(1px, 0.125em, 4px));
  -ms-backdrop-filter: blur(clamp(1px, 0.125em, 4px));
  transition: all var(--anim--hover-time) var(--anim--hover-ease);
}

button:hover {
  transform: scale(0.975);
  backdrop-filter: blur(0.01em);
  -webkit-backdrop-filter: blur(0.01em);
  -moz-backdrop-filter: blur(0.01em);
  -ms-backdrop-filter: blur(0.01em);
  box-shadow: inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05),
    inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5),
    0 0.15em 0.05em -0.1em rgba(0, 0, 0, 0.25),
    0 0 0.05em 0.1em inset rgba(255, 255, 255, 0.5),
    0 0 0 0 rgba(255, 255, 255, 1);
}

/* Button Text */
button span {
  position: relative;
  display: block;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  font-family: "Inter", sans-serif;
  letter-spacing: -0.05em;
  font-weight: 500;
  font-size: 1em;
  color: rgba(50, 50, 50, 1);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-shadow: 0em 0.25em 0.05em rgba(0, 0, 0, 0.1);
  transition: all var(--anim--hover-time) var(--anim--hover-ease);
  padding: 0.5em;
  text-align: center;
}

button:hover span {
  text-shadow: 0.025em 0.025em 0.025em rgba(0, 0, 0, 0.12);
}

/* Text */
button span::after {
  content: "";
  display: block;
  position: absolute;
  z-index: 1;
  width: calc(100% - var(--border-width)); /* Prevent overlapping border */
  height: calc(100% - var(--border-width));
  top: calc(0% + var(--border-width) / 2);
  left: calc(0% + var(--border-width) / 2);
  box-sizing: border-box;
  border-radius: 999vw;
  overflow: clip;
  background: linear-gradient(
    var(--angle-2),
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.5) 40% 50%,
    rgba(255, 255, 255, 0) 55%
  );
  z-index: 3;
  mix-blend-mode: screen;
  pointer-events: none;
  background-size: 200% 200%;
  background-position: 0% 50%;
  background-repeat: no-repeat;
  transition: background-position calc(var(--anim--hover-time) * 1.25)
      var(--anim--hover-ease),
    --angle-2 calc(var(--anim--hover-time) * 1.25) var(--anim--hover-ease);
}

button:hover span::after {
  background-position: 25% 50%;
}

button:active span::after {
  background-position: 50% 15%;
  --angle-2: -15deg;
}

/* Touch Devices */
@media (hover: none) and (pointer: coarse) {
  button span::after,
  button:active span::after {
    --angle-2: -45deg;
  }
}

/* ========== BUTTON OUTLINE ========== */

/* Outline */
button::after {
  content: "";
  position: absolute;
  z-index: 1;
  inset: 0;
  border-radius: 40%;
  width: calc(100% + var(--border-width));
  height: calc(100% + var(--border-width));
  top: calc(0% - var(--border-width) / 2);
  left: calc(0% - var(--border-width) / 2);
  padding: var(--border-width);
  box-sizing: border-box;
  background: conic-gradient(
      from var(--angle-1) at 50% 50%,
      rgba(0, 0, 0, 0.5),
      rgba(0, 0, 0, 0) 5% 40%,
      rgba(0, 0, 0, 0.5) 50%,
      rgba(0, 0, 0, 0) 60% 95%,
      rgba(0, 0, 0, 0.5)
    ),
    linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5));
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  transition: all var(--anim--hover-time) var(--anim--hover-ease),
    --angle-1 500ms ease;
  box-shadow: inset 0 0 0 calc(var(--border-width) / 2) rgba(255, 255, 255, 0.5);
}

button:hover::after {
  --angle-1: -125deg;
}

button:active::after {
  --angle-1: -75deg;
}

@media (hover: none) and (pointer: coarse) {
  button::after,
  button:hover::after,
  button:active::after {
    --angle-1: -75deg;
  }
}

/* Shadow Hover */
.button-wrap:has(button:hover) .button-shadow {
  filter: blur(clamp(2px, 0.0625em, 6px));
  -webkit-filter: blur(clamp(2px, 0.0625em, 6px));
  -moz-filter: blur(clamp(2px, 0.0625em, 6px));
  -ms-filter: blur(clamp(2px, 0.0625em, 6px));
  transition: filter var(--anim--hover-time) var(--anim--hover-ease);
}

.button-wrap:has(button:hover) .button-shadow::after {
  top: calc(var(--shadow-cuttoff-fix) - 0.875em);
  opacity: 1;
}

/* Rotation */
.button-wrap:has(button:active) {
  transform: rotate3d(1, 0, 0, 25deg);
}

.button-wrap:has(button:active) button {
  box-shadow: inset 0 0.125em 0.125em rgba(0, 0, 0, 0.05),
    inset 0 -0.125em 0.125em rgba(255, 255, 255, 0.5),
    0 0.125em 0.125em -0.125em rgba(0, 0, 0, 0.2),
    0 0 0.1em 0.25em inset rgba(255, 255, 255, 0.2),
    0 0.225em 0.05em 0 rgba(0, 0, 0, 0.05),
    0 0.25em 0 0 rgba(255, 255, 255, 0.75),
    inset 0 0.25em 0.05em 0 rgba(0, 0, 0, 0.15);
}

.button-wrap:has(button:active) .button-shadow {
  filter: blur(clamp(2px, 0.125em, 12px));
  -webkit-filter: blur(clamp(2px, 0.125em, 12px));
  -moz-filter: blur(clamp(2px, 0.125em, 12px));
  -ms-filter: blur(clamp(2px, 0.125em, 12px));
}

.button-wrap:has(button:active) .button-shadow::after {
  top: calc(var(--shadow-cuttoff-fix) - 0.5em);
  opacity: 0.75;
}

.button-wrap:has(button:active) span {
  text-shadow: 0.025em 0.25em 0.05em rgba(0, 0, 0, 0.12);
}

/* 添加鼠标轮廓样式 */
.mouse-outline {
  width: 60px;
  height: 100px;
  margin-bottom: 1em;
  color: rgba(50, 50, 50, 0.8);
}

</style>
