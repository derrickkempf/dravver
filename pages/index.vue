<template>
  <div class="page">

    <!-- NAV -->
    <nav :class="{ 'nav-hidden': navHidden }">
      <div class="nav-inner">
        <a href="/" class="nav-logo" aria-label="Home">
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M7 1 C7.6 0.8, 11.2 1.1, 12.8 3.8 C14.1 6, 13.9 9.4, 12.2 11.3 C10.3 13.4, 7.4 13.8, 5.2 12.8 C2.4 11.5, 0.8 8.3, 1 5.8 C1.3 2.5, 3.8 1.2, 7 1"
              stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"
            />
          </svg>
          <span class="nav-brand">Dravver</span>
        </a>
        <div class="nav-right">
          <span class="nav-counter">
            <b>{{ prompts.length }}</b>
            <span class="nav-counter-label">in&nbsp;queue</span>
          </span>
        </div>
      </div>
    </nav>

    <!-- MAIN -->
    <main>

      <!-- HERO / FORM -->
      <section class="hero">
        <div class="hero-inner">
          <p class="eyebrow">submit · wait · receive</p>
          <h1>Submit a&nbsp;drawing prompt.</h1>
          <p class="subtitle">
            Have an idea, concept, or phrase you'd like to see drawn?
            Describe it below and it'll land on the desk.
          </p>

          <div class="form-card">
            <div class="field">
              <label for="idea">The idea</label>
              <textarea
                id="idea"
                ref="textareaEl"
                v-model="prompt"
                :maxlength="MAX_CHARS"
                placeholder="A quote, concept, or idea you want drawn…"
                rows="3"
                @keydown.meta.enter.prevent="submit"
                @keydown.ctrl.enter.prevent="submit"
                @input="autoGrow"
              ></textarea>
              <div class="field-foot">
                <span class="hint">⌘↵ to submit</span>
                <span class="counter" :class="{ near: prompt.length > MAX_CHARS * 0.85, full: prompt.length === MAX_CHARS }">
                  {{ prompt.length }} / {{ MAX_CHARS }}
                </span>
              </div>
            </div>

            <button
              class="btn btn-primary"
              :disabled="!canSubmit || submitting"
              @click="submit"
            >
              <span v-if="!submitting">Submit request</span>
              <span v-else class="spinner" aria-hidden="true"></span>
            </button>
          </div>

          <Transition name="conf">
            <p v-if="confirmation" class="confirmation" role="status">{{ confirmation }}</p>
          </Transition>
        </div>
      </section>

      <!-- RECENT -->
      <section class="recent" ref="recentEl">
        <header class="recent-head">
          <div class="recent-title">
            <h2>Recent prompts</h2>
            <span class="recent-count">{{ filtered.length }}</span>
          </div>
          <button class="icon-btn" :class="{ spinning: refreshing }" aria-label="Refresh" @click="manualRefresh">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.7-3.95"/><polyline points="13.5 2.5 13.5 5 11 5"/>
            </svg>
          </button>
        </header>

        <div class="filter-row" role="tablist" aria-label="Filter prompts">
          <button
            v-for="f in filters"
            :key="f.value"
            class="pill"
            :class="{ on: filter === f.value }"
            role="tab"
            :aria-selected="filter === f.value"
            @click="filter = f.value"
          >
            {{ f.label }}
            <span class="pill-count" v-if="counts[f.value] !== undefined">{{ counts[f.value] }}</span>
          </button>
        </div>

        <div v-if="!prompts.length" class="empty-state">
          <div class="empty-mark" aria-hidden="true">✎</div>
          <p>Nothing yet. Submit something worth drawing.</p>
        </div>

        <div v-else-if="!filtered.length" class="empty-state quiet">
          <p>No prompts in this view.</p>
        </div>

        <TransitionGroup v-else name="list" tag="ul" class="prompt-list">
          <li v-for="item in filtered" :key="item.id" class="prompt-item">
            <div class="prompt-row">
              <p class="prompt-text">{{ item.text }}</p>
              <span class="status-badge" :class="item.status">{{ statusLabel(item.status) }}</span>
            </div>
            <div class="prompt-meta">
              <time :datetime="item.date">{{ formatDate(item.date) }}</time>
            </div>
            <div v-if="item.status === 'done'" class="prompt-result">
              <img v-if="item.drawing" :src="item.drawing" :alt="item.text" loading="lazy" />
              <p v-else class="prompt-result-placeholder">drawing coming soon.</p>
            </div>
          </li>
        </TransitionGroup>
      </section>

    </main>

    <!-- FOOTER -->
    <footer>
      <div class="footer-inner">
        <a href="/" class="footer-brand">Dravver</a>
        <span class="footer-credit">by <a href="https://derrickkempf.com" target="_blank" rel="noopener">Derrick Kempf</a></span>
        <span class="footer-copy">© {{ year }}</span>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
