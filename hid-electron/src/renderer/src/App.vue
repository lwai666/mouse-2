<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus'
import { useLocalStorage } from '@vueuse/core';

import type { DeviceNumberType, DeviceType } from './type'
import { useMouseTrail } from './composables/useMouseTrail';
import { generateHidSendData } from './utils/hid';
import { combineLowAndHigh8Bits } from './utils';
import JsBarcode from 'jsbarcode';

const version = __APP_VERSION__

const { t, locale } = useI18n();

const toggleLanguage = (): void => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh';
};

const paired = ref(false);
let pairingFailedTimer: NodeJS.Timeout | null = null;

// 厂商文档/SDK input/output report ID
const reportId = 8;

const svgDom = ref('');
const rfAddress = ref('');
const barcode1 = useLocalStorage('barcode1', 'AB');
const barcode2 = ref(getYYMMdd());
const barcode3 = useLocalStorage('barcode3', '00001');

function getYYMMdd() {
  const now = new Date();
  return now.toISOString().slice(2, 10).replace(/-/g, '');
}

watch([barcode1, barcode2, barcode3], ([newBarcode1, newBarcode2, newBarcode3]) => {
  const fullCode = newBarcode1 + newBarcode2 + newBarcode3;
  nextTick(() => {
    if (fullCode.length === 13) {
      setJsBarcode(fullCode);
    } else {
      // 清空条形码显示
      setJsBarcode('0000000000000')
    }
  })
}, {
  immediate: true
});

function setJsBarcode(code13) {
  JsBarcode(svgDom.value, code13, {
    format: 'CODE128', // ✅ CODE128 不需要校验位
    // format: 'ean13',
    width: 1,         // 每根线的宽度（默认 2）
    height: 30,       // 条形高度
    // margin: 4,       // 四周留白
    marginTop: 4,
    marginBottom: 4,
    marginLeft: 0,
    marginRight: 0,
    displayValue: true,
    fontSize: 12,
  });
}

const devices = ref<Record<string, DeviceNumberType>>({
  mouse: { vendorId: 0x2FE3, productId: 0x0007, getVersionKey: 0x0F, version: 0, usbPhyVersion:0, usagePage: 65280, usage: 2, device: undefined }, // 鼠标
  receiver: { vendorId: 0x2FE5, productId: 0x0005, getVersionKey: 0x18, version: 0, usbPhyVersion:0, usagePage: 65280, usage: 2, device: undefined }  // 接收器
});

let mouseTrail = { start: () => {}, stop: () => {} }
mouseTrail = useMouseTrail({ size: 8, color: "random", lifetime: 500 });


function processDevices(connectedDevices: DeviceType[]) {
  Object.keys(devices.value).forEach((key) => {
    const _device = devices.value[key];
    _device.version = 0
    _device.usbPhyVersion = 0
    _device.device = undefined; // 初始化 device 为 null
    connectedDevices.forEach(device => {
      if (device.vendorId === _device.vendorId && device.productId === _device.productId) {
        _device.device = device;
      }
    });
  });

  // 获取鼠标版本
  if (devices.value.mouse.device && !devices.value.mouse.version) {
    getMouseVersion();
  }


  // 获取接收器版本
  if (devices.value.receiver.device && !devices.value.receiver.version) {
    getReceiverVersion();
  }

  if (devices.value.mouse.device && devices.value.receiver.device) {
    mouseTrail.start();
    startPairing();
  } else {
    mouseTrail.stop();
    paired.value = false;
  }
}

function getMouseVersion() {
  window.api.hidSend(devices.value.mouse.device!.path, generateHidSendData([reportId, devices.value.mouse.getVersionKey]));
  window.api.hidSend(devices.value.mouse.device!.path, generateHidSendData([reportId, 0x21])); // 获取 USB PHY 的版本号
}

