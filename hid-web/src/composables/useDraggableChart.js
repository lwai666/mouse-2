class DraggableChart {
  constructor(points) {
    this.points = points
    this.xMin = 0 // X轴最小值
    this.xMax = 250 // X轴最大值
    this.yMin = 0 // Y轴最小值
    this.yMax = 60 // Y轴最大值
  }

  // 拖拽点的方法
  dragPoint(pointIndex, newX, newY) {
    if (pointIndex < 0 || pointIndex >= this.points.length) {
      throw new Error('点索引超出范围')
    }

    const prevPoint = pointIndex > 0 ? this.points[pointIndex - 1] : null
    const nextPoint = pointIndex < this.points.length - 1 ? this.points[pointIndex + 1] : null

    // 约束X坐标范围
    let constrainedX = Math.max(this.xMin, Math.min(newX, this.xMax))

    // 约束相邻点的X坐标
    if (prevPoint && constrainedX < prevPoint[0]) {
      constrainedX = prevPoint[0]
    }

    if (nextPoint && constrainedX > nextPoint[0]) {
      constrainedX = nextPoint[0]
    }

    // 约束Y坐标范围
    let constrainedY = Math.max(this.yMin, Math.min(newY, this.yMax))

    // 更新点坐标
    this.points[pointIndex] = [constrainedX, constrainedY]

    return [...this.points[pointIndex]] // 返回副本
  }

  // 设置坐标范围
  setBounds(xMin, xMax, yMin, yMax) {
    this.xMin = xMin
    this.xMax = xMax
    this.yMin = yMin
    this.yMax = yMax

    // 应用新的范围约束到所有点
    this.applyBoundsToAllPoints()
  }

  // 应用范围约束到所有点
  applyBoundsToAllPoints() {
    for (let i = 0; i < this.points.length; i++) {
      let [x, y] = this.points[i]

      // 约束X坐标
      x = Math.max(this.xMin, Math.min(x, this.xMax))

      // 约束Y坐标
      y = Math.max(this.yMin, Math.min(y, this.yMax))

      // 确保X坐标顺序
      if (i > 0 && x < this.points[i - 1][0]) {
        x = this.points[i - 1][0]
      }

      this.points[i] = [x, y]
    }
  }
}

export { DraggableChart }

//   // 使用示例
//   const chart = new DraggableChart([
//     [0, 40],
//     [38, 42],
//     [70, 50],
//     [126.17, 28.33],
//     [180, 60]
//   ]);

//   // 拖拽测试
//   console.log('拖拽点2到(65, 55):', chart.dragPoint(2, 65, 55));
//   console.log('拖拽点1到(100, 45):', chart.dragPoint(1, 100, 45)); // 会被约束到70
//   console.log('拖拽点3到(50, 30):', chart.dragPoint(3, 50, 30)); // 会被约束到70

//   console.log('所有点:', chart.getPoints());
