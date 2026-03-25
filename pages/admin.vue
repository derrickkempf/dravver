<template>
  <div class="admin-page">

    <header>
      <div class="logo">
        <div class="logo-mark">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1 C7.6 0.8, 11.2 1.1, 12.8 3.8 C14.1 6, 13.9 9.4, 12.2 11.3 C10.3 13.4, 7.4 13.8, 5.2 12.8 C2.4 11.5, 0.8 8.3, 1 5.8 C1.3 2.5, 3.8 1.2, 7 1"
              stroke="rgba(255,255,255,0.6)" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="logo-name">Dravver</span>
      </div>
      <span class="header-tag">admin</span>
    </header>

    <!-- AUTH GATE -->
    <div v-if="!authed" class="auth-gate">
      <p class="gate-label">enter secret to continue</p>
      <label class="pill-search">
        <input v-model="secretInput" type="password" placeholder="secret..." autocomplete="off" @keydown.enter="unlock" />
        <button class="pill-arrow" @click="unlock">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="8" x2="13" y2="8"/><polyline points="9,4 13,8 9,12"/>
          </svg>
        </button>
      </label>
      <p v-if="authError" class="auth-error">{{ authError }}</p>
    </div>

    <!-- ADMIN PANEL -->
    <div v-else class="admin-body">
      <p class="section-label">Queue</p>
      <div v-if="loading" class="loading">loading...</div>
      <div v-else class="prompt-list">
        <div v-for="item in prompts" :key="item.id" class="prompt-card">
          <div class="card-top">
            <div class="card-info">
              <span class="status-dot" :class="item.status"></span>
              <span class="card-text">{{ item.text }}</span>
            </div>
            <div class="card-meta">
              <span class="card-date">{{ item.date }}</span>
              <select class="status-select" :value="item.status" @change="updateStatus(item.id, ($event.target as HTMLSelectElement).value)">
                <option value="queued">Queued</option>
                <option value="progress">In progress</option>
                <option value="done">Delivered</option>
              </select>
            </div>
          </div>
          <div class="card-upload">
            <img v-if="item.drawing" :src="item.drawing" class="existing-drawing" :alt="item.text" />
            <label class="upload-label" :class="{ 'has-file': uploadFiles[item.id] }">
              <input type="file" accept="image/*" class="file-input" @change="onFileSelect(item.id, $event)" />
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <line x1="8" y1="2" x2="8" y2="11"/><polyline points="4,6 8,2 12,6"/>
                <line x1="2" y1="14" x2="14" y2="14"/>
              </svg>
              <span>{{ uploadFiles[item.id] ? uploadFiles[item.id]!.name : (item.drawing ? 'replace' : 'upload drawing') }}</span>
            </label>
            <button v-if="uploadFiles[item.id]" class="upload-btn" :class="{ loading: uploading[item.id] }" @click="uploadDrawing(item.id)">
              {{ uploading[item.id] ? 'uploading...' : 'save ↵' }}
            </button>
          </div>
          <p v-if="feedback[item.id]" class="card-feedback">{{ feedback[item.id] }}</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
interface Prompt {
  id: string; text: string; date: string; status: string; drawing: string | null
}

const secretInput = ref('')
const authed = ref(false)
const authError = ref('')
const adminSecret = ref('')
const prompts = ref<Prompt[]>([])
const loading = ref(false)
const uploadFiles = ref<Record<string, File | null>>({})
const uploading = ref<Record<string, boolean>>({})
const feedback = ref<Record<string, string>>({})

async function unlock() {
  try {
    await $fetch('/api/admin/upload', {
      method: 'PATCH',
      headers: { 'x-admin-secret': secretInput.value },
      body: { id: '__test__', status: 'queued' },
    })
  } catch (e: unknown) {
    const err = e as { statusCode?: number }
    if (err?.statusCode === 401) { authError.value = 'wrong secret.'; return }
    // 404 = auth passed, prompt not found — that's fine
  }
  adminSecret.value = secretInput.value
  authed.value = true
  authError.value = ''
  loadPrompts()
}

async function loadPrompts() {
  loading.value = true
  prompts.value = await $fetch<Prompt[]>('/api/prompts')
  loading.value = false
}