function getReceiverVersion() {
  window.api.hidSend(devices.value.receiver.device!.path, generateHidSendData([reportId, devices.value.receiver.getVersionKey]));
  window.api.hidSend(devices.value.receiver.device!.path, generateHidSendData([reportId, 0x21])); // 获取 USB PHY 的版本号
}

async function startPairing () {
  try {
    // 发送配对命令
    window.api.hidSend(devices.value.mouse.device!.path, generateHidSendData([reportId, 0x14]));
    window.api.hidSend(devices.value.receiver.device!.path, generateHidSendData([reportId, 0x14]));

    pairingFailedTimer = setTimeout(() => {
      if (!paired.value) {
        console.error("[配对失败] 超时未收到配对成功消息");
        paired.value = false;
      }
    }, 5000); // 5秒超时
  } catch (error) {
    console.error("[配对失败]", error);
  }
}

window.api.onDevices((deviceList: DeviceType[]) => {
  console.log("监听当前连接的usb设备======", deviceList)
  processDevices(deviceList)
});

window.api.onInputreport((devicePath: string, dataArray: number[]) => {
  console.log("接受到的数据======", dataArray)
  // [8, 20, 0, 4, 67, 15, 17, 8, 0, 0, ..., 139]
  if (dataArray[1] === 0x14) { // 配对成功
    ElMessage.success("配对成功！");
    paired.value = true
    if (pairingFailedTimer) {
      clearTimeout(pairingFailedTimer);
      pairingFailedTimer = null;
    }
    rfAddress.value = rfAddress.value = dataArray.slice(4, 8).map(i => i.toString(16).padStart(2, '0').toUpperCase()).join(':');
    // @todo: 获取鼠标内有条形码，显示有的，没有+1设置上去
    barcode3.value = String((Number(barcode3.value) + 1))
  } else if (dataArray[1] === devices.value.mouse.getVersionKey) { // 获取鼠标版本
    devices.value.mouse.version = combineLowAndHigh8Bits(dataArray[4], dataArray[5])
  } else if (dataArray[1] === devices.value.receiver.getVersionKey) { // 获取接收器版本
    devices.value.receiver.version = combineLowAndHigh8Bits(dataArray[4], dataArray[5])
  } else if (dataArray[1] === 0x21 && devicePath == devices.value.mouse.device!.path) {
    devices.value.mouse.usbPhyVersion = combineLowAndHigh8Bits(dataArray[4], dataArray[5])
  } else if (dataArray[1] === 0x21 && devicePath == devices.value.receiver.device!.path) {
    devices.value.receiver.usbPhyVersion = combineLowAndHigh8Bits(dataArray[4], dataArray[5])
  }
});


let wrapper: HTMLElement | null = null;
document.addEventListener('mousedown', (event) => {
  console.log('按下的按钮:', event.button) // 0: 左键, 1: 中键, 2: 右键
  if (event.button == undefined) { return }

  const waveLocationMapp = {
    0: { left: '20px', top: '40px' }, // 左键
    1: { left: '53px', top: '35px' }, // 中键
    2: { left: '90px', top: '40px' },  // 右键
    3: { left: '-5px', top: '120px' },  // 后退
    4: { left: '-5px', top: '80px' },  // 前退
  }
  // 创建波浪元素
  const wave = document.createElement('div')
  wave.classList.add('wave')
  wave.style.left = waveLocationMapp[event.button].left
  wave.style.top = waveLocationMapp[event.button].top
  wrapper?.appendChild(wave)
  wave.addEventListener('animationend', () => {
    wave.remove()
  })
})

function toHex(n) {
  if (n == undefined) { return '' }
  return '0x' + n.toString(16).padStart(4, '0').toUpperCase()
}

onMounted(() => {
  wrapper = document.querySelector('.home-card-wrapper-mouse')
})
</script>

