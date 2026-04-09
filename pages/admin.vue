<template>
  <div class="admin-page">

    <header>
      <div class="logo">
        <div class="logo-mark">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1 C7.6 0.8, 11.2 1.1, 12.8 3.8 C14.1 6, 13.9 9.4, 12.2 11.3 C10.3 13.4, 7.4 13.8, 5.2 12.8 C2.4 11.5, 0.8 8.3, 1 5.8 C1.3 2.5, 3.8 1.2, 7 1"
              stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round"/>
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
/* --- Admin Shell --- */
.admin-page {
  min-height: 100dvh;
  background: var(--background);
  padding: 0 var(--size-6);
  max-width: var(--content-width);
  margin: 0 auto;
}

/* --- Header --- */
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--size-4) 0;
  border-bottom: 1px solid var(--border-color);
}

.logo { display: flex; align-items: center; gap: var(--size-2); }

.logo-mark {
  width: 28px; height: 28px;
  border: 1px solid var(--border-color-highlight);
  border-radius: var(--size-1);
  display: flex; align-items: center; justify-content: center;
}

.logo-name {
  font-family: var(--ui-font-family);
  font-size: var(--ui-font-size);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-md);
  text-transform: var(--ui-text-transform);
}

.header-tag {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-lg);
  text-transform: var(--ui-text-transform);
  color: var(--gray-z-5);
}

/* --- Auth Gate --- */
.auth-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--size-4);
  padding: var(--size-10) 0 0;
}

.gate-label {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--muted);
  letter-spacing: var(--letter-spacing-md);
  text-transform: var(--ui-text-transform);
}

.auth-error {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--error);
  letter-spacing: var(--letter-spacing);
}

/* --- Auth Input --- */
.pill-search {
  display: flex;
  align-items: center;
  gap: var(--size-2);
  width: 100%;
  max-width: var(--form-width);
  padding: var(--size-3) var(--size-3) var(--size-3) var(--size-4);
  border: 1px solid var(--border-color);
  border-radius: var(--size-1);
  cursor: text;
  background: var(--background);
  transition: border-color 0.2s ease;
}

.pill-search:focus-within { border-color: var(--border-color-highlight); }

.pill-search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--font-sm);
  color: var(--color);
  caret-color: var(--color);
  min-height: 44px;
}

.pill-search input::placeholder { color: var(--gray-z-5); }

.pill-arrow {
  width: 36px; height: 36px;
  border-radius: var(--size-1);
  border: 1px solid var(--border-color-highlight);
  background: transparent;
  color: var(--color);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.pill-arrow:hover { background: var(--gray-z-1); }

/* --- Admin Body --- */
.admin-body { padding: var(--size-7) 0; }

.section-label {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-lg);
  text-transform: var(--ui-text-transform);
  color: var(--gray-z-4);
  margin-bottom: var(--size-5);
}

.loading {
  font-family: var(--ui-font-family);
  font-size: var(--font-sm);
  color: var(--gray-z-4);
  letter-spacing: var(--letter-spacing);
}

/* --- Prompt Cards --- */
.prompt-list { display: flex; flex-direction: column; }

.prompt-card {
  padding: var(--size-4) 0;
  border-bottom: 1px solid var(--border-color);
}

.prompt-card:last-child { border-bottom: none; }

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--size-4);
  margin-bottom: var(--size-3);
}

.card-info {
  display: flex;
  align-items: flex-start;
  gap: var(--size-2);
  flex: 1;
  min-width: 0;
}

.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.status-dot.queued   { background: var(--gray-z-4); }
.status-dot.progress { background: var(--gray-z-7); }
.status-dot.done     { background: var(--color); }

.card-text {
  font-size: var(--font-base);
  color: var(--gray-z-8);
  line-height: var(--line-height-md);
}

.card-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--size-2);
  flex-shrink: 0;
}

.card-date {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--gray-z-4);
}

.status-select {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: var(--size-1);
  color: var(--gray-z-7);
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  letter-spacing: var(--letter-spacing);
  padding: var(--size-1) var(--size-3);
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;
}

.status-select:hover,
.status-select:focus { border-color: var(--border-color-highlight); }
.status-select option { background: var(--gray-z-1); color: var(--color); }

/* --- Upload Area --- */
.card-upload {
  display: flex;
  align-items: center;
  gap: var(--size-2);
  flex-wrap: wrap;
}

.existing-drawing {
  width: 48px; height: 48px;
  border-radius: var(--size-1);
  object-fit: cover;
  border: 1px solid var(--border-color);
}

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: var(--size-2);
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--gray-z-5);
  letter-spacing: var(--letter-spacing);
  border: 1px solid var(--border-color);
  border-radius: var(--size-1);
  padding: var(--size-2) var(--size-3);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.upload-label:hover,
.upload-label.has-file {
  border-color: var(--border-color-highlight);
  color: var(--gray-z-8);
}

.file-input { display: none; }

.upload-btn {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--color);
  letter-spacing: var(--letter-spacing);
  background: transparent;
  border: 1px solid var(--border-color-highlight);
  border-radius: var(--size-1);
  padding: var(--size-2) var(--size-3);
  cursor: pointer;
  transition: background 0.2s ease;
}

.upload-btn:hover { background: var(--gray-z-1); }
.upload-btn.loading { opacity: 0.5; cursor: default; }

.card-feedback {
  margin-top: var(--size-2);
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--muted);
  letter-spacing: var(--letter-spacing);
}
</style>
