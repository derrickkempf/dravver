<template>
  <main class="page">
    <section class="hero">
      <div class="dewd" aria-hidden="true">
        <img
          v-if="currentDewd"
          :key="tick"
          :src="dewdUrl(currentDewd)"
          alt=""
          width="96"
          height="96"
        />
      </div>
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

    <section class="queue" v-if="prompts.length">
      <h2>Recent queue</h2>
      <TransitionGroup name="list" tag="ul" class="prompt-list">
        <li v-for="item in prompts" :key="item.id" class="prompt-item">
          <div class="prompt-row">
            <p class="prompt-text">{{ item.text }}</p>
            <span class="status" :class="item.status">{{ statusLabel(item.status) }}</span>
          </div>
          <time class="prompt-date" :datetime="item.date">{{ formatDate(item.date) }}</time>
          <div v-if="item.status === 'done'" class="prompt-result">
            <img v-if="item.drawing" :src="item.drawing" :alt="item.text" loading="lazy" />
            <p v-else class="placeholder">drawing coming soon.</p>
          </div>
        </li>
      </TransitionGroup>
    </section>

    <footer>
      <a href="https://derrickkempf.com" target="_blank" rel="noopener">Derrick Kempf</a>
      <span>© {{ year }}</span>
    </footer>
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
const textareaEl = ref<HTMLTextAreaElement | null>(null)

let confTimer: ReturnType<typeof setTimeout> | null = null
const year = new Date().getFullYear()

// DEWD logo: cycle randomly through the collection
const DEWD_BASE = 'https://derrickkempf.github.io/dewd/'
const DEWD_IDS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,345,346,347,348,349,350,351,352,353,354,355,356,357,366,367,368,369,370,371,372,373,374,375,376,377,378,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,419,420]
const dewdUrl = (n: number) => `${DEWD_BASE}SomeDewds-Mint-Art_Dewd-${n}.svg`
const currentDewd = ref<number | null>(null)
const tick = ref(0)
let dewdTimer: ReturnType<typeof setInterval> | null = null

function pickDewd(): number {
  let n: number
  do { n = DEWD_IDS[Math.floor(Math.random() * DEWD_IDS.length)] }
  while (n === currentDewd.value && DEWD_IDS.length > 1)
  return n
}

function nextDewd() {
  const n = pickDewd()
  const img = new Image()
  img.onload = () => { currentDewd.value = n; tick.value++ }
  img.src = dewdUrl(n)
}

const { data, refresh } = await useFetch<Prompt[]>('/api/prompts')
const prompts = computed(() => data.value || [])
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
  autoGrow()
  nextDewd()
  dewdTimer = setInterval(nextDewd, 1400)
})
onBeforeUnmount(() => {
  if (confTimer) clearTimeout(confTimer)
  if (dewdTimer) clearInterval(dewdTimer)
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

.dewd {
  width: 96px;
  height: 96px;
  margin: 0 auto var(--space-lg);
}
.dewd img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  animation: dewd-pop .35s var(--ease-out);
}
@keyframes dewd-pop {
  0%   { opacity: 0; transform: scale(.82) rotate(-6deg); }
  60%  { opacity: 1; transform: scale(1.06) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@media (prefers-reduced-motion: reduce) {
  .dewd img { animation: none; }
}

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
.queue { padding-bottom: var(--space-3xl); }
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
  justify-content: space-between;
  padding: var(--space-lg) 0;
  font-size: var(--font-size-sm);
  color: var(--color-muted);
}
footer a { color: var(--color-fg); }

.list-enter-active, .list-leave-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(8px); }
.list-move { transition: transform var(--dur-slow) var(--ease-out); }
</style>