<template>
  <div class="home-page">
    <div class="text" style="display: flex; align-items: center; justify-content: space-between;">
      <span class="ts" style="margin-left: 10px;">{{ t('mouseName') }}</span>
      <div style="display: flex; align-items: center; margin-right: 10px;">
        <div style="font-size: 16px;color: #000;">条形码：</div>
        <el-input v-model="barcode1" style="width: 40px" maxlength="2" placeholder="名"></el-input>
        <el-input v-model="barcode2" style="width: 70px" maxlength="6" placeholder="年月日" disabled></el-input>
        <el-input v-model="barcode3" style="width: 60px" maxlength="5" placeholder="件数"></el-input>

        <div style="width: 154px;;margin-left: 10px;"><svg ref="svgDom"></svg></div>
        <div class="language-switch" @click="toggleLanguage">{{ t('switchToChinese') }}</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 20px;">
      <div class="home-card-wrapper" :class="{ 'home-card-wrapper-success': devices.mouse.device}">
        <div class="home-card-wrapper-mouse">
          <img alt="logo" class="logo" src="./assets/mouse.png" />
        </div>
        <div class="action">
          <span>{{ t('productId') }}: {{ toHex(devices.mouse.device?.productId) }}</span>
        </div>
        <div class="action">
          <span>{{ t('version') }}: {{ devices.mouse.version }}.{{ devices.mouse.usbPhyVersion }}</span>
        </div>
        <div class="action">
          <span>{{ t('rfAddress') }}: {{ rfAddress }}</span>
        </div>
      </div>
      <div class="home-card-wrapper" :class="{ 'home-card-wrapper-success': devices.receiver.device}">
        <div style="position: relative;">
          <img alt="logo" class="logo" src="./assets/mouse.png" style="opacity: 0;" />
          <img alt="logo" class="logo" src="./assets/mouse-receiver.png" style="position: absolute;top: 50%;left: 50%;transform: translate(-50%, -50%);" />
        </div>
        <div class="action">
          <span>{{ t('productId') }}: {{ toHex(devices.receiver.device?.productId) }}</span>
        </div>
        <div class="action">
          <span>{{ t('version') }}: {{ devices.receiver.version }}.{{ devices.receiver.usbPhyVersion }}</span>
        </div>
        <div class="action">
          <span>{{ t('rfAddress') }}: {{ rfAddress }}</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <el-button v-if="paired" type="success" style="width: 100%; ">{{ t('paired') }}</el-button>
      <el-button v-else type="primary" style="width: 100%; " @click="startPairing">{{ t('startPairing') }}</el-button>
    </div>

    <div style="position: absolute; bottom: 2px; width: 100%; text-align: center;color: #ccc;"> v{{ version }}</div>
  </div>
</template>

<style lang="scss" scoped>
.home-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.page-footer {
  padding: 20px;
}

.home-card-wrapper-mouse {
  position: relative;
}
.home-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  width: 49%;
  padding: 30px 20px;
  background-color: #fff;
  border-radius: 20px;
  border: 2px solid #fff;
  box-shadow: 0px 1px 4px 0px rgba(74, 91, 109, 0.1);

  .action span {
    color: rgba(0,0,0,0.45);
    background-color: #f5f5f5;
  }


  .logo {
    margin-bottom: 20px;
    -webkit-user-drag: none;
    width: 128px;
    will-change: filter;
    transition: filter 300ms;
  }

  .logo:hover {
    filter: drop-shadow(0 0 1.2em #6988e6aa);
  }
}

.home-card-wrapper-success {
  border: 2px solid #53b651;
  box-shadow: 0px 1px 4px 0px rgba(83, 182, 81, 0.1);

  .action span {
    color: #53b651;
    background-color: #edf8f0;
  }
}

.home-card-wrapper-fail {
  .action span {
    color: #ea3f4a;
    background-color: #fceef0;
  }
}

.language-switch {
  margin-left: 20px;
  font-size: 16px;
  line-height: 1.5;
  padding: 4px 8px;
  background-color: #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #e0e0e0;
  }
}
</style>
