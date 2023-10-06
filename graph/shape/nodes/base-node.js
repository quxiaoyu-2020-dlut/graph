import itemEvents from "./item-event"
import anchorEvent from "./anchor-event"
import defaultStyles from "../defaultStyles"

const { iconStyles, nodeStyles, anchorPointStyles, nodeLabelStyles } = defaultStyles

function getStyle(options, cfg) {
  return {
    ...cfg,
    // 自定义默认样式
    ...nodeStyles,
    ...options,
    // 当前节点样式
    ...cfg.style,
    // 文本配置
    labelCfg: {
      ...nodeLabelStyles,
      ...cfg.labelCfg
    },
    // 图标样式
    iconStyles: {
      ...iconStyles,
      ...cfg.iconStyles
    },
    // 锚点样式
    anchorPointStyles: {
      ...anchorPointStyles,
      ...cfg.anchorPointStyles
    },
    ...cfg.nodeStateStyles,
    // 锚点高亮样式
    anchorHotsoptStyles: cfg.anchorHotsoptStyles
  }
}

/*
 * 注册基础node => 添加锚点/图标 => 绘制node => 初始化node状态 => node动画(设置交互动画)
 */
export default G6 => {
  G6.registerNode(
    "base-node",
    {
      // 绘制锚点
      initAnchor(cfg, group) {
        group.anchorShapes = []
        group.showAnchor = () => {
          this.drawAnchor(cfg, group)
        }
        group.clearAnchor = () => {
          if (group.anchorShapes) {
            const line = group.$getItem("dashed-line")

            if (line) {
              line.remove()
            }
            group.anchorShapes.forEach(a => a.remove())
          }
          group.anchorShapes = []
        }
      },

      drawAnchor(cfg, group) {
        const { type, direction, anchorPointStyles } = group.getFirst().attr()
        const item = group.get("children")[0]
        const bBox = item.getBBox()
        const anchors = this.getAnchorPoints(cfg)

        // 绘制锚点坐标
        anchors &&
          anchors.forEach((p, i) => {
            const diff = type === "triangle-node" ? (direction === "up" ? 1 : 0) : 0.5
            const x = bBox.width * (p[0] - 0.5)
            const y = bBox.height * (p[1] - diff)

            /**
             * 绘制三层锚点
             * 最底层: 锚点bg
             * 中间层: 锚点
             * 最顶层: 锚点group, 用于事件触发
             */
            // 视觉锚点
            const anchor = group.addShape("circle", {
              attrs: {
                x,
                y,
                ...anchorPointStyles
              },
              zIndex: 1,
              nodeId: group.get("id"),
              className: "node-anchor",
              draggable: true,
              isAnchor: true,
              index: i
            })

            // 锚点事件触发的元素
            const anchorGroup = group.addShape("circle", {
              attrs: {
                x,
                y,
                r: 11,
                fill: "#000",
                opacity: 0
              },
              zIndex: 2,
              nodeId: group.get("id"),
              className: "node-anchor-group",
              draggable: true,
              isAnchor: true,
              index: i
            })

            /**
             * 添加锚点事件绑定
             */
            anchorEvent(anchorGroup, group, p)

            group.anchorShapes.push(anchor)
            group.anchorShapes.push(anchorGroup)
          })

        // 查找所有锚点
        group.getAllAnchors = () => {
          return group.anchorShapes.filter(c => c.get("isAnchor") === true)
        }
        // 查找指定锚点
        group.getAnchor = i => {
          return group.anchorShapes.filter(c => c.get("className") === "node-anchor" && c.get("index") === i)
        }
        // 查找所有锚点背景
        group.getAllAnchorBg = () => {
          return group.anchorShapes.filter(c => c.get("className") === "node-anchor-bg")
        }
      },

      /* 绘制节点，包含文本 */
      draw(cfg, group) {
        return this.drawShape(cfg, group)
      },

      // 绘制头部
      drawTitle(cfg, group, attrs) {
        const { preRect, width, height } = attrs
        group.addShape("rect", {
          attrs: {
            x: -width / 2 - 1,
            y: -height / 2 - 1,
            width: 252,
            height: 40,
            fill: "#1890FF",
            radius: [5, 5, 0, 0],
            cursor: "pointer"
          }
        })
        group.addShape("text", {
          attrs: {
            text: cfg.rootFlag == 1 ? "初始客户" : cfg.label,
            x: 0,
            y: -height / 2 + 20,
            textAlign: "center",
            textBaseline: "middle",
            lineHeight: 40,
            fill: "#ffffff",
            fontSize: 16
          },
          className: "node-title"
        })
      },

      // 绘制中间区域
      drawCenter(cfg, group, attrs) {
        const { width, height } = attrs
        if (cfg.rootFlag == 1) {
          let source = ""
          if (cfg.data.hasOwnProperty("customerSource")) {
            source = cfg.data.customerSource == 0 ? "全量客群" : "指定客群"
          } else {
            source = "请选择客群"
          }
          group.addShape("text", {
            attrs: {
              text: "客户来源" + "  " + source,
              x: source == "全量客群" || source == "请选择客群" ? -width / 2 + 55 : -width / 2 + 20,
              y: -height / 2 + 80,
              lineHeight: 40,
              fill: "#121a32",
              fontSize: 16,
              cursor: "pointer"
            },
            className: "node-source"
          })
          // 指定客群
          let txt = cfg.data.customerCode || ""
          let index = txt.lastIndexOf("|")
          txt = txt.substring(index + 1, txt.length)
          if (txt.length > 8) {
            txt = txt.substring(0, 8) + "..."
          }
          group.addShape("text", {
            attrs: {
              text: "客群名称" + "  " + txt,
              x: -width / 2 + 20,
              y: -height / 2 + 120,
              lineHeight: 40,
              fill: "#121a32",
              fontSize: 16,
              cursor: "pointer",
              opacity: cfg.data.customerSource == 1 ? 1 : 0
            },
            className: "node-source-name"
          })
        } else {
          this.drawCenterBox(cfg, group, attrs, "触发条件", 60, "#f2faee", 80)
          this.drawCenterBox(cfg, group, attrs, "触发时间", 150, "#fef8ed", 60)
          this.drawCenterBox(cfg, group, attrs, "营销动作", 220, "#ecf3ff", 80)
        }
      },

      // 中间区块
      drawCenterBox(cfg, group, attrs, title, boxHeight, color, sHeight) {
        const { width, height } = attrs
        group.addShape("rect", {
          attrs: {
            x: -width / 2 + 15,
            y: -height / 2 + boxHeight,
            width: 220,
            height: sHeight,
            fill: color,
            radius: 5,
            cursor: "pointer"
          }
        })
        group.addShape("text", {
          attrs: {
            text: title,
            x: -100,
            y: -height / 2 + boxHeight + 30,
            lineHeight: 40,
            fill: "#121a32",
            fontSize: 14
          },
          className: "node-subtitle"
        })
        let text, y, type
        const dy = -height / 2 + boxHeight
        if (title == "触发条件") {
          let eventTypeName = cfg.data.observationEvent.length ? cfg.data.observationEvent[0].eventTypeName : ""
          if (eventTypeName == "") {
            text = "无"
          } else {
            let observationPeriod = cfg.data.observationPeriod == -1 ? "" : cfg.data.observationPeriod
            let completionTimes = cfg.data.observationEvent.length ? cfg.data.observationEvent[0].completionTimes : ""
            text = "客户在 " + observationPeriod + "天 内完成 " + eventTypeName + completionTimes + "次"
            text = this.fittingStr(text, 230, 14).res
          }
          let flag = this.fittingStr(text, 230, 14).flag
          y = flag ? dy + 70 : dy + 50
          type = "one"
        } else if (title == "触发时间") {
          text = cfg.data.triggerTimeWay == 1 ? "立即触发" : "观察期结束触发"
          y = dy + 50
          type = "two"
        } else {
          let bounsNum = 0
          if (cfg.data.bonusActivityCode) {
            bounsNum = cfg.data.bonusActivityCode == "" ? 0 : cfg.data.bonusActivityCode.split("#").length
          }
          let notifyNum = cfg.data.notifyInfo ? cfg.data.notifyInfo.length : 0
          text = "权益活动" + bounsNum + "个，触达组件" + notifyNum + "个"
          y = dy + 50
          type = "three"
        }
        group.addShape("text", {
          attrs: {
            text: text,
            x: -100,
            y: y,
            lineHeight: 20,
            fill: "#121a32"
          },
          className: `node-${type}`
        })
      },

      // 绘制底部按钮
      drawBottom(cfg, group, attrs) {
        const { preRect, width, height } = attrs
        // 新增
        group.addShape("image", {
          attrs: {
            width: 40,
            height: 40,
            x: -20,
            y: height / 2 - 20,
            cursor: "pointer",
            opacity: 0,
            img: require("../../assets/add.png")
          },
          action: "add",
          className: "node-add",
          name: "hover"
        })

        // 粘贴
        group.addShape("image", {
          attrs: {
            width: 40,
            height: 40,
            x: -20,
            y: height / 2 - 20,
            cursor: "pointer",
            img: require("../../assets/paste.png")
          },
          visible: false,
          action: "paste",
          className: "node-paste"
        })
      },

      // 绘制左侧按钮
      drawLeft(cfg, group, attrs) {
        const { preRect, width, height } = attrs
        if (cfg.rootFlag == 1) return
        // 详情
        group.addShape("image", {
          attrs: {
            width: 32,
            height: 25,
            x: 135,
            y: -140,
            opacity: 0,
            cursor: "pointer",
            img: require("../../assets/detail.png")
          },
          action: "detail",
          className: "node-image",
          name: "hover"
        })

        // 复制
        group.addShape("image", {
          attrs: {
            width: 32,
            height: 25,
            x: 135,
            y: -110,
            opacity: 0,
            cursor: "pointer",
            img: require("../../assets/copy.png")
          },
          action: "copy",
          className: "node-image",
          name: "hover"
        })

        // 删除
        group.addShape("image", {
          attrs: {
            width: 32,
            height: 25,
            x: 135,
            y: -80,
            opacity: 0,
            cursor: "pointer",
            img: require("../../assets/delete.png")
          },
          action: "delete",
          className: "node-image",
          name: "hover"
        })
      },

      /* 绘制节点，包含文本 */
      drawShape(cfg, group) {
        // 元素分组
        // 合并外部样式和默认样式
        const attrs = this.getShapeStyle(cfg, group)
        // 添加节点
        const shape = group.addShape(this.shapeType, {
          // shape 属性在定义时返回
          className: `${this.shapeType}-shape`,
          xShapeNode: true, // 自定义节点标识
          draggable: true,
          attrs
        })

        // 给 group 添加自定义方法 按className查找元素
        group.$getItem = className => {
          return group.get("children").find(item => item.get("className") === className)
        }

        // 添加锚点
        this.initAnchor(cfg, group)
        this.drawTitle(cfg, group, attrs)
        this.drawCenter(cfg, group, attrs)
        this.drawBottom(cfg, group, attrs)
        this.drawLeft(cfg, group, attrs)

        return shape
      },

      /* 更新节点，包含文本 */
      update(cfg, node) {
        const model = node.get("model")
        const group = node.get("group")
        const title = group.$getItem("node-title")
        const source = group.$getItem("node-source")
        const sourceName = group.$getItem("node-source-name")
        const textOne = group.$getItem("node-one")
        const textTwo = group.$getItem("node-two")
        const textThree = group.$getItem("node-three")
        const paste = group.$getItem("node-paste")
        const data = { ...model.data }

        // 更新标题
        title &&
          title.attr({
            text: cfg.rootFlag == 1 ? "初始客户" : cfg.label
          })
        // 更新来源和客群
        if (cfg.rootFlag == 1) {
          let name = data.customerSource == 0 ? "全量客群" : "指定客群"
          source &&
            source.attr({
              text: "客户来源" + "  " + name,
              x: name == "全量客群" ? -70 : -105
            })
          let txt = data.customerCode
          let index = txt.lastIndexOf("|")
          txt = txt.substring(index + 1, txt.length)
          if (txt.length > 8) {
            txt = txt.substring(0, 8) + "..."
          }
          sourceName &&
            sourceName.attr({
              text: "客群名称" + "  " + txt,
              opacity: data.customerSource == 0 ? 0 : 1
            })
        } else {
          // 更新文本内容
          let one
          let eventTypeName = cfg.data.observationEvent.length ? cfg.data.observationEvent[0].eventTypeName : ""
          if (eventTypeName == "") {
            one = "无"
          } else {
            let observationPeriod = cfg.data.observationPeriod == -1 ? "" : cfg.data.observationPeriod
            let completionTimes = cfg.data.observationEvent.length ? cfg.data.observationEvent[0].completionTimes : ""
            one = "客户在 " + observationPeriod + "天 内完成 " + eventTypeName + completionTimes + "次"
            one = this.fittingStr(one, 230, 14).res
          }
          let flag = this.fittingStr(one, 230, 14).flag
          textOne &&
            textOne.attr({
              text: one,
              y: flag ? -30 : -50
            })
          textTwo &&
            textTwo.attr({
              text: cfg.data.triggerTimeWay == 1 ? "立即触发" : "观察期结束触发"
            })
          let bounsNum = 0
          if (cfg.data.bonusActivityCode) {
            bounsNum = cfg.data.bonusActivityCode == "" ? 0 : cfg.data.bonusActivityCode.split("#").length
          }
          let notifyNum = cfg.data.notifyInfo ? cfg.data.notifyInfo.length : 0
          let push = "权益活动" + bounsNum + "个，触达组件" + notifyNum + "个"
          textThree &&
            textThree.attr({
              text: push
            })
        }

        // 更新粘贴按钮
        paste.cfg.visible = model.isCopy
      },

      // 处理长文本
      fittingStr(str, maxWidth, fontSize) {
        let currentWidth = 0
        let obj
        let res = str
        let flag = false
        const pattern = new RegExp("[\u4E00-\u9FA5]+")
        str.split("").forEach((letter, i) => {
          if (currentWidth > maxWidth) return
          if (pattern.test(letter)) {
            currentWidth += fontSize
          } else {
            currentWidth += G6.Util.getLetterWidth(letter, fontSize)
          }
          if (currentWidth > maxWidth) {
            res = `${str.substr(0, i)}\n${str.substr(i)}`
            flag = true
          }
        })
        obj = {
          res,
          flag
        }
        return obj
      },

      /* 设置节点的状态，主要是交互状态，业务状态请在 draw 方法中实现 */
      setState(name, value, item) {
        const buildInEvents = [
          "anchorShow",
          "anchorActived",
          "nodeState",
          "nodeState:default",
          "nodeState:selected",
          "nodeState:hover",
          "nodeOnDragStart",
          "nodeOnDrag",
          "nodeOnDragEnd"
        ]
        const group = item.getContainer()

        if (group.get("destroyed")) return
        if (buildInEvents.includes(name)) {
          // 内部this绑定到了当前item实例
          itemEvents[name].call(this, value, group)
        } else if (this.stateApplying) {
          this.stateApplying.call(this, name, value, item)
        } else {
          console.warn(
            `warning: ${name} 事件回调未注册!\n可继承该节点并通过 stateApplying 方法进行注册\n如已注册请忽略 (-_-!)`
          )
        }
      },
      /* 获取锚点（相关边的连入点） */
      getAnchorPoints(cfg) {
        return (
          cfg.anchorPoints || [
            [0.5, 0],
            // [1, 0.5],
            [0.5, 1]
            // [0, 0.5],
          ]
        )
      }
    },
    "single-node"
  )
}
