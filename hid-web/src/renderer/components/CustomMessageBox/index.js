// customMessageBox.js
import { createVNode, render } from 'vue'
import CustomMessageBoxVue from './CustomMessageBox.vue'

let messageInstance = null

const CustomMessageBox = {
  confirm(message, options = {}) {
    const {
      container = document.body, // 默认挂载到 document.body
      ...props
    } = options

    // 如果 container 是字符串，当作选择器处理
    const targetContainer =
      typeof container === 'string'
        ? document.querySelector(container) || document.body
        : container

    if (!targetContainer || !(targetContainer instanceof HTMLElement)) {
      console.warn(`Invalid container: ${container}. Falling back to document.body.`)
    }

    const finalContainer = targetContainer instanceof HTMLElement ? targetContainer : document.body

    if (messageInstance) {
      finalContainer.removeChild(messageInstance.el)
      messageInstance = null
    }

    return new Promise((resolve, reject) => {
      const div = document.createElement('div')

      const vnode = createVNode(CustomMessageBoxVue, {
        message,
        ...props
      })

      render(vnode, div)
      finalContainer.appendChild(div)

      messageInstance = {
        el: div,
        vm: vnode.component
      }

      messageInstance.vm.exposed.show()
        .then(() => {
          resolve()
          finalContainer.removeChild(div)
          messageInstance = null
        })
        .catch(() => {
          reject()
          finalContainer.removeChild(div)
          messageInstance = null
        })
    })
  }
}

export default {
  install(app) {
    app.config.globalProperties.$messageBox = CustomMessageBox
  }
}

// 导出单独使用的方法
export const messageBox = CustomMessageBox
