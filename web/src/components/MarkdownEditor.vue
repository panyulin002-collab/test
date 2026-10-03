<script setup>
import { computed, nextTick, ref } from 'vue'
import { api } from '../api'
import { renderMarkdown } from '../utils/markdown'
import { toast } from '../composables/toast'
import VideoDialog from './VideoDialog.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: {
    type: String,
    default: '在这里写作……支持 Markdown：图片可以直接拖进来或粘贴，视频点工具栏的按钮。'
  },
  videoMB: { type: Number, default: 300 }
})
const emit = defineEmits(['update:modelValue', 'save'])

const textarea = ref(null)
const imageInput = ref(null)
const videoOpen = ref(false)
const mode = ref('split')
const progress = ref(0)
const uploading = ref(false)
const dragging = ref(false)

const previewHtml = computed(() => renderMarkdown(props.modelValue))
const stats = computed(() => {
  const text = props.modelValue || ''
  return { chars: text.length, lines: text ? text.split('\n').length : 0 }
})

/** 在光标处做替换，替换后把选区恢复回去 */
function apply(transform) {
  const el = textarea.value
  const value = props.modelValue || ''
  const start = el ? el.selectionStart : value.length
  const end = el ? el.selectionEnd : value.length
  const result = transform(value, start, end)
  emit('update:modelValue', result.text)
  nextTick(() => {
    const target = textarea.value
    if (!target) return
    target.focus()
    if (result.start != null) target.setSelectionRange(result.start, result.end ?? result.start)
  })
}

function wrap(before, after = before, placeholder = '') {
  apply((value, start, end) => {
    const selected = value.slice(start, end) || placeholder
    const text = value.slice(0, start) + before + selected + after + value.slice(end)
    return { text, start: start + before.length, end: start + before.length + selected.length }
  })
}

function prefixLines(prefix) {
  apply((value, start, end) => {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const found = value.indexOf('\n', end)
    const lineEnd = end === start ? (found === -1 ? value.length : found) : end
    const block = value.slice(lineStart, lineEnd)
    const lines = block.split('\n')
    const allPrefixed = lines.every((line) => line.startsWith(prefix))
    const next = lines.map((line) => (allPrefixed ? line.slice(prefix.length) : prefix + line)).join('\n')
    return { text: value.slice(0, lineStart) + next + value.slice(lineEnd), start: lineStart, end: lineStart + next.length }
  })
}

function insertBlock(text) {
  apply((value, start, end) => {
    const needsLeadingBreak = start > 0 && value[start - 1] !== '\n'
    const block = `${needsLeadingBreak ? '\n' : ''}${text}\n`
    return {
      text: value.slice(0, start) + block + value.slice(end),
      start: start + block.length,
      end: start + block.length
    }
  })
}

function insertText(text) {
  apply((value, start, end) => ({
    text: value.slice(0, start) + text + value.slice(end),
    start: start + text.length,
    end: start + text.length
  }))
}

function insertLink() {
  apply((value, start, end) => {
    const selected = value.slice(start, end) || '链接文字'
    const snippet = `[${selected}](https://)`
    const text = value.slice(0, start) + snippet + value.slice(end)
    const urlStart = start + selected.length + 3
    return { text, start: urlStart, end: urlStart + 8 }
  })
}

function insertCodeBlock() {
  apply((value, start, end) => {
    const selected = value.slice(start, end) || '在这里写代码'
    const needsLeadingBreak = start > 0 && value[start - 1] !== '\n'
    const snippet = `${needsLeadingBreak ? '\n' : ''}\`\`\`js\n${selected}\n\`\`\`\n`
    return {
      text: value.slice(0, start) + snippet + value.slice(end),
      start: start + snippet.length,
      end: start + snippet.length
    }
  })
}

function insertTable() {
  insertBlock('| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |')
}

const imageTag = (name, url) => `![${name.replace(/[[\]]/g, '')}](${url})`
const videoTag = (url) => `<video src="${url}" controls preload="metadata"></video>`

/** 上传一批文件，按类型插入 Markdown / HTML */
async function uploadFiles(files) {
  const list = Array.from(files || [])
  if (!list.length) return

  uploading.value = true
  try {
    for (const file of list) {
      progress.value = 0
      const data = await api.upload(file, (value) => (progress.value = value))
      if (data.kind === 'image') insertBlock(imageTag(file.name, data.url))
      else insertBlock(videoTag(data.url))
      toast(`已上传 ${file.name}`)
    }
  } catch (error) {
    toast(error.message, 'error', 4200)
  } finally {
    uploading.value = false
    progress.value = 0
  }
}

