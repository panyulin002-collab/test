<script setup>
import { computed, ref } from 'vue'
import { api } from '../api'
import { toast } from '../composables/toast'
import { fileSize } from '../utils/format'

const props = defineProps({
  videoMB: { type: Number, default: 300 }
})
const emit = defineEmits(['insert', 'close'])

const tab = ref('link')
const url = ref('')
const file = ref(null)
const progress = ref(0)
const busy = ref(false)

/** 把常见的视频链接转成可嵌入的播放器地址 */
function parseEmbed(raw) {
  const value = String(raw || '').trim()
  if (!value) return null

  const bv = /(BV[0-9A-Za-z]{8,14})/.exec(value)
  if (bv) {
    return {
      type: 'iframe',
      src: `//player.bilibili.com/player.html?bvid=${bv[1]}&autoplay=0&high_quality=1&danmaku=0`,
      label: 'B 站视频'
    }
  }

  const av = /\bav(\d{4,})/i.exec(value)
  if (av) {
    return {
      type: 'iframe',
      src: `//player.bilibili.com/player.html?aid=${av[1]}&autoplay=0&high_quality=1&danmaku=0`,
      label: 'B 站视频'
    }
  }

  if (/youtube\.com|youtu\.be/.test(value)) {
    const id = /(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/.exec(value)
    if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id[1]}`, label: 'YouTube 视频' }
  }

  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(value)
  if (vimeo) {
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}`, label: 'Vimeo 视频' }
  }

  if (/^https?:\/\/[^\s]+\.(mp4|webm|ogv|mov|m4v)(\?[^\s]*)?$/i.test(value)) {
    return { type: 'video', src: value, label: '视频直链' }
  }

  return null
}

const parsed = computed(() => parseEmbed(url.value))

const iframeTag = (src) =>
  `<iframe src="${src}" frameborder="0" allowfullscreen="true" scrolling="no"></iframe>`
const videoTag = (src) => `<video src="${src}" controls preload="metadata"></video>`

function insertFromLink() {
  const result = parsed.value
  if (!result) {
    toast('没能识别这个链接，可以试试 B 站、YouTube 链接或 .mp4 直链', 'error', 4200)
    return
  }
  emit('insert', result.type === 'iframe' ? iframeTag(result.src) : videoTag(result.src))
}

function onPick(event) {
  const picked = event.target.files?.[0]
  if (!picked) return
  if (picked.size > props.videoMB * 1024 * 1024) {
    toast(`视频不能超过 ${props.videoMB} MB`, 'error')
    return
  }
  file.value = picked
}

async function uploadVideo() {
  if (!file.value) {
    toast('先选择一个视频文件', 'error')
    return
  }
  busy.value = true
  progress.value = 0
  try {
    const data = await api.upload(file.value, (value) => (progress.value = value))
    emit('insert', videoTag(data.url))
  } catch (error) {
    toast(error.message, 'error', 4200)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="row">
        <h3 class="modal-title">插入视频</h3>
        <div class="spacer"></div>
        <button class="icon-btn" type="button" title="关闭" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div class="tabs">
          <button class="tab" :class="{ active: tab === 'link' }" type="button" @click="tab = 'link'">
            视频链接
          </button>
          <button class="tab" :class="{ active: tab === 'upload' }" type="button" @click="tab = 'upload'">
            上传视频
          </button>
        </div>

        <template v-if="tab === 'link'">
          <div class="field">
            <label class="field-label">粘贴视频地址</label>
            <input v-model="url" class="input" placeholder="B 站视频链接 / BV 号 / YouTube 链接 / .mp4 直链" />
            <p class="hint">支持 B 站、YouTube、Vimeo，以及以 .mp4 / .webm / .mov 结尾的直链。</p>
          </div>

          <div v-if="parsed" class="stack" style="gap: 8px">
            <div class="row small">
              <span class="badge">{{ parsed.label }}</span>
              <span class="faint">已识别，下面可以先预览</span>
            </div>
            <iframe
              v-if="parsed.type === 'iframe'"
              :src="parsed.src"
              style="width: 100%; aspect-ratio: 16/9; border: 0; border-radius: 10px"
              allowfullscreen
            ></iframe>
            <video
              v-else
              :src="parsed.src"
              controls
              style="width: 100%; border-radius: 10px"
            ></video>
          </div>
          <div v-else-if="url" class="alert">没识别出视频来源，检查一下链接是否完整。</div>
        </template>

        <template v-else>
          <div class="field">
            <label class="field-label">选择视频文件（最大 {{ videoMB }} MB）</label>
            <input class="input" type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" @change="onPick" />
            <p v-if="file" class="hint">{{ file.name }} · {{ fileSize(file.size) }}</p>
          </div>
          <div v-if="busy" class="stack" style="gap: 6px">
            <div class="uploading-bar"><span :style="{ width: progress + '%' }"></span></div>
            <div class="hint">上传中 {{ progress }}%</div>
          </div>
        </template>
      </div>

      <div class="row">
        <div class="spacer"></div>
        <button class="btn" type="button" @click="emit('close')">取消</button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="busy || (tab === 'link' ? !parsed : !file)"
          @click="tab === 'link' ? insertFromLink() : uploadVideo()"
        >
          {{ tab === 'link' ? '插入视频' : '上传并插入' }}
        </button>
      </div>
    </div>
  </div>
</template>
