<template>
  <main class="page">
    <section class="hero">
      <DewdLogo :size="72" class="logo" />

      <!-- AUTH GATE -->
      <template v-if="!authed">
        <h1>Admin</h1>
        <p class="subtitle">Enter the secret to manage prompts and upload drawings.</p>

        <div class="gate">
          <input
            id="secret"
            v-model="secretInput"
            type="password"
            placeholder="Secret"
            aria-label="Secret"
            autocomplete="off"
            @keydown.enter="unlock"
          />
          <button class="btn" :disabled="!secretInput || authLoading" @click="unlock">
            <span v-if="!authLoading">Unlock</span>
            <span v-else class="spinner" aria-hidden="true"></span>
          </button>
        </div>

        <Transition name="conf">
          <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>
        </Transition>
      </template>

      <!-- ADMIN PANEL -->
      <template v-else>
        <h1>Manage prompts</h1>
        <p class="subtitle">{{ prompts.length }} total</p>
      </template>
    </section>

    <section v-if="authed" class="panel">
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
        <button class="pill ghost" :disabled="loading" @click="loadPrompts">
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>

      <p v-if="loading && !prompts.length" class="state">loading…</p>
      <p v-else-if="!filteredPrompts.length" class="state">No prompts in this view.</p>

      <ul v-else class="prompt-list">
        <li v-for="item in filteredPrompts" :key="item.id" class="prompt-item">
          <div class="prompt-row">
            <p class="prompt-text">{{ item.text }}</p>
            <span class="status" :class="item.status">{{ statusLabel(item.status) }}</span>
          </div>
          <p class="prompt-meta">{{ formatDate(item.date) }} · #{{ item.id.slice(0, 8) }}</p>

          <img v-if="item.drawing" :src="item.drawing" :alt="item.text" class="existing-drawing" loading="lazy" />

          <div class="controls">
            <select
              class="select"
              aria-label="Status"
              :value="item.status"
              @change="updateStatus(item.id, ($event.target as HTMLSelectElement).value)"
            >
              <option value="queued">Queued</option>
              <option value="progress">In progress</option>
              <option value="done">Delivered</option>
            </select>

            <label class="upload" :class="{ 'has-file': uploadFiles[item.id] }">
              <input type="file" accept="image/*" class="file-input" @change="onFileSelect(item.id, $event)" />
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="8" y1="2" x2="8" y2="11" /><polyline points="4,6 8,2 12,6" /><line x1="2" y1="14" x2="14" y2="14" />
              </svg>
              <span>{{ uploadFiles[item.id] ? uploadFiles[item.id]!.name : (item.drawing ? 'Replace drawing' : 'Upload drawing') }}</span>
            </label>

            <button
              v-if="uploadFiles[item.id]"
              class="btn btn-sm"
              :disabled="uploading[item.id]"
              @click="uploadDrawing(item.id)"
            >
              <span v-if="!uploading[item.id]">Save</span>
              <span v-else class="spinner" aria-hidden="true"></span>
            </button>
          </div>

          <Transition name="conf">
            <p v-if="feedback[item.id]" class="feedback">{{ feedback[item.id] }}</p>
          </Transition>
        </li>
      </ul>
    </section>

    <footer>
      <NuxtLink to="/" class="home-link">← Home</NuxtLink>
      <div class="credit">
        <a href="https://derrickkempf.com" target="_blank" rel="noopener">Derrick Kempf</a>
        <span>© {{ year }}</span>
      </div>
    </footer>
  </main>
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
  max-width: var(--form-width);
  margin: 0 auto;
  padding: 0 var(--space-lg);
  background: var(--color-bg);
}

