<script>
export default {
  name: 'BrowserInputListener',
  data() {
    return {
      mouse: { x: 0, y: 0 },
      mouseButtons: [],
      pressedKeys: [],
      lastMouseTime: 0,
      lastMouseX: 0,
      lastMouseY: 0,
      speed: 0,
      totalDistance: 0,
    }
  },
  mounted() {
    // 监听窗口失去焦点事件，清除按键状态
    window.addEventListener('blur', this.clearInputStates)
  },
  beforeUnmount() {
    window.removeEventListener('blur', this.clearInputStates)
  },
  methods: {
    handleMouseMove(event) {
      const currentTime = Date.now()
      const deltaX = event.clientX - this.lastMouseX
      const deltaY = event.clientY - this.lastMouseY

      // 计算移动距离
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      this.totalDistance += distance

      // 计算速度（px/s）
      if (this.lastMouseTime > 0) {
        const deltaTime = (currentTime - this.lastMouseTime) / 1000
        this.speed = deltaTime > 0 ? Math.round(distance / deltaTime) : 0
      }

      this.mouse.x = event.clientX
      this.mouse.y = event.clientY
      this.lastMouseX = event.clientX
      this.lastMouseY = event.clientY
      this.lastMouseTime = currentTime

      this.$emit('mouse-move', {
        x: event.clientX,
        y: event.clientY,
        speed: this.speed,
        distance: this.totalDistance,
      })
    },

    handleMouseDown(event) {
      const button = this.getMouseButtonName(event.button)
      if (!this.mouseButtons.includes(button)) {
        this.mouseButtons.push(button)
      }

      this.$emit('mouse-down', {
        button: event.button,
        buttonName: button,
        x: event.clientX,
        y: event.clientY,
      })
    },

    handleMouseUp(event) {
      const button = this.getMouseButtonName(event.button)
      this.mouseButtons = this.mouseButtons.filter(b => b !== button)

      this.$emit('mouse-up', {
        button: event.button,
        buttonName: button,
        x: event.clientX,
        y: event.clientY,
      })
    },

    handleKeyDown(event) {
      const key = event.key === ' ' ? 'Space' : event.key
      if (!this.pressedKeys.includes(key)) {
        this.pressedKeys.push(key)
      }

      this.$emit('key-down', {
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      })

      // 阻止默认行为（可选）
      // event.preventDefault();
    },

    handleKeyUp(event) {
      const key = event.key === ' ' ? 'Space' : event.key
      this.pressedKeys = this.pressedKeys.filter(k => k !== key)

      this.$emit('key-up', {
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
      })
    },

    getMouseButtonName(button) {
      const buttons = {
        0: 'Left',
        1: 'Middle',
        2: 'Right',
        3: 'Back',
        4: 'Forward',
      }
      return buttons[button] || `Button${button}`
    },

    clearInputStates() {
      this.mouseButtons = []
      this.pressedKeys = []
    },
  },
}
</script>

<template>
  <!-- @mousedown="handleMouseDown" @mouseup="handleMouseUp"  -->
  <div
    class="input-container"
    tabindex="0"
    @mousemove="handleMouseMove"
    @keydown="handleKeyDown" @keyup="handleKeyUp"
  >
    <h3>浏览器输入监听</h3>
    <div>鼠标位置: X: {{ mouse.x }}, Y: {{ mouse.y }}</div>
    <div>鼠标按下: {{ mouseButtons.join(', ') }}</div>
    <div>按键: {{ pressedKeys.join(', ') }}</div>
    <div>移动速度: {{ speed }} px/s</div>
    <div>总移动距离: {{ totalDistance }} px</div>
  </div>
</template>

<style scoped>
.input-container {
  width: 100%;
  height: 400px;
  border: 2px dashed #00c6ff;
  border-radius: 10px;
  padding: 20px;
  background: rgba(0, 198, 255, 0.1);
  outline: none; /* 移除焦点轮廓 */
}

.input-container:focus {
  border-color: #ff4081;
  background: rgba(255, 64, 129, 0.1);
}
</style>
