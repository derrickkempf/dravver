<template>
  <div class="page">

    <!-- NAV -->
    <nav>
      <div class="nav-inner">
        <a href="/" class="nav-logo" aria-label="Home">
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1 C7.6 0.8, 11.2 1.1, 12.8 3.8 C14.1 6, 13.9 9.4, 12.2 11.3 C10.3 13.4, 7.4 13.8, 5.2 12.8 C2.4 11.5, 0.8 8.3, 1 5.8 C1.3 2.5, 3.8 1.2, 7 1"
              stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>
          </svg>
          <span class="nav-brand">Dravver</span>
          <span class="nav-tag">admin</span>
        </a>
        <div class="nav-right" v-if="authed">
          <span class="nav-counter"><b>{{ prompts.length }}</b><span class="lbl">&nbsp;total</span></span>
        </div>
      </div>
    </nav>

    <main>
      <!-- AUTH GATE -->
      <section v-if="!authed" class="hero">
        <div class="hero-inner narrow">
          <p class="eyebrow">restricted</p>
          <h1>Admin.</h1>
          <p class="subtitle">Enter the secret to manage prompts and upload drawings.</p>

          <div class="form-card">
            <div class="field">
              <label for="secret">Secret</label>
              <input
                id="secret"
                v-model="secretInput"
                type="password"
                placeholder="••••••••"
                autocomplete="off"
                @keydown.enter="unlock"
              />
            </div>
            <button class="btn btn-primary" :disabled="!secretInput || authLoading" @click="unlock">
              <span v-if="!authLoading">Unlock</span>
              <span v-else class="spinner" aria-hidden="true"></span>
            </button>
          </div>

          <Transition name="conf">
            <p v-if="authError" class="auth-error">{{ authError }}</p>
          </Transition>
        </div>
      </section>

      <!-- ADMIN PANEL -->
      <section v-else class="panel">
        <header class="panel-head">
          <div>
            <p class="eyebrow">queue</p>
            <h1>Manage prompts</h1>
          </div>
          <button class="icon-btn" :class="{ spinning: loading }" aria-label="Refresh" @click="loadPrompts">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.7-3.95"/><polyline points="13.5 2.5 13.5 5 11 5"/>
            </svg>
          </button>
        </header>

        <div class="filter-row" role="tablist">
          <button
            v-for="f in filters"
            :key="f.value"
            class="pill"
            :class="{ on: filter === f.value }"
            @click="filter = f.value"
          >
            {{ f.label }}<span class="pill-count">{{ counts[f.value] }}</span>
          </button>
        </div>

        <div v-if="loading && !prompts.length" class="loading-state">loading…</div>

        <div v-else-if="!filteredPrompts.length" class="empty-state">
          <p>No prompts in this view.</p>
        </div>

        <ul v-else class="prompt-list">
          <li v-for="item in filteredPrompts" :key="item.id" class="prompt-card">
            <div class="card-head">
              <p class="card-text">{{ item.text }}</p>
              <span class="status-badge" :class="item.status">{{ statusLabel(item.status) }}</span>
            </div>

            <div class="card-meta">
              <time>{{ formatDate(item.date) }}</time>
              <span class="card-id">#{{ item.id.slice(0, 8) }}</span>
            </div>

            <div class="card-controls">
              <label class="control-label">Status</label>
              <select
                class="status-select"
                :value="item.status"
                @change="updateStatus(item.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="queued">Queued</option>
                <option value="progress">In progress</option>
                <option value="done">Delivered</option>
              </select>
            </div>

            <div class="card-upload">
              <img v-if="item.drawing" :src="item.drawing" :alt="item.text" class="existing-drawing" />
              <label class="upload-label" :class="{ 'has-file': uploadFiles[item.id] }">
                <input type="file" accept="image/*" class="file-input" @change="onFileSelect(item.id, $event)" />
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="8" y1="2" x2="8" y2="11"/>
                  <polyline points="4,6 8,2 12,6"/>
                  <line x1="2" y1="14" x2="14" y2="14"/>
                </svg>
                <span>{{ uploadFiles[item.id] ? uploadFiles[item.id]!.name : (item.drawing ? 'replace drawing' : 'upload drawing') }}</span>
              </label>
              <button
                v-if="uploadFiles[item.id]"
                class="btn btn-primary btn-sm"
                :disabled="uploading[item.id]"
                @click="uploadDrawing(item.id)"
              >
                <span v-if="!uploading[item.id]">Save</span>
                <span v-else class="spinner" aria-hidden="true"></span>
              </button>
            </div>

            <Transition name="conf">
              <p v-if="feedback[item.id]" class="card-feedback">{{ feedback[item.id] }}</p>
            </Transition>
          </li>
        </ul>
      </section>
    </main>

    <footer>
      <div class="footer-inner">
        <a href="/" class="footer-brand">Dravver</a>
        <span class="footer-copy">© {{ year }}</span>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
