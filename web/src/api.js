/** 统一的接口调用封装，出错时抛出带 message 的 Error，页面直接展示 */

async function parse(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

async function request(path, options = {}) {
  const init = {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: {}
  }
  if (options.body !== undefined) {
    init.headers['content-type'] = 'application/json'
    init.body = JSON.stringify(options.body)
  }

  const res = await fetch(path, init)
  const data = await parse(res)
  if (!res.ok) {
    const error = new Error(data?.error || `请求失败（${res.status}）`)
    error.status = res.status
    throw error
  }
  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),

  /**
   * 上传文件。视频可能几百兆，用 XHR 而不是 fetch，
   * 这样才能拿到上传进度，界面上可以显示百分比。
   */
  upload(file, onProgress) {
    return new Promise((resolve, reject) => {
      const form = new FormData()
      form.append('file', file)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/uploads')
      xhr.withCredentials = true
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      })
      xhr.addEventListener('load', () => {
        let data = null
        try {
          data = JSON.parse(xhr.responseText)
        } catch {
          data = { error: '上传失败，请重试' }
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(new Error(data?.error || `上传失败（${xhr.status}）`))
      })
      xhr.addEventListener('error', () => reject(new Error('网络异常，上传失败')))
      xhr.send(form)
    })
  }
}
