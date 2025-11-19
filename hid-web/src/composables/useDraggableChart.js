class DraggableChart {
  constructor(points) {
    this.points = points
    this.xMin = 0 // X轴最小值
    this.xMax = 250 // X轴最大值
    this.yMin = 0 // Y轴最小值
    this.yMax = 60 // Y轴最大值
  }

  // // 拖拽点的方法
  dragPoint(pointIndex, newX, newY) {
    if (pointIndex < 0 || pointIndex >= this.points.length) {
      throw new Error('点索引超出范围')
    }

    const constrainedY = Math.max(this.yMin, Math.min(newY, this.yMax))

    if (pointIndex === 0) {
      // 第一个点：X固定为0，只更新Y坐标
      this.points[0] = [0, constrainedY]

      // 更新后续所有点，保持固定间距
      for (let i = 1; i < this.points.length; i++) {
        const newX = this.points[i - 1][0] + 10
        // 后续点的Y坐标跟随第一个点的Y坐标变化
        this.points[i] = [newX, constrainedY]
      }
    }

    if (pointIndex !== 0) {
      const prevPoint = pointIndex > 0 ? this.points[pointIndex - 1] : null
      const nextPoint = pointIndex < this.points.length - 1 ? this.points[pointIndex + 1] : null

      // 约束X坐标范围
      let constrainedX = Math.max(this.xMin, Math.min(newX, this.xMax))

      // 约束相邻点的X坐标
      if (prevPoint && constrainedX < prevPoint[0] + 10) {
        constrainedX = prevPoint[0] + 10
      }

      if (nextPoint && constrainedX > nextPoint[0] - 10) {
        constrainedX = nextPoint[0] - 10
      }
      // 约束Y坐标范围
      const constrainedY = Math.max(this.yMin, Math.min(newY, this.yMax))

      // 更新点坐标
      this.points[pointIndex] = [constrainedX, constrainedY]

      return [...this.points[pointIndex]] // 返回副本
    }

    // 约束Y坐标范围
    // const constrainedY = Math.max(this.yMin, Math.min(newY, this.yMax))
    // this.points[pointIndex] = [0, constrainedY]
    return [...this.points[pointIndex]] // 返回副本
  }

  // dragPoint(pointIndex, newX, newY) {
  //   if (pointIndex < 0 || pointIndex >= this.points.length) {
  //     throw new Error('点索引超出范围')
  //   }

  //   const minSpacing = 10 // 最小间距

  //   // 约束Y坐标范围
  //   const constrainedY = Math.max(this.yMin, Math.min(newY, this.yMax))

  //   if (pointIndex === 0) {
  //     // 第一个点：X固定为0，只更新Y坐标
  //     this.points[0] = [0, constrainedY]
  //     return this.points.map(point => [...point])
  //   }

  //   const prevPoint = this.points[pointIndex - 1]

  //   // 计算当前点允许的最小X坐标（前一个点+间距）
  //   const minX = prevPoint[0] + minSpacing

  //   // 计算整个段落的移动量
  //   const currentX = this.points[pointIndex][0]

  //   const deltaX = newX - currentX

  //   if (deltaX > 0) {
  //     // 向右拖动
  //     // 计算最大允许移动量（受最后一个点和xMax限制）
  //     const nextPoint = this.points[pointIndex + 1][0]

  //     if (newX < nextPoint - 10) {
  //       this.points[pointIndex][0] = newX
  //     }

  //     // const lastPoint = this.points[this.points.length - 1]
  //     // const maxMoveRight = this.xMax - lastPoint[0]
  //     // const actualMove = Math.min(deltaX, maxMoveRight)

  //     // if (actualMove > 0) {
  //     //   // 移动当前点及后面的所有点
  //     //   for (let i = pointIndex; i < this.points.length; i++) {
  //     //     this.points[i][0] += actualMove
  //     //     this.points[i][1] = constrainedY
  //     //   }
  //     // }
  //   }
  //   else if (deltaX < 0) {
  //     // 向左拖动
  //     // 计算最大允许移动量（受前一个点和最小间距限制）
  //     // const maxMoveLeft = currentX - minX
  //     // const actualMove = Math.max(deltaX, -maxMoveLeft)

  //     const prePoint = this.points[pointIndex - 1][0]

  //     if (newX > prePoint - 10) {
  //       this.points[pointIndex][0] = newX
  //     }

  //     // if (actualMove < 0) {
  //     //   // 移动当前点及后面的所有点
  //     //   for (let i = pointIndex; i < this.points.length; i++) {
  //     //     this.points[i][0] += actualMove
  //     //     this.points[i][1] = constrainedY
  //     //   }
  //     // }
  //   }
  //   else {
  //     // 只更新Y坐标
  //     this.points[pointIndex][1] = constrainedY
  //     // 更新后面所有点的Y坐标
  //     for (let i = pointIndex + 1; i < this.points.length; i++) {
  //       // this.points[i][1] = constrainedY
  //     }
  //   }

  //   // // 确保最后一个点不超过xMax
  //   // const lastPoint = this.points[this.points.length - 1]
  //   // if (lastPoint[0] > this.xMax) {
  //   //   const overflow = lastPoint[0] - this.xMax
  //   //   for (let i = pointIndex; i < this.points.length; i++) {
  //   //     this.points[i][0] -= overflow
  //   //   }
  //   // }

  //   // 确保点与点之间保持最小间距
  //   this.enforceMinSpacing()

  //   return this.points.map(point => [...point])
  // }

  // // 确保所有点保持最小间距
  // enforceMinSpacing() {
  //   const minSpacing = 10

  //   for (let i = 1; i < this.points.length; i++) {
  //     const prevPoint = this.points[i - 1]
  //     const currentPoint = this.points[i]

  //     if (currentPoint[0] < prevPoint[0] + minSpacing) {
  //       // 如果间距小于最小值，调整当前点及后面的所有点
  //       const adjustment = prevPoint[0] + minSpacing - currentPoint[0]
  //       for (let j = i; j < this.points.length; j++) {
  //         this.points[j][0] += adjustment
  //       }
  //     }
  //   }

  //   // 确保最后一个点不超过xMax
  //   const lastPoint = this.points[this.points.length - 1]
  //   if (lastPoint[0] > this.xMax) {
  //     const overflow = lastPoint[0] - this.xMax
  //     for (let i = 0; i < this.points.length; i++) {
  //       this.points[i][0] = Math.max(0, this.points[i][0] - overflow)
  //     }
  //   }
  // }
}

export {
  DraggableChart,
}
