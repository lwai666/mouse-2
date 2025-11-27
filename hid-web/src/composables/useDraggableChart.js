class DraggableChart {
  constructor(points) {
    this.points = points
    this.xMin = 0 // X轴最小值
    this.xMax = 250 // X轴最大值
    this.yMin = 0 // Y轴最小值
    this.yMax = 60 // Y轴最大值
  }

  // // 拖拽点的方法-
  // dragPoint(pointIndex, newX, newY) {
  //   if (pointIndex < 0 || pointIndex >= this.points.length) {
  //     throw new Error('点索引超出范围')
  //   }

  //   const constrainedY = Math.max(this.yMin, Math.min(newY, this.yMax))

  //   if (pointIndex === 0) {
  //     // 第一个点：X固定为0，只更新Y坐标
  //     this.points[0] = [0, constrainedY]

  //     // 更新后续所有点，保持固定间距
  //     for (let i = 1; i < this.points.length; i++) {
  //       const newX = this.points[i - 1][0] + 10
  //       // 后续点的Y坐标跟随第一个点的Y坐标变化
  //       this.points[i] = [newX, constrainedY]
  //     }
  //   }

  //   if (pointIndex !== 0) {
  //     const prevPoint = pointIndex > 0 ? this.points[pointIndex - 1] : null
  //     const nextPoint = pointIndex < this.points.length - 1 ? this.points[pointIndex + 1] : null

  //     // 约束X坐标范围
  //     let constrainedX = Math.max(this.xMin, Math.min(newX, this.xMax))

  //     // 约束相邻点的X坐标
  //     if (prevPoint && constrainedX < prevPoint[0] + 10) {
  //       constrainedX = prevPoint[0] + 10
  //     }

  //     if (nextPoint && constrainedX > nextPoint[0] - 10) {
  //       constrainedX = nextPoint[0] - 10
  //     }
  //     // 约束Y坐标范围
  //     const constrainedY = Math.max(this.yMin, Math.min(newY, this.yMax))

  //     // 更新点坐标
  //     this.points[pointIndex] = [constrainedX, constrainedY]

  //     return [...this.points[pointIndex]] // 返回副本
  //   }

  //   // 约束Y坐标范围
  //   // const constrainedY = Math.max(this.yMin, Math.min(newY, this.yMax))
  //   // this.points[pointIndex] = [0, constrainedY]
  //   return [...this.points[pointIndex]] // 返回副本
  // }

  dragPoint(pointIndex, newX, newY) {
    if (pointIndex < 0 || pointIndex >= this.points.length) {
      throw new Error('点索引超出范围')
    }

    // 约束Y坐标范围
    const constrainedY = Math.max(this.yMin, Math.min(newY, this.yMax))
    // 保存拖动前的X坐标，用于准确判断方向
    const originalX = this.points[pointIndex][0]

    if (pointIndex === 0) {
      // 第一个点：X固定为0，只更新Y坐标
      this.points[0] = [0, constrainedY]
      return this.points.map(point => [...point])
    }

    this.points[pointIndex] = [newX, constrainedY]

    // 确保点与点之间保持最小间距
    this.enforceMinSpacing(pointIndex, newX, originalX)

    return this.points.map(point => [...point])
  }

  // 确保所有点保持最小间距
  enforceMinSpacing(pointIndex, newX, originalX) {
    const minSpacing = 10

    for (let i = 1; i < this.points.length; i++) {
      const prevPoint = this.points[i - 1]
      // const nextPoint = this.points[i + 1]

      const currentPoint = this.points[i]

      // 准确判断拖动方向
      const isDraggingRight = newX > originalX
      const isDraggingLeft = newX < originalX

      if (currentPoint[0] < prevPoint[0] + minSpacing) {
        // 如果间距小于最小值，调整当前点及后面的所有点
        const adjustment = prevPoint[0] + minSpacing - currentPoint[0]
        // 向右拖动
        if (isDraggingRight) {
          for (let j = i; j < this.points.length; j++) {
            if (this.points[j][0] - this.points[j - 1][0] <= minSpacing) {
              this.points[j][0] += adjustment
            }
          }
          // // 确保最后一个点不超过xMax
          const lastPoint = this.points[this.points.length - 1]
          if (lastPoint[0] > this.xMax) {
            const overflow = lastPoint[0] - this.xMax
            for (let i = 0; i < this.points.length; i++) {
              if (i >= pointIndex) {
                this.points[i][0] = Math.max(0, this.points[i][0] - overflow)
              }
            }
          }
        }
        // 向左拖动
        if (isDraggingLeft) {
          for (let j = i; j < this.points.length; j--) {
            if (j === -1) {
              break
            }
            if (this.points[j + 1] && this.points[j + 1][0] < this.points[j][0] + minSpacing) {
              this.points[j][0] -= adjustment
            }
          }

          // // 确保第一个点不小于 0
          const firstPoint = this.points[0]
          if (firstPoint[0] < this.xMin) {
            const overflow = firstPoint[0]
            for (let k = i; i < this.points.length; k--) {
              if (k <= pointIndex) {
                this.points[k][0] = Math.max(0, this.points[k][0] - overflow)
              }
            }
          }
        }
        return
      }
      // 单独约束最后一个点
      if (pointIndex === 4 && this.points[pointIndex][0] > this.xMax) {
        const constrainedX = Math.max(this.xMin, Math.min(newX, this.xMax))
        this.points[pointIndex] = [constrainedX, this.points[pointIndex][1]]
        return
      }
    }
  }
}

export {
  DraggableChart,
}