function onPickImages(event) {
  uploadFiles(event.target.files)
  event.target.value = ''
}

function onDrop(event) {
  dragging.value = false
  const files = event.dataTransfer?.files
  if (files?.length) uploadFiles(files)
}

function onPaste(event) {
  const items = Array.from(event.clipboardData?.items || [])
  const files = items
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter(Boolean)
  if (files.length) {
    event.preventDefault()
    uploadFiles(files)
  }
}

/** 回车时自动接上列表符号，空行上的列表符号则退出列表 */
function onEnter(event) {
  const el = textarea.value
  if (!el) return
  const value = props.modelValue || ''
  const cursor = el.selectionStart
  if (el.selectionStart !== el.selectionEnd) return

  const lineStart = value.lastIndexOf('\n', cursor - 1) + 1
  const line = value.slice(lineStart, cursor)
  const matched = /^(\s*)(?:([-*+])|(\d+)\.)\s+(.*)$/.exec(line)
  if (!matched) return

  const [, indent, bullet, number, content] = matched
  if (!content.trim()) {
    event.preventDefault()
    const text = value.slice(0, lineStart) + '\n' + value.slice(cursor)
    emit('update:modelValue', text)
    nextTick(() => {
      textarea.value?.focus()
      textarea.value?.setSelectionRange(lineStart + 1, lineStart + 1)
    })
    return
  }

  event.preventDefault()
  const nextPrefix = `${indent}${number ? `${Number(number) + 1}.` : bullet} `
  const text = value.slice(0, cursor) + '\n' + nextPrefix + value.slice(el.selectionEnd)
  emit('update:modelValue', text)
  nextTick(() => {
    const position = cursor + 1 + nextPrefix.length
    textarea.value?.focus()
    textarea.value?.setSelectionRange(position, position)
  })
}

function onKeydown(event) {
  const meta = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()

  if (meta && key === 'b') {
    event.preventDefault()
    wrap('**', '**', '加粗文字')
  } else if (meta && key === 'i') {
    event.preventDefault()
    wrap('*', '*', '斜体文字')
  } else if (meta && key === 'k') {
    event.preventDefault()
    insertLink()
  } else if (meta && key === 's') {
    event.preventDefault()
    emit('save')
  } else if (event.key === 'Tab') {
    event.preventDefault()
    insertText('  ')
  } else if (event.key === 'Enter' && !event.shiftKey) {
    onEnter(event)
  }
}

/** 预览区里代码块的「复制」按钮 */
async function onPreviewClick(event) {
  const button = event.target.closest('[data-copy]')
  if (!button) return
  const code = button.parentElement?.querySelector('code')?.textContent || ''
  try {
    await navigator.clipboard.writeText(code)
    button.textContent = '已复制'
    setTimeout(() => (button.textContent = '复制'), 1600)
  } catch {
    toast('浏览器不允许复制，请手动选择', 'error')
  }
}

