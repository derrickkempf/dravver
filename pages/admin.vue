<template>
  <div class="page">

    <!-- NAV -->
    <nav>
      <div class="nav-inner">
        <a href="/" class="nav-logo" aria-label="Home">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1 C7.6 0.8, 11.2 1.1, 12.8 3.8 C14.1 6, 13.9 9.4, 12.2 11.3 C10.3 13.4, 7.4 13.8, 5.2 12.8 C2.4 11.5, 0.8 8.3, 1 5.8 C1.3 2.5, 3.8 1.2, 7 1"
              stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          </svg>
        </a>
        <div class="nav-links">
          <span class="nav-brand">Dravver</span>
          <span class="nav-tag">Admin</span>
        </div>
      </div>
    </nav>

    <main>
      <!-- AUTH GATE -->
      <div v-if="!authed" class="auth-container">
        <h1>Admin</h1>
        <p class="subtitle">Enter secret to continue</p>
        <div class="form-fields">
          <div class="field">
            <label for="secret">Secret</label>
            <input
              id="secret"
              v-model="secretInput"
              type="password"
              placeholder="secret..."
              autocomplete="off"
              @keydown.enter="unlock"
            />
          </div>
          <button class="submit-btn" @click="unlock">Unlock</button>
        </div>
        <p v-if="authError" class="auth-error">{{ authError }}</p>
      </div>

      <!-- ADMIN PANEL -->
      <div v-else class="admin-container">
        <h1>Queue</h1>
        <p class="subtitle">Manage prompts and upload drawings.</p>

        <div v-if="loading" class="loading-state">loading...</div>

        <div v-else class="prompt-list">
          <div v-for="item in prompts" :key="item.id" class="prompt-card">
            <div class="card-top">
              <div class="card-info">
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
              <button v-if="uploadFiles[item.id]" class="save-btn" :class="{ uploading: uploading[item.id] }" @click="uploadDrawing(item.id)">
                {{ uploading[item.id] ? 'uploading...' : 'save' }}
              </button>
            </div>
            <p v-if="feedback[item.id]" class="card-feedback">{{ feedback[item.id] }}</p>
          </div>
        </div>
      </div>
    </main>

    <!-- FOOTER -->
    <footer>
      <div class="footer-inner">
        <a href="/" class="footer-brand">Dravver</a>
        <p class="footer-copy">&copy; {{ new Date().getFullYear() }} Dravver</p>
      </div>
    </footer>

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
/* --- Page Shell --- */
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

/* --- Nav --- */
nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 50;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid var(--color-border);
}

.nav-inner {
  max-width: var(--content-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
}

@media (min-width: 640px) { .nav-inner { padding: 0 24px; } }

.nav-logo {
  color: var(--color-text);
  display: flex;
  align-items: center;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-brand {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text);
}

.nav-tag {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* --- Main --- */
main {
  flex: 1;
  padding-top: 96px;
}

/* --- Auth Container --- */
.auth-container {
  max-width: var(--form-width);
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 640px) { .auth-container { padding: 0 24px; } }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
}

.field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 6px;
}

.field input {
  width: 100%;
  padding: 12px 16px;
  font-size: 0.875rem;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.3s ease;
}

.field input::placeholder { color: var(--color-text-secondary); }
.field input:focus { border-color: var(--color-text); }

.submit-btn {
  align-self: flex-start;
  padding: 12px 24px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-bg);
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background 0.3s ease;
}

.submit-btn:hover { background: var(--color-accent-hover); }

.auth-error {
  margin-top: 16px;
  font-size: 0.875rem;
  color: var(--color-error);
}

/* --- Admin Container --- */
.admin-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 0 16px 64px;
}

@media (min-width: 640px) { .admin-container { padding: 0 24px 64px; } }

.loading-state {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* --- Prompt Cards --- */
.prompt-list {
  display: flex;
  flex-direction: column;
}

.prompt-card {
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}

.prompt-card:last-child { border-bottom: none; }

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-text {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

.card-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.card-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.status-select {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 0.75rem;
  padding: 4px 10px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.3s ease;
}

.status-select:hover,
.status-select:focus { border-color: var(--color-text); }

.status-select option {
  background: var(--color-bg);
  color: var(--color-text);
}

/* --- Upload Area --- */
.card-upload {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.existing-drawing {
  width: 48px; height: 48px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  border: 1px solid var(--color-border);
}

.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px 14px;
  cursor: pointer;
  transition: border-color 0.3s ease, color 0.3s ease;
}

.upload-label:hover,
.upload-label.has-file {
  border-color: var(--color-text);
  color: var(--color-text);
}

.file-input { display: none; }

.save-btn {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-bg);
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-pill);
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.save-btn:hover { background: var(--color-accent-hover); }
.save-btn.uploading { opacity: 0.4; cursor: not-allowed; }

.card-feedback {
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* --- Footer --- */
footer {
  background: #1d1d1f;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.footer-inner {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

@media (min-width: 640px) {
  .footer-inner {
    flex-direction: row;
    justify-content: space-between;
    padding: 32px 24px;
  }
}

.footer-brand {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  text-decoration: none;
}

.footer-copy {
  font-size: 0.75rem;
}
</style>
