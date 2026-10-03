import { reactive } from 'vue'

export const toasts = reactive([])
let seq = 0

/** 轻量提示条：toast('已保存') / toast('出错了', 'error') */
export function toast(message, type = 'info', duration = 2600) {
  const id = ++seq
  toasts.push({ id, message, type })
  setTimeout(() => {
    const index = toasts.findIndex((item) => item.id === id)
    if (index !== -1) toasts.splice(index, 1)
  }, duration)
}