.hero {
  padding: clamp(40px, 10vh, 112px) 0 var(--space-xl);
  text-align: center;
}
.logo { margin-bottom: var(--space-lg); }
h1 {
  font-size: clamp(2.25rem, 9vw, 4rem);
  font-weight: var(--fw-black);
  letter-spacing: -.03em;
  line-height: 1;
  color: var(--color-fg);
  margin-bottom: var(--space-md);
}
.subtitle {
  font-size: var(--font-size-base);
  color: var(--color-muted);
  line-height: 1.55;
  max-width: 46ch;
  margin: 0 auto var(--space-xl);
}

/* Auth gate */
.gate { display: flex; flex-direction: column; gap: var(--space-md); }
.gate input {
  display: block;
  width: 100%;
  padding: 20px 22px;
  font-size: clamp(1.1rem, 3.5vw, 1.4rem);
  color: var(--color-fg);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.gate input::placeholder { color: var(--color-muted); }
.gate input:focus { border-color: var(--color-fg); }
.gate .btn { align-self: center; }
.auth-error { margin-top: var(--space-lg); font-size: var(--font-size-sm); color: var(--color-error); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  min-width: 120px;
  padding: 0 var(--space-lg);
  font-size: var(--font-size-base);
  font-weight: var(--fw-bold);
  color: var(--color-bg);
  background: var(--color-fg);
  border: 2px solid var(--color-fg);
  border-radius: var(--radius-pill);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.btn:hover:not(:disabled) { background: var(--color-bg); color: var(--color-fg); }
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: .35; cursor: not-allowed; }
.btn-sm { height: 38px; min-width: 76px; font-size: var(--font-size-sm); }

.spinner {
  width: 16px; height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.conf-enter-active, .conf-leave-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.conf-enter-from, .conf-leave-to { opacity: 0; transform: translateY(-4px); }

/* Panel */
.panel { padding-bottom: var(--space-3xl); }

.filter-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  font-size: var(--font-size-sm);
  font-weight: var(--fw-bold);
  color: var(--color-muted);
  background: none;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-pill);
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}
.pill:hover { color: var(--color-fg); border-color: var(--color-fg); }
.pill.on { color: var(--color-bg); background: var(--color-fg); border-color: var(--color-fg); }
.pill.ghost { border-style: dashed; }
.pill:disabled { opacity: .5; cursor: default; }
.pill-count { font-variant-numeric: tabular-nums; opacity: .7; }

.state { text-align: center; color: var(--color-muted); padding: var(--space-xl) 0; }

.prompt-list { list-style: none; }
.prompt-item {
  padding: var(--space-lg) 0;
  border-top: 1px solid var(--color-border);
}
.prompt-item:last-child { border-bottom: 1px solid var(--color-border); }

.prompt-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
}
.prompt-text { flex: 1; min-width: 0; line-height: 1.5; color: var(--color-fg); overflow-wrap: anywhere; }
.status { flex-shrink: 0; font-size: var(--font-size-xs); font-weight: var(--fw-medium); color: var(--color-muted); }
.status.progress { color: var(--color-wip); }
.status.done { color: var(--color-done); }
.prompt-meta { margin-top: 4px; font-size: var(--font-size-xs); color: var(--color-muted); }

.existing-drawing {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: contain;
  margin-top: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}
.select, .upload {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  font-size: var(--font-size-sm);
  font-weight: var(--fw-bold);
  color: var(--color-fg);
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.select { font-family: inherit; outline: none; }
.select:hover, .upload:hover { border-color: var(--color-fg); }
.select:focus-visible, .upload:focus-within { border-color: var(--color-fg); }
.upload.has-file { border-color: var(--color-fg); }
.upload span { max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.upload { position: relative; }

.feedback { margin-top: var(--space-sm); font-size: var(--font-size-sm); color: var(--color-fg); }

/* Footer */
footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg) 0 calc(var(--space-lg) + env(safe-area-inset-bottom, 0px));
  font-size: var(--font-size-sm);
  color: var(--color-muted);
}
footer a { color: var(--color-muted); }
footer a:hover { color: var(--color-fg); }
.credit { display: flex; gap: var(--space-md); }
</style>
