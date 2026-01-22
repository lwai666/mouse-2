// useDotsConnection.ts
import { ref } from 'vue'

export interface DotConnection {
  start: HTMLElement
  end: HTMLElement
  line: HTMLElement
}

export interface ConnectionRule {
  from: string // 起始点的选择器
  to: string[] // 可连接的目标点的选择器数组
  maxConnections?: {
    from?: number // 起始点最大连接数
    to?: number // 目标点最大连接数
  }
}

export interface ConnectionOptions {
  lineColor?: string
  lineWidth?: number
  animationDuration?: number
  rules: ConnectionRule[]
  onConnection?: (connection: DotConnection) => void
  onConnectionUpdate?: (newConnection: DotConnection, oldConnection: DotConnection) => void
  onConnectionRemove?: (connection: DotConnection) => void
  onConnectionLeave?: (connection: DotConnection) => void
  hoverScale?: number // 新增：悬停时的缩放比例
  hoverColor?: string // 新增：悬停时的颜色
  dragPointColor?: string // 新增：拖拽点的颜色
  dragCenterPointColor?: string // 新增：拖拽中心点的颜色
  dragPointSize?: number // 新增：拖拽点的大小
  dragPointPulseScale?: number // 新增：呼吸效果缩放比例
  dragPointPulseDuration?: number // 新增：呼吸动画持续时间(ms)
}

