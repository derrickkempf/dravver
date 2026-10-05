<template>
  <main class="page">
    <section class="hero">
      <DewdLogo class="logo" />
      <h1>What shall I draw?</h1>
      <p class="subtitle">
        Have an idea, concept, or phrase you'd like to see drawn?
        Describe it below and I'll get to it.
      </p>

      <div class="field">
        <textarea
          id="idea"
          ref="textareaEl"
          v-model="prompt"
          :maxlength="MAX_CHARS"
          placeholder="A quote, concept, or idea…"
          rows="4"
          aria-label="What shall I draw?"
          @keydown.meta.enter.prevent="submit"
          @keydown.ctrl.enter.prevent="submit"
          @input="autoGrow"
        ></textarea>
        <!-- Honeypot: invisible to people, irresistible to bots -->
        <input
          v-model="trap"
          class="trap"
          type="text"
          name="website"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        />
        <div class="field-foot">
          <span class="counter" :class="{ near: prompt.length > MAX_CHARS * 0.85, full: prompt.length === MAX_CHARS }">
            {{ prompt.length }} / {{ MAX_CHARS }}
          </span>
          <button class="btn" :disabled="!canSubmit || submitting" @click="submit">
            <span v-if="!submitting">Submit</span>
            <span v-else class="spinner" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <Transition name="conf">
        <p v-if="confirmation" class="confirmation" role="status">{{ confirmation }}</p>
      </Transition>
    </section>

    <section class="queue" v-if="queue.length">
      <h2>Recent queue</h2>
      <TransitionGroup name="list" tag="ul" class="prompt-list">
        <li v-for="item in queue" :key="item.id" class="prompt-item">
          <div class="prompt-row">
            <p class="prompt-text">{{ item.text }}</p>
            <span class="status" :class="item.status">{{ statusLabel(item.status) }}</span>
          </div>
          <time class="prompt-date" :datetime="item.date">{{ formatDate(item.date) }}</time>
          <div v-if="item.status === 'done'" class="prompt-result">
            <p class="placeholder">drawing coming soon.</p>
          </div>
        </li>
      </TransitionGroup>
    </section>

    <section class="drawn-cta">
      <NuxtLink to="/drawn" class="drawn-btn">
        <span>See all drawings</span>
        <span v-if="drawnCount" class="drawn-count">{{ drawnCount }}</span>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </NuxtLink>
    </section>

    <footer>
      <button
        ref="infoBtn"
        class="info-btn"
        type="button"
        aria-label="About this site"
        aria-haspopup="dialog"
        :aria-expanded="showInfo"
        @click="openInfo"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.25" />
          <path d="M12 11v5.25" />
          <circle cx="12" cy="7.9" r=".6" fill="currentColor" />
        </svg>
      </button>
      <div class="credit">
        <a href="https://derrickkempf.com" target="_blank" rel="noopener">Derrick Kempf</a>
        <span>© {{ year }}</span>
      </div>
    </footer>

    <Transition name="modal">
      <div v-if="showInfo" class="modal-backdrop" @click.self="closeInfo">
        <div
          ref="dialogEl"
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-title"
          tabindex="-1"
          @keydown.esc="closeInfo"
        >
          <button class="modal-close" type="button" aria-label="Close" @click="closeInfo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>

          <h2 id="info-title">About dravver</h2>
          <p class="lede">You type the prompt. I draw it. By hand. You'll get it when you get it.</p>

          <h3>Why</h3>
          <p>
            AI is generating graphics whether we participate or not. So this is the alternative:
            one input field, one human, and a response time best described as “organic.”
            No API. No model. No latency optimizations. Just a guy with a pen.
          </p>

          <h3>How it works</h3>
          <ol>
            <li>Submit your prompt.</li>
            <li>It gets added to the queue, which is a notebook on a desk.</li>
            <li>The notebook gets drawn from at some point.</li>
            <li>You receive the drawing at an undefined later date.</li>
          </ol>
          <p>The drawing is real. Made by hand. Yours. This is not a bug, it's the feature.</p>

          <h3>Delivery</h3>
          <p>
            Times vary with queue depth, complexity, whether I'm traveling, and whether the prompt
            made me laugh. Funnier prompts tend to get drawn faster. That's not a policy, it's just how it goes.
          </p>

          <h3>What to submit</h3>
          <p>Concepts, not scenes. One idea, compressed.</p>
          <ul>
            <li><strong>Works well:</strong> “Sell your sawdust,” “Build once, sell twice,” “Consistency beats intensity.”</li>
            <li><strong>Less useful:</strong> “Draw my cat,” scenes with specific lighting, anything due Tuesday.</li>
          </ul>

          <p class="modal-foot">
            A satirical fork of <a href="https://github.com/visualizevalue/vvriter" target="_blank" rel="noopener">vvriter</a>,
            built by <a href="https://www.derrickkempf.com" target="_blank" rel="noopener">Derrick Kempf</a>.
            <a href="https://github.com/derrickkempf/dravver" target="_blank" rel="noopener">View on GitHub</a>.
          </p>
        </div>
      </div>
    </Transition>
  </main>
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
const trap = ref('')
let loadedAt = 0
const textareaEl = ref<HTMLTextAreaElement | null>(null)

