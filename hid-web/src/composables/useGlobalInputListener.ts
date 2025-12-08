// useGlobalInputListener.ts
import type { Ref } from 'vue'

interface MousePosition {
  x: number
  y: number
}

let myChartRef = null as any

export function useGlobalInputListener(myChart?: any) {
  // 响应式数据
  const mouse: Ref<MousePosition> = ref({ x: 0, y: 0 })

  const lastMouseTime = ref(0)
  const lastMouseX = ref(0)
  const lastMouseY = ref(0)
  const speed = ref(0)

  // 数据队列
  const dataQueue = ref([]) as any

  myChartRef = myChartRef || myChart

  // ECharts 坐标转换函数
  const convertToChartCoordinates = (mouseX: number, mouseY: number) => {
    // 将鼠标坐标转换为图表坐标
    // 这里可以根据需要调整转换逻辑
    const pointInGrid = myChartRef.convertFromPixel({ seriesIndex: 1 }, [mouseX, mouseY])

    return { chartX: pointInGrid[0], chartY: pointInGrid[1] }
  }

  // 事件处理函数
  const handleMouseMove = (event: MouseEvent) => {
    const currentTime = Date.now()
    const deltaX = event.clientX - lastMouseX.value
    const deltaY = event.clientY - lastMouseY.value

    // 计算移动距离
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // 计算速度（px/s）
    if (lastMouseTime.value > 0) {
      const deltaTime = (currentTime - lastMouseTime.value) / 100
      speed.value = deltaTime > 0 ? Math.round(distance / deltaTime) : 0
    }

    mouse.value = { x: event.clientX, y: event.clientY }
    lastMouseX.value = event.clientX
    lastMouseY.value = event.clientY
    lastMouseTime.value = currentTime

    // 将数据添加到队列
    const chartCoords = convertToChartCoordinates(distance , event.clientY)

    const dataPoint = {
      x: Math.abs(chartCoords.chartX),
      y: chartCoords.chartY,
      speed: speed.value > 0 ? Number((distance / speed.value).toFixed(2)) : 0,
    }
    return dataPoint
  }

  // 清空数据队列
  const clearDataQueue = () => {
    dataQueue.value = []
  }

  // onUnmounted(() => {
  //   // 移除全局事件监听
  //   document.body.removeEventListener('mousemove', handleMouseMove)
  // })

  // 返回响应式数据和方法
  return {
    handleMouseMove,

    // 响应式数据
    dataQueue,
    clearDataQueue,
  }
}
