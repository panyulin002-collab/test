<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { state } from '../store'
import MarkdownEditor from '../components/MarkdownEditor.vue'
import { toast } from '../composables/toast'
import { fileSize } from '../utils/format'

const route = useRoute()
const router = useRouter()

const postId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => Boolean(postId.value))

const form = reactive({
  title: '',
  slug: '',
  summary: '',
  tags: '',
  cover: '',
  content: '',
  status: 'draft'
})

const loading = ref(false)
const saving = ref(false)
const dirty = ref(false)
const settingsOpen = ref(false)
const backup = ref(null)
const coverInput = ref(null)
const coverUploading = ref(false)
const coverProgress = ref(0)

const backupKey = computed(() => `blog-draft:${postId.value || 'new'}`)
const tagsList = computed(() =>
  form.tags
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6)
)
const publicUrl = computed(() => `/u/${state.user?.username || 'me'}/${form.slug || '自动生成'}`)
const charCount = computed(() => form.content.length)

/** 载入已有文章或恢复备份时，watcher 触发的变化不算用户的改动 */
let restoring = false

function markDirty() {
  if (restoring) return
  dirty.value = true
}

watch(form, markDirty, { deep: true })

function fill(post) {
  restoring = true
  form.title = post.title
  form.slug = post.slug
  form.summary = post.summary
  form.tags = (post.tags || []).join(', ')
  form.cover = post.cover || ''
  form.content = post.content
  form.status = post.status
  nextTick(() => {
    restoring = false
    dirty.value = false
  })
}

async function load() {
  if (!isEdit.value) {
    // 新建文章时看看有没有上次没保存完的本地备份
    try {
      const saved = JSON.parse(localStorage.getItem(backupKey.value) || 'null')
      if (saved && (saved.form.title || saved.form.content)) backup.value = saved
    } catch {
      /* 备份坏了就当没有 */
    }
    nextTick(() => (dirty.value = false))
    return
  }

  loading.value = true
  try {
    const data = await api.get(`/api/me/posts/${postId.value}`)
    fill(data.post)
  } catch (error) {
    toast(error.message, 'error')
    router.replace('/me')
  } finally {
    loading.value = false
  }
}

function restoreBackup() {
  if (!backup.value) return
  fill({ ...backup.value.form, status: 'draft' })
  backup.value = null
  dirty.value = true
  toast('已恢复本地备份')
}

function discardBackup() {
  localStorage.removeItem(backupKey.value)
  backup.value = null
}

/** 每 15 秒往浏览器本地存一份，防止误关页面 */
let autosaveTimer = null
onMounted(() => {
  load()
  autosaveTimer = setInterval(() => {
    if (!dirty.value) return
    try {
      localStorage.setItem(
        backupKey.value,
        JSON.stringify({ savedAt: new Date().toISOString(), form: { ...form } })
      )
    } catch {
      /* 本地存储写不进去就跳过 */
    }
  }, 15000)
})

onBeforeUnmount(() => clearInterval(autosaveTimer))

onBeforeRouteLeave(() => {
  if (!dirty.value || saving.value) return true
  return window.confirm('这篇还有没保存的改动，确定离开吗？')
})

async function save(status) {
  if (!form.title.trim()) {
    toast('先给文章起个标题', 'error')
    return
  }

  // 不覆盖已发布文章的标题/slug 时也要保证传给后端的数据完整
  const payload = {
    title: form.title,
    slug: form.slug,
    summary: form.summary,
    tags: tagsList.value,
    cover: form.cover,
    content: form.content,
    status
  }

  saving.value = true
  try {
    const data = isEdit.value
      ? await api.put(`/api/posts/${postId.value}`, payload)
      : await api.post('/api/posts', payload)

    form.slug = data.post.slug
    form.status = data.post.status
    dirty.value = false
    localStorage.removeItem(backupKey.value)
    toast(status === 'published' ? '文章已发布' : '草稿已保存')

    if (!isEdit.value) router.replace(`/write/${data.post.id}`)
    if (status === 'published') router.push(data.post.url)
  } catch (error) {
    toast(error.message, 'error', 4200)
  } finally {
    saving.value = false
  }
}