interface Prompt {
  id: string; text: string; date: string; status: string; drawing: string | null
}

definePageMeta({ title: 'admin · dravver' })

const secretInput = ref('')
const authed = ref(false)
const authError = ref('')
const authLoading = ref(false)
const adminSecret = ref('')
const prompts = ref<Prompt[]>([])
const loading = ref(false)
const filter = ref<'all' | 'queued' | 'progress' | 'done'>('all')
const uploadFiles = ref<Record<string, File | null>>({})
const uploading = ref<Record<string, boolean>>({})
const feedback = ref<Record<string, string>>({})
const year = new Date().getFullYear()

const filters = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'progress', label: 'In progress' },
  { value: 'done', label: 'Delivered' },
] as const

const counts = computed(() => {
  const c: Record<string, number> = { all: prompts.value.length, queued: 0, progress: 0, done: 0 }
  for (const p of prompts.value) { if (p.status in c) c[p.status]++ }
  return c
})

const filteredPrompts = computed(() => {
  if (filter.value === 'all') return prompts.value
  return prompts.value.filter(p => p.status === filter.value)
})

async function unlock() {
  if (!secretInput.value || authLoading.value) return
  authLoading.value = true
  authError.value = ''
  try {
    await $fetch('/api/admin/upload', {
      method: 'PATCH',
      headers: { 'x-admin-secret': secretInput.value },
      body: { id: '__test__', status: 'queued' },
    })
  } catch (e: unknown) {
    const err = e as { statusCode?: number }
    if (err?.statusCode === 401) {
      authError.value = 'wrong secret.'
      authLoading.value = false
      return
    }
  }
  adminSecret.value = secretInput.value
  authed.value = true
  authError.value = ''
  authLoading.value = false
  await loadPrompts()
}

async function loadPrompts() {
  loading.value = true
  try {
    prompts.value = await $fetch<Prompt[]>('/api/prompts')
  } finally {
    setTimeout(() => { loading.value = false }, 300)
  }
}

async function updateStatus(id: string, status: string) {
  feedback.value[id] = ''
  try {
    await $fetch('/api/admin/upload', {
      method: 'PATCH',
      headers: { 'x-admin-secret': adminSecret.value },
      body: { id, status },
    })
    feedback.value[id] = `marked ${statusLabel(status).toLowerCase()}.`
    setTimeout(() => { feedback.value[id] = '' }, 2500)
    await loadPrompts()
  } catch {
    feedback.value[id] = 'failed to update. try again.'
  }
}

