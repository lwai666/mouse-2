// useGlobalInputListener.ts
import type { Ref } from 'vue'
import { onMounted, onUnmounted, ref } from 'vue'

interface MousePosition {
  x: number
  y: number
}

export function useGlobalInputListener(myChart: any) {
  // 响应式数据
  const mouse: Ref<MousePosition> = ref({ x: 0, y: 0 })

  const lastMouseTime = ref(0)
  const lastMouseX = ref(0)
  const lastMouseY = ref(0)
  const speed = ref(0)

  // 数据队列
  const dataQueue = ref([]) as any
  const maxQueueSize = 50 // 队列最大长度

  // ECharts 坐标转换函数
  const convertToChartCoordinates = (mouseX: number, mouseY: number, speed: number) => {
    // 将鼠标坐标转换为图表坐标
    // 这里可以根据需要调整转换逻辑
    const pointInGrid = myChart.convertFromPixel({ seriesIndex: 1 }, [mouseX / 4, mouseY / 10])

    return { chartX: pointInGrid[0], chartY: pointInGrid[1] }
  }

  // 添加到数据队列
  const addToDataQueue = (dataPoint: any) => {
    dataQueue.value.push(dataPoint)

    // 限制队列大小
    if (dataQueue.value.length > maxQueueSize) {
      dataQueue.value.shift() // 移除最旧的数据点
    }
  }

  let flag = false

  // 事件处理函数
  const handleMouseMove = (event: MouseEvent) => {
    const currentTime = Date.now()
    const deltaX = event.clientX - lastMouseX.value
    const deltaY = event.clientY - lastMouseY.value

    // 计算移动距离
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // 计算速度（px/s）
    if (lastMouseTime.value > 0) {
      const deltaTime = (currentTime - lastMouseTime.value) / 1000
      speed.value = deltaTime > 0 ? Math.round(distance / deltaTime) : 0
    }

    mouse.value = { x: event.clientX, y: event.clientY }
    lastMouseX.value = event.clientX
    lastMouseY.value = event.clientY
    lastMouseTime.value = currentTime

    // 将数据添加到队列
    const chartCoords = convertToChartCoordinates(event.clientX, event.clientY, speed.value)

    const dataPoint = {
      x: Math.abs(chartCoords.chartX),
      y: chartCoords.chartY,
      speed: speed.value > 0 ? Number((event.clientX / speed.value).toFixed(2)) : 0,
    }

    if (flag || dataPoint.speed > 1) {
      return
    }
    flag = true
    setTimeout(() => {
      flag = false
      addToDataQueue(dataPoint)
    }, 100)

    // addToDataQueue(dataPoint)

    // console.log(`Mouse moved to (${mouse.value.x}, ${mouse.value.y}), Speed: ${speed.value}px/s`);
  }

  // 获取队列中最新数据点
  const getLatestDataPoint = () => {
    if (dataQueue.value.length === 0)
      return null
    return dataQueue.value[dataQueue.value.length - 1]
  }

  // 获取队列中倒数第二个数据点（用于计算时间间隔）
  const getPreviousDataPoint = () => {
    if (dataQueue.value.length < 2)
      return null
    return dataQueue.value[dataQueue.value.length - 2]
  }

  // 计算下一个更新间隔（基于上一个点的时间间隔）
  const getNextUpdateInterval = (): number => {
    const previousPoint = getPreviousDataPoint()
    if (!previousPoint)
      return 100 // 默认100ms

    // 使用上一个点的时间间隔作为下一个更新的间隔
    // 乘以1000转换为毫秒，并限制在合理范围内
    return Math.max(16, Math.min(previousPoint.deltaTime * 1000, 1000))
  }

  // 清空数据队列
  const clearDataQueue = () => {
    dataQueue.value = []
  }

  // 开始监听
  const startListening = () => {
    document.body.addEventListener('mousemove', handleMouseMove)
  }

  // 停止监听
  const stopListening = () => {
    document.body.removeEventListener('mousemove', handleMouseMove)
  }

  // 重置统计数据
  const resetStats = () => {
    speed.value = 0
    lastMouseTime.value = 0
    lastMouseX.value = 0
    lastMouseY.value = 0
    clearDataQueue()
  }

  // 生命周期
  onMounted(() => {
    // 添加全局事件监听
  })

  // onUnmounted(() => {
  //   // 移除全局事件监听
  //   document.body.removeEventListener('mousemove', handleMouseMove)
  // })

  // 返回响应式数据和方法
  return {
    handleMouseMove,

    // 响应式数据
    mouse,
    speed,
    dataQueue,

    // 方法
    startListening,
    stopListening,
    resetStats,
    clearDataQueue,
    getLatestDataPoint,
    getPreviousDataPoint,
    getNextUpdateInterval,
  }
}