export function useDotsConnection(options: ConnectionOptions) {
  const connections = ref<DotConnection[]>([])
  const isDragging = ref(false)
  let startDot: HTMLElement | null = null
  let currentLine: HTMLElement | null = null
  let dragPoint: HTMLElement | null = null // 新增：拖拽点元素
  let hasLeftTarget = false // 新增：标志变量

  // 修改默认配置，添加新的回调
  const defaultOptions: Omit<Required<ConnectionOptions>, 'rules'> = {
    lineColor: '#ffffff',
    lineWidth: 2,
    onConnection: () => {},
    onConnectionUpdate: () => {},
    onConnectionRemove: () => {},
    onConnectionLeave: () => {},
    hoverScale: 1.4,
    animationDuration: 200,
    hoverColor: '#2196F3',
    dragPointColor: '#2196F3',
    dragCenterPointColor: '#fff',
    dragPointSize: 10,
    dragPointPulseScale: 1.2,
    dragPointPulseDuration: 1000,
  }

  const finalOptions = { ...defaultOptions, ...options }

  // 将 calculateLineProperties 移到外层作用域
  function calculateLineProperties(start: { x: number, y: number }, end: { x: number, y: number }) {
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
    return { distance, angle }
  }

  // 将 debounce 函数移到外层作用域，并明确类型
  function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  // 创建基础样式，添加悬停效果
  const createBaseStyles = () => {
    const style = document.createElement('style')
    style.textContent = `
      .connection-line {
        position: absolute;
        height: ${finalOptions.lineWidth}px;
        background-color: ${finalOptions.lineColor};
        transform-origin: left center;
        pointer-events: none;
        z-index: 1;
      }

      [data-connectable="true"],
      [data-connectable-target="true"] {
        transition: transform ${finalOptions.animationDuration}ms ease;
      }

      [data-connectable="true"]:hover,
      [data-connectable-target="true"]:hover {
        transform: scale(${finalOptions.hoverScale});
        border: 3px solid ${finalOptions.hoverColor};
        cursor: pointer;
      }

      @keyframes pulse {
        0% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        50% {
          transform: translate(-50%, -50%) scale(${finalOptions.dragPointPulseScale});
          opacity: 0.7;
        }
        100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
      }
    `
    document.head.appendChild(style)
    return style
  }

  // 获取元素当前的连接数
  const getConnectionCount = (element: HTMLElement): { asStart: number, asEnd: number } => {
    return {
      asStart: connections.value.filter(conn => conn.start === element).length,
      asEnd: connections.value.filter(conn => conn.end === element).length,
    }
  }

  // 检查是否超出连接数限制
  const checkConnectionLimit = (startElement: HTMLElement, endElement: HTMLElement): boolean => {
    const rule = getConnectionRule(startElement)
    if (!rule?.maxConnections)
      return true

    const startCount = getConnectionCount(startElement)
    const endCount = getConnectionCount(endElement)

    // 检查起始点的连接数限制
    if (rule.maxConnections.from !== undefined
      && startCount.asStart >= rule.maxConnections.from) {
      return false
    }

    // 检查目标点的连接数限制
    if (rule.maxConnections.to !== undefined
      && endCount.asEnd >= rule.maxConnections.to) {
      return false
    }

    return true
  }

  // 获取元素对应的连接规则
  const getConnectionRule = (element: HTMLElement): ConnectionRule | undefined => {
    return finalOptions.rules.find(rule =>
      element.matches(rule.from),
    )
  }

  // 检查是否可以连接
  const canConnect = (startDot: HTMLElement, endDot: HTMLElement | null): boolean => {
    if (!endDot)
      return false
    if (startDot === endDot)
      return false

    const rule = getConnectionRule(startDot)
    if (!rule)
      return false

    const isValidTarget = rule.to.some(selector => endDot.matches(selector))
    if (!isValidTarget)
      return false

    // 检查连接数限制
    return checkConnectionLimit(startDot, endDot)
  }

  // 获取所有可连接的点
  const getAllDots = (): HTMLElement[] => {
    const selectors = [
      ...new Set(
        finalOptions.rules.flatMap(rule => [
          rule.from,
          ...rule.to,
        ]),
      ),
    ].join(', ')

    return Array.from(document.querySelectorAll<HTMLElement>(selectors))
  }

  // 获取点的中心坐标
  const getDotCenter = (dot: HTMLElement) => {
    const rect = dot.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
  }

  // 创建或更新线段
  const createOrUpdateLine = (
    startPos: { x: number, y: number },
    endPos: { x: number, y: number },
    lineElement: HTMLElement | null = null,
  ) => {
    if (!lineElement) {
      lineElement = document.createElement('div')
      lineElement.className = 'connection-line'
      document.body.appendChild(lineElement)
    }

    const { distance, angle } = calculateLineProperties(startPos, endPos)

    lineElement.style.width = `${distance}px`
    lineElement.style.left = `${startPos.x}px`
    lineElement.style.top = `${startPos.y}px`
    lineElement.style.transform = `rotate(${angle}deg)`

    return lineElement
  }

  // 更新所有连线
  const updateAllConnections = () => {
    connections.value.forEach((conn) => {
      const startPos = getDotCenter(conn.start)
      const endPos = getDotCenter(conn.end)
      createOrUpdateLine(startPos, endPos, conn.line)
    })
  }

  // 创建新连接
  const createConnection = (startElement: HTMLElement, endElement: HTMLElement) => {
    if (!canConnect(startElement, endElement)) {
      return null
    }

    const startPos = getDotCenter(startElement)
    const endPos = getDotCenter(endElement)
    const line = createOrUpdateLine(startPos, endPos)

    const connection: DotConnection = {
      start: startElement,
      end: endElement,
      line,
    }

    connections.value.push(connection)

    // 触发连接回调
    if (finalOptions.onConnection) {
      finalOptions.onConnection(connection)
    }

    return connection
  }

  // 手动添加连接
  const addConnection = (fromSelector: string, toSelector: string) => {
    const startElement = document.querySelector<HTMLElement>(fromSelector)
    const endElement = document.querySelector<HTMLElement>(toSelector)

    if (!startElement || !endElement) {
      console.warn('Elements not found')
      return null
    }

    return createConnection(startElement, endElement)
  }

  // 创建拖拽点
  const createDragPoint = () => {
    const point = document.createElement('div')
    point.style.cssText = `
      position: fixed;
      width: ${finalOptions.dragPointSize}px;
      height: ${finalOptions.dragPointSize}px;
      background-color: ${finalOptions.dragCenterPointColor};
      border-radius: 50%;
      border: 3px solid ${finalOptions.dragPointColor};
      pointer-events: none;
      z-index: 1000;
      animation: pulse ${finalOptions.dragPointPulseDuration}ms ease-in-out infinite;
      transform: translate(-50%, -50%);
    `
    document.body.appendChild(point)
    return point
  }

  // 初始化连接功能
  const initialize = () => {
    const baseStyle = createBaseStyles()
    const dots = getAllDots()

    // 标记可作为起点和目标点的元素
    dots.forEach((dot) => {
      // 标记可作为起点的元素
      if (finalOptions.rules.some(rule => dot.matches(rule.from))) {
        dot.setAttribute('data-connectable', 'true')
      }

      // 标记可作为目标点的元素
      if (finalOptions.rules.some(rule => rule.to.some(selector => dot.matches(selector)))) {
        dot.setAttribute('data-connectable-target', 'true')
      }
    })

    // 鼠标按下事件
    const handleMouseDown = (e: MouseEvent) => {
      const dot = e.currentTarget as HTMLElement

      // 检查是否是已连接的目标点
      const existingConnection = connections.value.find(conn => conn.end === dot)
      if (existingConnection) {
        // 如果是已连接的目标点，开始修改连线
        isDragging.value = true
        startDot = existingConnection.start
        currentLine = existingConnection.line
        // 存储旧连接以便后续触发更新事件
        const oldConnection = { ...existingConnection }

        // 临时移除旧连接
        connections.value = connections.value.filter(conn => conn !== existingConnection)

        // 设置一个标记，表示正在修改现有连线
        ;(currentLine as any).__oldConnection = oldConnection
        dragPoint = createDragPoint()
        dragPoint.style.left = `${e.clientX}px`
        dragPoint.style.top = `${e.clientY}px`
        return
      }

      // 原有的创建新连线逻辑
      if (!finalOptions.rules.some(rule => dot.matches(rule.from)))
        return

      isDragging.value = true
      startDot = dot
      const startPos = getDotCenter(dot)
      currentLine = createOrUpdateLine(startPos, startPos)
      dragPoint = createDragPoint()
      dragPoint.style.left = `${e.clientX}px`
      dragPoint.style.top = `${e.clientY}px`
      e.preventDefault()
    }

    // 鼠标移动事件
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.value || !startDot)
        return

      const startPos = getDotCenter(startDot)
      const currentPos = { x: e.clientX, y: e.clientY }
      createOrUpdateLine(startPos, currentPos, currentLine)

      const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
      document.body.style.cursor = canConnect(startDot, elementUnderCursor) ? 'pointer' : 'not-allowed'

      if (dragPoint) {
        dragPoint.style.left = `${e.clientX}px`
        dragPoint.style.top = `${e.clientY}px`
      }

      // 新增：拖拽修改连线时，检测是否离开原目标点
      if (isDragging.value && currentLine && (currentLine as any).__oldConnection) {
        const oldConnection = (currentLine as any).__oldConnection as DotConnection
        if (elementUnderCursor !== oldConnection.end && !hasLeftTarget) {
          hasLeftTarget = true
          finalOptions.onConnectionLeave?.(oldConnection)
        }
        // 如果又回到目标点，允许再次触发
        if (elementUnderCursor === oldConnection.end) {
          hasLeftTarget = false
        }
      }
    }

    // 鼠标松开事件
    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging.value || !startDot || !currentLine)
        return

      const endElement = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      const oldConnection = (currentLine as any).__oldConnection

      // 如果是在修改现有连线
      if (oldConnection) {
        // 如果没有找到目标元素或目标元素不可连接，则删除连线
        if (!endElement || !canConnect(startDot, endElement)) {
          currentLine.remove()
          // 触发删除回调
          finalOptions.onConnectionRemove(oldConnection)
        }
        // 如果找到了新的可连接目标点
        else if (canConnect(startDot, endElement)) {
          const newConnection: DotConnection = {
            start: startDot,
            end: endElement,
            line: currentLine,
          }
          connections.value.push(newConnection)

          // 更新连线位置
          const startPos = getDotCenter(startDot)
          const endPos = getDotCenter(endElement)
          createOrUpdateLine(startPos, endPos, currentLine)

          // 触发更新回调
          finalOptions.onConnectionUpdate(newConnection, oldConnection)
        }
      }
      // 如果是创建新连线
      else {
        if (endElement && canConnect(startDot, endElement)) {
          createConnection(startDot, endElement)
        }
        currentLine.remove()
      }

      currentLine = null
      delete (currentLine as any)?.__oldConnection
      document.body.style.cursor = 'default'
      isDragging.value = false
      startDot = null

      if (dragPoint) {
        dragPoint.remove()
        dragPoint = null
      }

      hasLeftTarget = false // 新增：重置
    }

    // 添加事件监听器
    dots.forEach((dot) => {
      dot.addEventListener('mousedown', handleMouseDown)
    })

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    const debouncedUpdate = debounce(updateAllConnections, finalOptions.animationDuration)
    window.addEventListener('resize', debouncedUpdate)

    // 清理函数
    const cleanup = () => {
      dots.forEach((dot) => {
        dot.removeEventListener('mousedown', handleMouseDown)
      })
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('resize', debouncedUpdate)
      baseStyle.remove()
      connections.value.forEach(conn => conn.line.remove())
      connections.value = []
      if (dragPoint) {
        dragPoint.remove()
        dragPoint = null
      }
    }

    return cleanup
  }

  // 删除特定连线
  const removeConnection = (connection: DotConnection) => {
    connection.line.remove()
    connections.value = connections.value.filter(conn => conn !== connection)
    // 触发删除回调
    finalOptions.onConnectionRemove(connection)
  }

  // 清除所有连线
  const clearConnections = () => {
    connections.value.forEach(conn => conn.line.remove())
    connections.value = []
  }

  // 生命周期钩子
  // onMounted(() => {
  //   const cleanup = initialize()
  //   onUnmounted(() => {
  //     cleanup()
  //   })
  // })

  const cleanup = initialize()

  return {
    cleanup,
    connections,
    isDragging,
    removeConnection,
    clearConnections,
    updateConnections: updateAllConnections,
    addConnection, // 导出新方法
  }
}