function onFileSelect(id: string, event: Event) {
  uploadFiles.value[id] = (event.target as HTMLInputElement).files?.[0] || null
  feedback.value[id] = ''
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
    setTimeout(() => { feedback.value[id] = '' }, 2500)
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function statusLabel(s: string) {
  return ({ queued: 'Queued', progress: 'In progress', done: 'Delivered' } as Record<string, string>)[s] ?? s
}
</script>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

/* Nav (shared visual language with index) */
nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, .82);
  backdrop-filter: saturate(1.2) blur(14px);
  -webkit-backdrop-filter: saturate(1.2) blur(14px);
  border-bottom: 1px solid var(--color-border);
}
.nav-inner {
  max-width: var(--content-width);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--nav-height);
  padding: 0 var(--space-lg);
  gap: var(--space-md);
}
.nav-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-fg);
}
.nav-brand {
  font-weight: var(--fw-bold);
  font-size: var(--font-size-base);
}
.nav-tag {
  font-size: var(--font-size-xs);
  font-weight: var(--fw-bold);
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: .14em;
  padding: 3px 10px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-pill);
}
.nav-right { display: flex; align-items: center; gap: var(--space-sm); }
.nav-counter {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 6px 14px;
}
.nav-counter b { color: var(--color-fg); font-weight: var(--fw-bold); }
@media (max-width: 480px) {
  .lbl { display: none; }
  .nav-inner { padding: 0 var(--space-md); }
}

main { flex: 1; width: 100%; }

/* Hero (auth gate) */
.hero {
  padding: clamp(40px, 8vw, 96px) var(--space-lg) var(--space-2xl);
}
.hero-inner {
  max-width: var(--form-width);
  margin: 0 auto;
}
.hero-inner.narrow { max-width: 440px; }

.eyebrow {
  font-size: var(--font-size-xs);
  font-weight: var(--fw-medium);
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: .14em;
  margin-bottom: var(--space-md);
}
h1 {
  font-size: clamp(1.75rem, 6vw, var(--font-size-2xl));
  font-weight: var(--fw-black);
  letter-spacing: -.02em;
  line-height: 1.05;
  color: var(--color-fg);
  margin-bottom: var(--space-md);
}
.subtitle {
  font-size: var(--font-size-base);
  color: var(--color-muted);
  margin-bottom: var(--space-xl);
  line-height: 1.55;
  max-width: 48ch;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: border-color var(--dur-base) var(--ease-out);
}
.form-card:focus-within { border-color: var(--color-fg); }

.field { display: flex; flex-direction: column; }
.field label, .control-label {
  font-size: var(--font-size-xs);
  font-weight: var(--fw-bold);
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--color-muted);
  margin-bottom: var(--space-sm);
}
.field input {
  width: 100%;
  padding: 14px 16px;
  font-size: var(--font-size-base);
  background: var(--color-bg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.field input::placeholder { color: var(--color-muted); }
.field input:focus { border-color: var(--color-fg); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  padding: 0 var(--space-lg);
  font-size: var(--font-size-base);
  font-weight: var(--fw-bold);
  border-radius: var(--radius-pill);
  border: 2px solid transparent;
  transition: background var(--dur-fast) var(--ease-out),
              color var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              transform var(--dur-fast) var(--ease-out);
}
.btn:active { transform: translateY(1px); }
.btn-primary {
  background: var(--color-fg);
  color: var(--color-bg);
  border-color: var(--color-fg);
  align-self: flex-start;
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-bg);
  color: var(--color-fg);
}
.btn-primary:disabled { opacity: .35; cursor: not-allowed; }
.btn-sm { height: 38px; padding: 0 var(--space-md); font-size: var(--font-size-sm); }
.spinner {
  width: 16px; height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-error {
  margin-top: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--color-error);
  background: rgba(192, 57, 43, .06);
  border: 1px solid rgba(192, 57, 43, .25);
  padding: 10px 14px;
  border-radius: var(--radius-md);
}

/* Admin panel */
.panel {
  max-width: 720px;
  margin: 0 auto;
  padding: clamp(32px, 6vw, 64px) var(--space-lg) var(--space-3xl);
  width: 100%;
}
.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}
.panel-head h1 { margin-bottom: 0; }