async function pickCover(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return

  coverUploading.value = true
  try {
    for (const file of files) {
      const data = await api.upload(file, (value) => (coverProgress.value = value))
      form.cover = data.url
      toast(`封面已上传（${fileSize(file.size)}）`)
    }
  } catch (error) {
    toast(error.message, 'error')
  } finally {
    coverUploading.value = false
    coverProgress.value = 0
  }
}

/** 标题变化时顺手生成一个英文 slug（中文标题会走后端兜底） */
watch(
  () => form.title,
  (value) => {
    if (form.slug || isEdit.value) return
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
    if (slug) form.slug = slug
  }
)
</script>

<template>
  <div class="container page">
    <div class="editor-top">
      <router-link class="btn btn-sm btn-ghost" to="/me">← 我的博客</router-link>
      <span class="badge" :class="form.status === 'draft' ? 'badge-draft' : 'badge-published'">
        {{ form.status === 'draft' ? '草稿' : '已发布' }}
      </span>
      <span class="faint small">{{ dirty ? '有未保存的改动' : '已保存' }}</span>
      <div class="spacer"></div>
      <button class="btn btn-sm" type="button" @click="settingsOpen = !settingsOpen">
        {{ settingsOpen ? '收起设置' : '文章设置' }}
      </button>
      <button class="btn btn-sm" type="button" :disabled="saving" @click="save('draft')">
        {{ saving ? '保存中…' : '存草稿' }}
      </button>
      <button class="btn btn-sm btn-primary" type="button" :disabled="saving" @click="save('published')">
        {{ form.status === 'published' ? '更新并发布' : '发布文章' }}
      </button>
    </div>

    <div v-if="backup" class="alert alert-success row row-wrap" style="gap: 12px; margin-bottom: 16px">
      <span style="flex: 1">
        发现本地备份（{{ new Date(backup.savedAt).toLocaleString('zh-CN') }}），要恢复吗？
      </span>
      <button class="btn btn-sm" type="button" @click="restoreBackup">恢复</button>
      <button class="btn btn-sm btn-ghost" type="button" @click="discardBackup">丢弃</button>
    </div>

    <div v-if="settingsOpen" class="card card-pad stack" style="margin-bottom: 16px">
      <div class="grid grid-2" style="gap: 16px">
        <div class="field">
          <label class="field-label">文章链接后缀（可留空，系统自动生成）</label>
          <input v-model="form.slug" class="input" placeholder="hello-world" />
          <p class="hint">发布后的地址：{{ publicUrl }}</p>
        </div>

        <div class="field">
          <label class="field-label">标签（用逗号分隔，最多 6 个）</label>
          <input v-model="form.tags" class="input" placeholder="随笔, 技术, 踩坑" />
          <div v-if="tagsList.length" class="row row-wrap" style="gap: 6px; margin-top: 4px">
            <span v-for="tag in tagsList" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="field-label">摘要（留空会自动截取正文开头）</label>
        <textarea v-model="form.summary" class="textarea" rows="2" maxlength="200"></textarea>
      </div>

      <div class="field">
        <label class="field-label">封面图</label>
        <div class="row" style="gap: 10px">
          <input v-model="form.cover" class="input" placeholder="图片地址，或直接点右边上传" />
          <button class="btn btn-sm" type="button" :disabled="coverUploading" @click="coverInput?.click()">
            {{ coverUploading ? `上传中 ${coverProgress}%` : '上传图片' }}
          </button>
          <button v-if="form.cover" class="btn btn-sm btn-ghost" type="button" @click="form.cover = ''">清除</button>
        </div>
        <img
          v-if="form.cover"
          :src="form.cover"
          alt="封面预览"
          style="margin-top: 10px; max-width: 320px; border-radius: 10px"
        />
        <input ref="coverInput" type="file" accept="image/*" style="display: none" @change="pickCover" />
      </div>
    </div>

    <div v-if="loading" class="skeleton" style="min-height: 400px"></div>
    <template v-else>
      <input
        v-model="form.title"
        class="input input-lg"
        style="margin-bottom: 12px"
        placeholder="文章标题"
        maxlength="120"
      />
      <MarkdownEditor
        v-model="form.content"
        :video-mb="state.site.limits.videoMB"
        @save="save(form.status === 'published' ? 'published' : 'draft')"
      />
      <p class="hint" style="margin-top: 10px">
        正文 {{ charCount }} 字。图片可以直接拖进编辑器或从剪贴板粘贴，视频点工具栏的「插入视频」。
      </p>
    </template>
  </div>
</template>