let confTimer: ReturnType<typeof setTimeout> | null = null
const year = new Date().getFullYear()

// Info modal
const showInfo = ref(false)
const infoBtn = ref<HTMLButtonElement | null>(null)
const dialogEl = ref<HTMLDivElement | null>(null)

async function openInfo() {
  showInfo.value = true
  document.body.style.overflow = 'hidden'
  await nextTick()
  dialogEl.value?.focus()
}
function closeInfo() {
  showInfo.value = false
  document.body.style.overflow = ''
  infoBtn.value?.focus()
}

const { data, refresh } = await useFetch<Prompt[]>('/api/prompts')
const prompts = computed(() => data.value || [])
// Prompts that have a drawing move over to the Drawn page
const queue = computed(() => prompts.value.filter(p => !p.drawing))
const drawnCount = computed(() => prompts.value.filter(p => p.drawing).length)
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
    await $fetch('/api/prompts', { method: 'POST', body: { text: val, website: trap.value, t: Date.now() - loadedAt } })
    await refresh()
    confirmation.value = responses[idx++ % responses.length]
    if (confTimer) clearTimeout(confTimer)
    confTimer = setTimeout(() => { confirmation.value = '' }, 4500)
    prompt.value = ''
    autoGrow()
  } catch (e: unknown) {
    const err = e as { statusCode?: number; statusMessage?: string; data?: { statusMessage?: string; message?: string }; message?: string }
    const serverMsg = err?.data?.statusMessage || err?.data?.message || err?.statusMessage || err?.message
    const code = err?.statusCode
    if (code && code >= 500) {
      confirmation.value = `server error (${code}). the prompt store may not be configured — check upstash env vars.`
    } else if (serverMsg) {
      confirmation.value = `couldn't submit: ${serverMsg}`
    } else {
      confirmation.value = 'something went sideways. try again?'
    }
    console.error('[dravver] submit failed:', e)
  } finally {
    submitting.value = false
  }
}

function autoGrow() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 320) + 'px'
}

function formatDate(d: string) {
  const dt = new Date(d)
  const diffMin = Math.floor((Date.now() - dt.getTime()) / 60000)
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

onMounted(() => {
  loadedAt = Date.now()
  autoGrow()
  refresh() // always pull fresh data after load, never trust the server-rendered copy
})
onBeforeUnmount(() => {
  if (confTimer) clearTimeout(confTimer)
  document.body.style.overflow = ''
})
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
  padding: clamp(40px, 10vh, 112px) 0 var(--space-2xl);
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

.trap {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.field textarea {
  display: block;
  width: 100%;
  min-height: 160px;
  padding: 20px 22px;
  font-size: clamp(1.1rem, 3.5vw, 1.4rem);
  line-height: 1.45;
  color: var(--color-fg);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  outline: none;
  resize: none;
  transition: border-color var(--dur-fast) var(--ease-out);
}
.field textarea::placeholder { color: var(--color-muted); }
.field textarea:focus { border-color: var(--color-fg); }

.field-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-md);
}
.counter {
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}
.counter.near { color: var(--color-wip); }
.counter.full { color: var(--color-error); }

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

