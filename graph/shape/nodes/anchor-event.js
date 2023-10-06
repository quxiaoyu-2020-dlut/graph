let dragLog = [], // 记录鼠标坐标
  zoom = 1, // 当前画布缩放比例
  anchorNodeId = null // dragover 也会发生在拖拽的锚点上, 用于记录当前拖拽的节点id

export default (anchor, group, p) => {
  // 鼠标移入事件
  anchor.on("mouseenter", () => {
    // 可以传入多个键值对
    anchor.attr({
      cursor: "pointer"
    })
  })

  // 拖拽事件
  anchor.on("dragstart", e => {
    const { type, direction } = group.getFirst().attr()
    const diff = type === "triangle-node" ? (direction === "up" ? 1 : 0) : 0.5
    const bBox = group.get("item").getBBox()
    const id = group.get("item").get("id")
    const point = [
      bBox.width * (p[0] - 0.5), // x
      bBox.height * (p[1] - diff) // y
    ]

    dragLog = [e.x, e.y]

    // 添加线条
    const line = group.addShape("path", {
      attrs: {
        stroke: "#1890FF",
        lineDash: [5, 5],
        path: [
          ["M", ...point],
          ["L", ...point]
          // ['M', point[0], point[1]],
          // ['L', point[0] / 3 + (2 / 3) * point[0], point[1]],
          // ['L', point[0] / 4 + (3 / 4) * point[0], point[1]],
          // ['L', point[0], point[1]],
  

        ]
      },
      className: "dashed-line",
      pointStart: point
    })

    // 置于顶层
    group.toFront()
    line.toFront() // 最后把这条线层级提升至最高
    anchorNodeId = id
    // 计算当前画布缩放比例
    zoom = window.$welabxG6 ? window.$welabxG6.getZoom() : 1
  })

  // 拖拽中
  anchor.on("drag", e => {
    const line = group.$getItem("dashed-line")
    const { type, direction } = group.getFirst().attr()
    const canvasBox = group.get("children")[0].get("canvasBBox")

    // const canvasBox = group.get('children')[0].cfg.el.getBoundingClientRect();
    if (!canvasBox || !line) return

    const diff = type === "triangle-node" ? (direction === "up" ? canvasBox.height : 0) : canvasBox.height / 2
    const pointStart = line.get("pointStart")
    const endPoint = [(e.x - canvasBox.x - canvasBox.width / 2) / zoom, (e.y - canvasBox.y - diff) / zoom]

    line.toFront()
    /**
     * 计算方法:
     * 鼠标位置 - box左上角 - width/2 => 中心坐标
     * 这里 1px 是为了让鼠标释放时 node: drag 事件监听到 target, 而不是当前虚线
     */

    // 如果鼠标移动距离超过 10px 就开始计算角度
    if (
      Math.sqrt(
        Math.pow(Math.abs(dragLog[0]) - Math.abs(e.x), 2) + Math.pow(Math.abs(dragLog[1]) - Math.abs(e.y), 2)
      ) >= 10
    ) {
      if (e.x >= dragLog[0]) {
        // 右下
        if (e.y >= dragLog[1]) {
          endPoint[0] -= 1
          endPoint[1] -= 1
        } else {
          // 右上
          endPoint[0] -= 1
          endPoint[1] -= 1
        }
      } else {
        // 左上
        if (e.y >= dragLog[1]) {
          endPoint[0] += 1
          endPoint[1] += 1
        } else {
          // 左下
          endPoint[0] += 1
          endPoint[1] += 1
        }
      }
    }

    line.attr({
      path: [
        ["M", ...pointStart],
        ["L", pointStart[0], pointStart[1] + 4],
        ["C", pointStart[0], pointStart[1] + 50, endPoint[0], endPoint[1] - 50, endPoint[0], endPoint[1] - 4],
        ["L", endPoint[0], endPoint[1]]
      ]
    })
  })

  // 拖拽结束删除虚线
  anchor.on("dragend", e => {
    const item = group.$getItem("dashed-line")

    item.remove()
    anchorNodeId = null
  })

  // 拖拽到其他锚点上
  anchor.on("dragenter", e => {
    // 排除相同节点的锚点
    if (e.target.cfg.nodeId !== anchorNodeId) {
      const { index } = e.target.cfg

      if (group.getAllAnchorBg()[index]) {
        group.getAllAnchorBg()[index].attr("fillOpacity", 0.7)
      }
    }
  })

  // 拖拽离开事件
  anchor.on("dragleave", e => {
    // 排除相同节点的锚点
    if (e.target.cfg.nodeId !== anchorNodeId) {
      const { index } = e.target.cfg

      if (group.getAllAnchorBg()[index]) {
        group.getAllAnchorBg()[index].attr("fillOpacity", 0.5)
      }
    }
  })

  // ! 在锚点上释放见node监听事件
}