async function updateStatus(id: string, status: string) {
  await $fetch('/api/admin/upload', {
    method: 'PATCH',
    headers: { 'x-admin-secret': adminSecret.value },
    body: { id, status },
  })
  await loadPrompts()
}

function onFileSelect(id: string, event: Event) {
  uploadFiles.value[id] = (event.target as HTMLInputElement).files?.[0] || null
}

async function uploadDrawing(id: string) {
  const file = uploadFiles.value[id]
  if (!file) return
  uploading.value[id] = true
  feedback.value[id] = ''
  try {
    const base64 = await toBase64(file)
    await $fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'x-admin-secret': adminSecret.value },
      body: { id, imageBase64: base64, mimeType: file.type },
    })
    feedback.value[id] = 'saved.'
    uploadFiles.value[id] = null
    await loadPrompts()
  } catch {
    feedback.value[id] = 'upload failed. try again.'
  } finally {
    uploading.value[id] = false
  }
}

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res((r.result as string).split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}
</script>

<style scoped>
.admin-page { min-height: 100dvh; background: #000; padding: 0 24px; max-width: 700px; margin: 0 auto; }

header { display: flex; align-items: center; justify-content: space-between; padding: 18px 0 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }

.logo { display: flex; align-items: center; gap: 8px; }
.logo-mark { width: 28px; height: 28px; border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.logo-name { font-size: 0.78rem; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
.header-tag { font-size: 0.6rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.12); padding: 3px 8px; border-radius: 999px; }

.auth-gate { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 0 0; }
.gate-label { font-size: 0.7rem; color: rgba(255,255,255,0.3); letter-spacing: 0.06em; }
.auth-error { font-size: 0.68rem; color: rgba(255,255,255,0.35); letter-spacing: 0.04em; }

.pill-search { display: flex; align-items: center; gap: 10px; width: 100%; max-width: 360px; padding: 11px 10px 11px 18px; border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; cursor: text; background: #000; transition: border-color 0.15s; }
.pill-search:focus-within { border-color: rgba(255,255,255,0.45); }
.pill-search input { flex: 1; background: transparent; border: none; outline: none; font-family: inherit; font-size: 0.85rem; color: #fff; caret-color: #fff; }
.pill-search input::placeholder { color: rgba(255,255,255,0.25); }
.pill-arrow { width: 30px; height: 30px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.35); background: transparent; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; }
.pill-arrow:hover { background: rgba(255,255,255,0.08); }

.admin-body { padding: 32px 0; }
.section-label { font-size: 0.6rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.22); margin-bottom: 20px; }
.loading { font-size: 0.72rem; color: rgba(255,255,255,0.2); letter-spacing: 0.04em; }

.prompt-list { display: flex; flex-direction: column; }
.prompt-card { padding: 18px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.prompt-card:last-child { border-bottom: none; }

.card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.card-info { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.status-dot.queued   { background: rgba(255,255,255,0.2); }
.status-dot.progress { background: rgba(255,255,255,0.6); }
.status-dot.done     { background: #fff; }
.card-text { font-size: 0.88rem; color: rgba(255,255,255,0.85); line-height: 1.45; }
.card-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.card-date { font-size: 0.62rem; color: rgba(255,255,255,0.2); }
.status-select { background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; color: rgba(255,255,255,0.55); font-family: inherit; font-size: 0.65rem; letter-spacing: 0.04em; padding: 3px 10px; cursor: pointer; outline: none; }
.status-select option { background: #111; color: #fff; }

.card-upload { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.existing-drawing { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
.upload-label { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; color: rgba(255,255,255,0.35); letter-spacing: 0.04em; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 6px 14px; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
.upload-label:hover, .upload-label.has-file { border-color: rgba(255,255,255,0.35); color: rgba(255,255,255,0.7); }
.file-input { display: none; }
.upload-btn { font-family: inherit; font-size: 0.72rem; color: #fff; letter-spacing: 0.04em; background: transparent; border: 1px solid rgba(255,255,255,0.3); border-radius: 999px; padding: 6px 14px; cursor: pointer; transition: all 0.15s; }
.upload-btn:hover { background: rgba(255,255,255,0.06); }
.upload-btn.loading { opacity: 0.5; cursor: default; }
.card-feedback { margin-top: 8px; font-size: 0.65rem; color: rgba(255,255,255,0.3); letter-spacing: 0.04em; }
</style>