interface Prompt {
  id: string
  text: string
  date: string
  status: string
  drawing: string | null
}

const MAX_CHARS = 280
const prompt = ref('')
const confirmation = ref('')
const submitting = ref(false)
const refreshing = ref(false)
const filter = ref<'all' | 'queued' | 'progress' | 'done'>('all')
const navHidden = ref(false)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const recentEl = ref<HTMLElement | null>(null)

let confTimer: ReturnType<typeof setTimeout> | null = null
let lastScroll = 0
const year = new Date().getFullYear()

const filters = [
  { value: 'all', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'progress', label: 'In progress' },
  { value: 'done', label: 'Delivered' },
] as const

const { data, refresh } = await useFetch<Prompt[]>('/api/prompts')
const prompts = computed(() => data.value || [])

const counts = computed(() => {
  const c: Record<string, number> = { all: prompts.value.length, queued: 0, progress: 0, done: 0 }
  for (const p of prompts.value) {
    if (p.status in c) c[p.status]++
  }
  return c
})

const filtered = computed(() => {
  if (filter.value === 'all') return prompts.value
  return prompts.value.filter(p => p.status === filter.value)
})

const canSubmit = computed(() => prompt.value.trim().length > 0 && prompt.value.length <= MAX_CHARS)

const responses = [
  'noted. the notebook has it now.',
  'alright, working on it.',
  "got it. i'll see what i can do.",
  "added to the queue. it'll happen.",
  'on it. probably.',
  'received. no promises on timing.',
  "thanks for that. it's in the pile.",
  'good one. pencil is warming up.',
  'queued. patience is a virtue and all that.',
  'understood. this one might be fun.',
]
let idx = 0

async function submit() {
  const val = prompt.value.trim()
  if (!val || submitting.value) return
  submitting.value = true
  try {
    await $fetch('/api/prompts', { method: 'POST', body: { text: val } })
    await refresh()
    confirmation.value = responses[idx++ % responses.length]
    if (confTimer) clearTimeout(confTimer)
    confTimer = setTimeout(() => { confirmation.value = '' }, 4500)
    prompt.value = ''
    autoGrow()
    nextTick(() => {
      recentEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  } catch {
    confirmation.value = 'something went sideways. try again?'
  } finally {
    submitting.value = false
  }
}

async function manualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  await refresh()
  setTimeout(() => { refreshing.value = false }, 600)
}

function autoGrow() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 240) + 'px'
}