const tools = [
  { title: '二级标题', label: 'H2', run: () => prefixLines('## ') },
  { title: '三级标题', label: 'H3', run: () => prefixLines('### ') },
  { sep: true },
  {
    title: '加粗 Ctrl+B',
    svg: '<path d="M7 5h5.2a3.4 3.4 0 0 1 0 6.8H7z"/><path d="M7 11.8h6a3.6 3.6 0 0 1 0 7.2H7z"/>',
    run: () => wrap('**', '**', '加粗文字')
  },
  {
    title: '斜体 Ctrl+I',
    svg: '<path d="M11 5h7M6 19h7M14 5l-4 14"/>',
    run: () => wrap('*', '*', '斜体文字')
  },
  {
    title: '删除线',
    svg: '<path d="M4 12h16"/><path d="M8 8a4 4 0 0 1 8 0"/><path d="M16 16a4 4 0 0 1-8 0"/>',
    run: () => wrap('~~', '~~', '删除的文字')
  },
  { sep: true },
  {
    title: '无序列表',
    svg: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.5"/><circle cx="4.5" cy="12" r="1.5"/><circle cx="4.5" cy="18" r="1.5"/>',
    run: () => prefixLines('- ')
  },
  {
    title: '有序列表',
    svg: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 4h2v4M4 10h3l-3 4h3M4 16h3v4H4"/>',
    run: () => prefixLines('1. ')
  },
  {
    title: '引用',
    svg: '<path d="M6 6h4v5H6zM14 6h4v5h-4z"/><path d="M6 11c0 4 1.5 5.5 4 6.5M14 11c0 4 1.5 5.5 4 6.5"/>',
    run: () => prefixLines('> ')
  },
  { sep: true },
  {
    title: '插入链接 Ctrl+K',
    svg: '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1-1"/>',
    run: insertLink
  },
  {
    title: '插入图片（也可以直接拖进来或粘贴）',
    svg: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.6 3.2 3 3-2.2L20 17"/>',
    run: () => imageInput.value?.click()
  },
  {
    title: '插入视频',
    svg: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m11 9.2 4.6 2.8-4.6 2.8z"/>',
    run: () => (videoOpen.value = true)
  },
  {
    title: '行内代码',
    svg: '<path d="m9 8.5-4.5 3.5L9 15.5M15 8.5 19.5 12 15 15.5"/>',
    run: () => wrap('`', '`', 'code')
  },
  {
    title: '代码块',
    svg: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3"/><path d="M14 5.5 10 18.5"/>',
    run: insertCodeBlock
  },
  {
    title: '表格',
    svg: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M3 14.5h18M9 5v14M15 5v14"/>',
    run: insertTable
  },
  {
    title: '分隔线',
    svg: '<path d="M4 12h16"/><path d="M7 7h10M7 17h10" opacity=".45"/>',
    run: () => insertBlock('---')
  }
]
</script>

<template>
  <div class="editor-shell">
    <div class="editor-toolbar">
      <template v-for="(tool, index) in tools" :key="index">
        <span v-if="tool.sep" class="tool-sep"></span>
        <button
          v-else
          class="tool-btn"
          type="button"
          :title="tool.title"
          :disabled="uploading"
          @click="tool.run"
        >
          <span v-if="tool.label" style="font-size: 12px; font-weight: 700">{{ tool.label }}</span>
          <svg
            v-else
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            v-html="tool.svg"
          ></svg>
        </button>
      </template>

      <span class="tool-sep"></span>
      <div class="tabs" style="padding: 2px; margin-left: auto">
        <button class="tab" :class="{ active: mode === 'edit' }" type="button" @click="mode = 'edit'">
          编辑
        </button>
        <button class="tab" :class="{ active: mode === 'split' }" type="button" @click="mode = 'split'">
          并排
        </button>
        <button class="tab" :class="{ active: mode === 'preview' }" type="button" @click="mode = 'preview'">
          预览
        </button>
      </div>
    </div>

    <div v-if="uploading" class="uploading-bar"><span :style="{ width: progress + '%' }"></span></div>

    <div class="editor-body" :class="{ split: mode === 'split' }">
      <textarea
        v-show="mode !== 'preview'"
        ref="textarea"
        class="editor-input"
        :value="modelValue"
        :placeholder="placeholder"
        :class="{ 'is-dragging': dragging }"
        spellcheck="false"
        @input="emit('update:modelValue', $event.target.value)"
        @keydown="onKeydown"
        @paste="onPaste"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      ></textarea>

      <div v-show="mode !== 'edit'" class="editor-preview markdown-body" @click="onPreviewClick">
        <div v-if="!modelValue" class="empty">左边写点东西，这里会实时预览</div>
        <div v-else v-html="previewHtml"></div>
      </div>
    </div>

    <div class="editor-foot">
      <span>{{ stats.chars }} 字 · {{ stats.lines }} 行</span>
      <span v-if="uploading">正在上传 {{ progress }}%…</span>
      <div class="spacer"></div>
      <span>Ctrl+B 加粗 · Ctrl+I 斜体 · Ctrl+K 链接 · Ctrl+S 保存</span>
    </div>

    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="onPickImages"
    />

    <VideoDialog
      v-if="videoOpen"
      :video-mb="videoMB"
      @close="videoOpen = false"
      @insert="
        (html) => {
          insertBlock(html)
          videoOpen = false
        }
      "
    />
  </div>
</template>
