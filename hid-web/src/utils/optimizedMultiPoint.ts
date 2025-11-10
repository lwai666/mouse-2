/**
 * 插值点类型（包含t值）
 */
type InterpolatedPoint = [number, number]

/**
 * 插值选项类型
 */
interface InterpolationOptions {
  /** 平滑度，0-1之间，默认0.6 */
  smoothness?: number
  /** 步长，默认1 */
  step?: number
  /** 精度，小数点位数，默认4 */
  precision?: number
  /** 是否包含端点，默认false */
  includeEndpoints?: boolean
}

/**
 * 快速插值选项类型
 */
interface QuickInterpolationOptions {
  /** 步长，默认1 */
  step?: number
  /** 精度，小数点位数，默认2 */
  precision?: number
  /** 是否包含端点，默认false */
  includeEndpoints?: boolean
}

/**
 * 预设配置类型
 */
interface InterpolationPresets {
  dense: InterpolationOptions
  normal: InterpolationOptions
  sparse: InterpolationOptions
}

/**
 * 针对数组格式的多点平滑插值优化版
 */
function arrayFormatInterpolation(
  pointsArray: [number, number][],
  options: InterpolationOptions = {},
): InterpolatedPoint[] {
  const {
    smoothness = 0.6,
    step = 1,
    precision = 4,
    includeEndpoints = false,
  } = options

  // 参数验证和转换
  if (!Array.isArray(pointsArray) || pointsArray.length < 2) {
    throw new Error('至少需要2个点进行插值')
  }

  // 转换为对象格式并排序
  const sortedPoints: ({ originalIndex: number })[] = pointsArray
    .map(([x, y], index) => ({ x, y, originalIndex: index }))
    .sort((a, b) => a.x - b.x)
    .filter((point, index, array) =>
      index === 0 || point.x !== array[index - 1].x,
    )

  const results: InterpolatedPoint[] = []

  // 处理每个线段
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i]
    const end = sortedPoints[i + 1]

    const segmentPoints = generateSegmentPoints(start, end, {
      smoothness,
      step,
      precision,
      includeStart: includeEndpoints && i === 0,
    })

    results.push(...segmentPoints)
  }

  // 添加最后一个终点
  if (includeEndpoints) {
    const lastPoint = sortedPoints[sortedPoints.length - 1] as any
    results.push(createPoint(lastPoint[0], lastPoint[1], 1, precision))
  }

  return results
}

/**
 * 生成单个线段的插值点
 */
function generateSegmentPoints(
  start,
  end,
  options: {
    smoothness: number
    step: number
    precision: number
    includeStart: boolean
  },
): InterpolatedPoint[] {
  const { smoothness, step, precision, includeStart } = options
  const { x: x0, y: y0 } = start
  const { x: x1, y: y1 } = end

  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)

  const results: InterpolatedPoint[] = []

  // 添加起点
  if (includeStart) {
    results.push(createPoint(x0, y0, 0, precision))
  }

  // 预计算控制点（优化计算）
  const dx = x1 - x0
  const dy = y1 - y0

  // 更合理的控制点计算，考虑y轴变化
  const CP1 = {
    x: x0 + dx * smoothness,
    y: y0 + dy * smoothness * 0.3,
  }
  const CP2 = {
    x: x1 - dx * smoothness,
    y: y1 - dy * smoothness * 0.3,
  }

  // 生成中间点
  const startX = includeStart ? minX + step : minX

  for (let x = startX; x < maxX; x += step) {
    const t = findTForX(x, x0, x1, CP1, CP2)
    const point = calculateBezierPoint(t, x0, y0, x1, y1, CP1, CP2)

    results.push(createPoint(x, point.y, t, precision))
  }

  return results
}

/**
 * 计算贝塞尔曲线点（优化版）
 */
function calculateBezierPoint(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  CP1,
  CP2,
) {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t

  return {
    x: x0 * mt3 + 3 * CP1.x * mt2 * t + 3 * CP2.x * mt * t2 + x1 * t3,
    y: y0 * mt3 + 3 * CP1.y * mt2 * t + 3 * CP2.y * mt * t2 + y1 * t3,
  }
}

/**
 * 二分法查找t值（优化版）
 */
function findTForX(
  targetX: number,
  x0: number,
  x1: number,
  CP1,
  CP2,
): number {
  let low = 0; let high = 1
  const precision = 1e-6

  // 先检查边界情况
  if (Math.abs(targetX - x0) < precision)
    return 0
  if (Math.abs(targetX - x1) < precision)
    return 1

  for (let i = 0; i < 20; i++) { // 减少迭代次数
    const t = (low + high) / 2
    const x = calculateBezierPoint(t, x0, 0, x1, 0, CP1, CP2).x

    if (Math.abs(x - targetX) < precision)
      return t
    x < targetX ? low = t : high = t
  }

  return (low + high) / 2
}

/**
 * 创建格式化点
 */
function createPoint(x: number, y: number, t: number, precision: number): InterpolatedPoint {
//   return {
//     x: round(x, precision),
//     y: round(y, precision),
//     t: round(t, 4),
//   }
  return [round(x, precision), round(y, precision)]
}

/**
 * 四舍五入到指定精度
 */
function round(value: number, precision: number): number {
  if (precision === 0)
    return Math.round(value)
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

/**
 * 预设配置
 */
const presets: InterpolationPresets = {
  dense: { step: 1, smoothness: 0.6, precision: 2 },
  normal: { step: 5, smoothness: 0.5, precision: 1 },
  sparse: { step: 10, smoothness: 0.4, precision: 0 },
}

/**
 * 使用预设配置的便捷函数
 */
function interpolateWithPreset(
  pointsArray: [number, number][],
  preset: keyof InterpolationPresets = 'normal',
  includeEndpoints: boolean = false,
): InterpolatedPoint[] {
  return arrayFormatInterpolation(pointsArray, {
    ...presets[preset],
    includeEndpoints,
  })
}

// 导出类型和函数
export {
  arrayFormatInterpolation,
  interpolateWithPreset,
  presets,
}

export type {
  QuickInterpolationOptions,
}