.icon-btn {
  width: 40px; height: 40px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-border);
  color: var(--color-muted);
  background: var(--color-bg);
  transition: all var(--dur-fast) var(--ease-out);
  flex-shrink: 0;
}
.icon-btn:hover { border-color: var(--color-fg); color: var(--color-fg); }
.icon-btn.spinning svg { animation: spin .8s var(--ease-in-out); }

.filter-row {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.filter-row::-webkit-scrollbar { display: none; }
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--fw-medium);
  color: var(--color-muted);
  background: var(--color-bg);
  border: 2px solid var(--color-border);
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  transition: all var(--dur-fast) var(--ease-out);
}
.pill:hover { color: var(--color-fg); border-color: var(--color-fg); }
.pill.on { background: var(--color-fg); color: var(--color-bg); border-color: var(--color-fg); }
.pill-count { font-size: var(--font-size-xs); opacity: .75; }

.loading-state {
  padding: var(--space-2xl) var(--space-md);
  text-align: center;
  color: var(--color-muted);
  font-size: var(--font-size-sm);
}

.empty-state {
  text-align: center;
  padding: var(--space-2xl) var(--space-md);
  background: var(--color-surface);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-muted);
  font-size: var(--font-size-sm);
}

/* Prompt cards (admin) */
.prompt-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
.prompt-card {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  transition: border-color var(--dur-fast) var(--ease-out);
}
.prompt-card:hover { border-color: var(--color-fg); }

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}
.card-text {
  font-size: var(--font-size-base);
  color: var(--color-fg);
  line-height: 1.5;
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.status-badge {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--fw-bold);
  text-transform: uppercase;
  letter-spacing: .06em;
  padding: 4px 10px;
  border: 1px solid currentColor;
  border-radius: var(--radius-pill);
  background: var(--color-bg);
}
.status-badge.queued   { color: var(--color-muted); border-color: var(--color-border); }
.status-badge.progress { color: var(--color-wip);   background: var(--color-wip-bg); }
.status-badge.done     { color: var(--color-done);  background: var(--color-done-bg); }

.card-meta {
  display: flex;
  gap: var(--space-md);
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}
.card-id { font-family: var(--font-mono); letter-spacing: .03em; }

.card-controls { display: flex; flex-direction: column; }
.status-select {
  font-size: var(--font-size-base);
  background: var(--color-bg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-fg);
  padding: 10px 14px;
  cursor: pointer;
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out);
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 5 6 8 9 5'/></svg>");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;
}
.status-select:hover, .status-select:focus { border-color: var(--color-fg); }

.card-upload {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
.existing-drawing {
  width: 56px; height: 56px;
  border-radius: var(--radius-md);
  object-fit: cover;
  border: 2px solid var(--color-border);
  background: var(--color-bg);
}
.upload-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--fw-medium);
  color: var(--color-muted);
  background: var(--color-bg);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-pill);
  padding: 10px 18px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease-out);
  flex: 1;
  min-width: 180px;
  justify-content: center;
}
.upload-label:hover { color: var(--color-fg); border-color: var(--color-fg); }
.upload-label.has-file {
  color: var(--color-fg);
  border-color: var(--color-accent);
  border-style: solid;
  background: var(--color-accent-bg);
}
.file-input { display: none; }

.card-feedback {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  padding: 8px 12px;
  background: var(--color-accent-bg);
  border-radius: var(--radius-sm);
}

.conf-enter-active, .conf-leave-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.conf-enter-from, .conf-leave-to { opacity: 0; transform: translateY(-4px); }

/* Footer */
footer {
  margin-top: auto;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}
.footer-inner {
  max-width: var(--content-width);
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-lg);
  font-size: var(--font-size-sm);
  color: var(--color-muted);
}
.footer-brand { color: var(--color-fg); font-weight: var(--fw-bold); }
</style>