.spinner {
  width: 16px; height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.confirmation {
  margin-top: var(--space-lg);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-fg);
}
.conf-enter-active, .conf-leave-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.conf-enter-from, .conf-leave-to { opacity: 0; transform: translateY(-4px); }

/* Queue */
.queue { padding-bottom: var(--space-xl); }

/* Big link to the gallery */
.drawn-cta { padding-bottom: var(--space-3xl); }
.drawn-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  min-height: 76px;
  padding: 0 var(--space-lg);
  font-size: clamp(1.15rem, 4vw, 1.4rem);
  font-weight: var(--fw-black);
  letter-spacing: -.01em;
  color: var(--color-bg);
  background: var(--color-fg);
  border: 2px solid var(--color-fg);
  border-radius: var(--radius-pill);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.drawn-btn:hover { background: var(--color-bg); color: var(--color-fg); }
.drawn-btn:active { transform: translateY(1px); }
.drawn-count {
  font-size: var(--font-size-sm);
  font-weight: var(--fw-bold);
  padding: 2px 10px;
  border: 1.5px solid currentColor;
  border-radius: var(--radius-pill);
}
.queue h2 {
  font-size: var(--font-size-xs);
  font-weight: var(--fw-bold);
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--color-muted);
  margin-bottom: var(--space-md);
}

.prompt-list { list-style: none; position: relative; }
.prompt-item {
  padding: var(--space-md) 0;
  border-top: 1px solid var(--color-border);
}
.prompt-item:last-child { border-bottom: 1px solid var(--color-border); }

.prompt-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
}
.prompt-text {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
  color: var(--color-fg);
  overflow-wrap: anywhere;
}
.status {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--fw-medium);
  color: var(--color-muted);
}
.status.progress { color: var(--color-wip); }
.status.done { color: var(--color-done); }

.prompt-date {
  display: block;
  margin-top: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-muted);
}

.prompt-result { margin-top: var(--space-md); }
.prompt-result img { width: 100%; border-radius: var(--radius-md); }
.placeholder { font-size: var(--font-size-sm); color: var(--color-muted); font-style: italic; }

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
footer a { color: var(--color-muted); text-decoration: none; }
footer a:hover { color: var(--color-fg); }
.credit { display: flex; gap: var(--space-md); }

.info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: #9a9a9a;
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.info-btn:hover { color: var(--color-fg); }
.info-btn:active { transform: scale(.94); }
.info-btn:focus-visible { outline: 2px solid var(--color-fg); outline-offset: 2px; }

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: rgba(0, 0, 0, .45);
}
.modal {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: min(86dvh, 720px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-xl) var(--space-xl) var(--space-lg);
  color: var(--color-fg);
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, .25);
  outline: none;
}
.modal h2 {
  font-size: 1.6rem;
  font-weight: var(--fw-black);
  letter-spacing: -.02em;
  line-height: 1.1;
  margin: 0 var(--space-xl) var(--space-sm) 0;
  text-transform: none;
  color: var(--color-fg);
}
.modal .lede { font-size: var(--font-size-base); margin-bottom: var(--space-md); }
.modal h3 {
  margin: var(--space-lg) 0 var(--space-xs);
  font-size: var(--font-size-xs);
  font-weight: var(--fw-bold);
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--color-muted);
}
.modal p, .modal li { font-size: var(--font-size-sm); line-height: 1.6; color: var(--color-fg); }
.modal p + p, .modal p + ul, .modal ol + p { margin-top: var(--space-sm); }
.modal ol, .modal ul { padding-left: 1.25em; }
.modal li + li { margin-top: 4px; }
.modal a { color: var(--color-fg); text-decoration: underline; text-underline-offset: 2px; }
.modal-foot {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
  color: var(--color-muted);
}
.modal-foot a { color: inherit; }
.modal-foot a:hover { color: var(--color-fg); }

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--color-muted);
  background: none;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.modal-close:hover { color: var(--color-fg); background: var(--color-surface); }

.modal-enter-active, .modal-leave-active { transition: opacity var(--dur-base) var(--ease-out); }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform var(--dur-base) var(--ease-out); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(12px) scale(.98); }

.list-enter-active, .list-leave-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(8px); }
.list-move { transition: transform var(--dur-slow) var(--ease-out); }
</style>