function formatDate(d: string) {
  const dt = new Date(d)
  const now = new Date()
  const diffMs = now.getTime() - dt.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusLabel(s: string) {
  return ({ queued: 'Queued', progress: 'In progress', done: 'Delivered' } as Record<string, string>)[s] ?? s
}

// Hide nav on scroll down, show on scroll up (subtle, like reference)
function onScroll() {
  const y = window.scrollY
  navHidden.value = y > 120 && y > lastScroll
  lastScroll = y
}

onMounted(() => {
  autoGrow()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (confTimer) clearTimeout(confTimer)
})
</script>

<style scoped>
/* ─────────── Page shell ─────────── */
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

/* ─────────── Nav ─────────── */
nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, .82);
  backdrop-filter: saturate(1.2) blur(14px);
  -webkit-backdrop-filter: saturate(1.2) blur(14px);
  border-bottom: 1px solid var(--color-border);
  transition: transform var(--dur-base) var(--ease-out);
}
nav.nav-hidden { transform: translateY(-100%); }

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
  transition: opacity var(--dur-fast) var(--ease-out);
}
.nav-logo:hover { opacity: .65; }
.nav-brand {
  font-size: var(--font-size-base);
  font-weight: var(--fw-bold);
  letter-spacing: -.01em;
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
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.nav-counter:hover { border-color: var(--color-fg); color: var(--color-fg); }
.nav-counter b { color: var(--color-fg); font-weight: var(--fw-bold); }
.nav-counter-label { font-weight: var(--fw-medium); }
@media (max-width: 480px) {
  .nav-counter-label { display: none; }
  .nav-inner { padding: 0 var(--space-md); }
}

/* ─────────── Main ─────────── */
main {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* ─────────── Hero / Form ─────────── */
.hero {
  padding: clamp(40px, 8vw, 96px) var(--space-lg) var(--space-2xl);
}
.hero-inner {
  max-width: var(--form-width);
  margin: 0 auto;
}

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
.field label {
  font-size: var(--font-size-xs);
  font-weight: var(--fw-bold);
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--color-muted);
  margin-bottom: var(--space-sm);
}
.field textarea {
  width: 100%;
  min-height: 88px;
  padding: 14px 16px;
  font-size: var(--font-size-base);
  line-height: 1.5;
  color: var(--color-fg);
  background: var(--color-bg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  resize: none;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.field textarea::placeholder { color: var(--color-muted); }
.field textarea:focus { border-color: var(--color-fg); }

.field-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-sm);
  font-size: var(--font-size-xs);
  color: var(--color-muted);
}
.hint {
  font-family: var(--font-mono);
  letter-spacing: .03em;
}
@media (max-width: 480px) { .hint { display: none; } }
.counter { font-variant-numeric: tabular-nums; transition: color var(--dur-fast) var(--ease-out); }
.counter.near { color: var(--color-wip); }
.counter.full { color: var(--color-error); }

/* ─────────── Buttons ─────────── */
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
  user-select: none;
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
.btn-primary:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.spinner {
  width: 16px; height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ─────────── Confirmation ─────────── */
.confirmation {
  margin-top: var(--space-lg);
  font-size: var(--font-size-sm);
  color: var(--color-fg);
  background: var(--color-accent-bg);
  border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
  padding: 12px 16px;
  border-radius: var(--radius-md);
}
.conf-enter-active, .conf-leave-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.conf-enter-from, .conf-leave-to { opacity: 0; transform: translateY(-4px); }

/* ─────────── Recent ─────────── */
.recent {
  max-width: var(--form-width);
  margin: 0 auto;
  width: 100%;
  padding: var(--space-xl) var(--space-lg) var(--space-3xl);
  scroll-margin-top: calc(var(--nav-height) + 16px);
}

.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}
.recent-title { display: flex; align-items: baseline; gap: var(--space-sm); }
.recent-head h2 {
  font-size: var(--font-size-xl);
  font-weight: var(--fw-black);
  letter-spacing: -.01em;
}
.recent-count {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 2px 12px;
  font-weight: var(--fw-medium);
}

.icon-btn {
  width: 40px; height: 40px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-border);
  color: var(--color-muted);
  background: var(--color-bg);
  transition: all var(--dur-fast) var(--ease-out);
}
.icon-btn:hover { border-color: var(--color-fg); color: var(--color-fg); }
.icon-btn.spinning svg { animation: spin .8s var(--ease-in-out); }

/* ─────────── Filter pills ─────────── */
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
.pill-count {
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
  opacity: .75;
}

/* ─────────── Prompt list ─────────── */
.prompt-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.prompt-item {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.prompt-item:hover { border-color: var(--color-fg); }

.prompt-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}
.prompt-text {
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

.prompt-meta {
  margin-top: 6px;
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.prompt-result {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px dashed var(--color-border);
}
.prompt-result img {
  width: 100%;
  border-radius: var(--radius-md);
  background: var(--color-bg);
}
.prompt-result-placeholder {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  font-style: italic;
}

/* ─────────── Empty state ─────────── */
.empty-state {
  text-align: center;
  padding: var(--space-2xl) var(--space-md);
  background: var(--color-surface);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-muted);
}
.empty-state.quiet {
  padding: var(--space-xl) var(--space-md);
  border-style: solid;
}
.empty-mark {
  font-size: 2rem;
  margin-bottom: var(--space-sm);
  opacity: .5;
}
.empty-state p { font-size: var(--font-size-sm); }

/* ─────────── Footer ─────────── */
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
.footer-brand {
  font-weight: var(--fw-bold);
  color: var(--color-fg);
}
.footer-credit a {
  color: var(--color-fg);
  border-bottom: 1px dotted var(--color-border);
  padding-bottom: 1px;
}
.footer-credit a:hover { border-bottom-color: var(--color-fg); }

/* ─────────── List transitions ─────────── */
.list-enter-active,
.list-leave-active {
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.list-enter-from,
.list-leave-to { opacity: 0; transform: translateY(8px); }
.list-leave-active { position: absolute; }
.list-move { transition: transform var(--dur-slow) var(--ease-out); }
</style>
