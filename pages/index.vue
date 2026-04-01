<template>
  <div class="page">

    <header>
      <div class="logo">
        <div class="logo-mark">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1 C7.6 0.8, 11.2 1.1, 12.8 3.8 C14.1 6, 13.9 9.4, 12.2 11.3 C10.3 13.4, 7.4 13.8, 5.2 12.8 C2.4 11.5, 0.8 8.3, 1 5.8 C1.3 2.5, 3.8 1.2, 7 1"
              stroke="rgba(255,255,255,0.6)" stroke-width="1.1" fill="none" stroke-linecap="round"
            />
          </svg>
        </div>
        <span class="logo-name">Dravver</span>
      </div>
      <span class="header-right">Submit a prompt.<br>Get a drawing back. Eventually.</span>
    </header>

    <div class="hero">
      <h1>What shall I dravv?</h1>

      <label class="pill-search" :class="{ focused: inputFocused }">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.6" stroke-linecap="round">
          <circle cx="6.5" cy="6.5" r="5" />
          <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" />
        </svg>
        <input
          v-model="prompt"
          type="text"
          placeholder="describe something worth drawing..."
          autocomplete="off"
          spellcheck="false"
          @focus="inputFocused = true"
          @blur="inputFocused = false"
          @keydown.enter="submit"
        />
        <button
          class="pill-arrow"
          :class="{ active: prompt.trim() }"
          :disabled="!prompt.trim()"
          aria-label="Submit"
          @click="submit"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="8" x2="13" y2="8" />
            <polyline points="9,4 13,8 9,12" />
          </svg>
        </button>
      </label>

      <Transition name="conf">
        <p v-if="confirmation" class="confirmation">{{ confirmation }}</p>
      </Transition>
    </div>

    <hr class="section-divider" />

    <div class="recent">
      <p class="recent-header">Recent prompts</p>

      <div v-if="!prompts.length" class="empty-state">
        <p>Nothing yet.<br>Submit something worth drawing.</p>
      </div>

      <TransitionGroup name="list" tag="div" class="prompt-list">
        <div v-for="item in prompts" :key="item.id" class="prompt-item">
          <div class="status-dot" :class="item.status"></div>
          <div class="prompt-body">
            <div class="prompt-text">{{ item.text }}</div>
            <div class="prompt-meta">
              <span class="prompt-date">{{ formatDate(item.date) }}</span>
              <span class="prompt-badge" :class="item.status">{{ statusLabel(item.status) }}</span>
            </div>
            <div v-if="item.status === 'done'" class="prompt-result">
              <div class="prompt-result-label">Drawing</div>
              <img v-if="item.drawing" :src="item.drawing" :alt="item.text" class="prompt-result-img" />
              <div v-else class="prompt-result-placeholder">coming soon.</div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <footer>
      <div class="agent-avatar">
        <img src="public/avatar.jpg" alt="Derrick Kempf" />
      </div>
      <span class="agent-label">meet your agent</span>
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

const prompt = ref('')
const inputFocused = ref(false)
const confirmation = ref('')
let confTimer: ReturnType<typeof setTimeout> | null = null

const { data, refresh } = await useFetch<Prompt[]>('/api/prompts')
const prompts = computed(() => data.value || [])

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
  "understood. this one might be fun.",
]
let idx = 0

async function submit() {
  const val = prompt.value.trim()
  if (!val) return
  await $fetch('/api/prompts', { method: 'POST', body: { text: val } })
  await refresh()
  confirmation.value = responses[idx++ % responses.length]
  if (confTimer) clearTimeout(confTimer)
  confTimer = setTimeout(() => { confirmation.value = '' }, 4500)
  prompt.value = ''
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusLabel(s: string) {
  return ({ queued: 'Queued', progress: 'In progress', done: 'Delivered' } as Record<string, string>)[s] ?? s
}
</script>

<style scoped>
.page {
  min-height: 100dvh;
  background: #000000;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  max-width: 860px;
  margin: 0 auto;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 0 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.logo { display: flex; align-items: center; gap: 8px; }

.logo-mark {
  width: 28px; height: 28px;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}

.logo-name {
  font-size: 0.78rem; font-weight: 500;
  letter-spacing: 0.08em; text-transform: uppercase;
}

.header-right {
  font-size: 0.65rem; color: rgba(255,255,255,0.3);
  text-align: right; line-height: 1.6;
}

.hero {
  display: flex; flex-direction: column; align-items: center;
  padding: 56px 0 40px; flex-shrink: 0;
}

h1 {
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 700; letter-spacing: -0.025em;
  text-align: center; margin-bottom: 32px;
}

.pill-search {
  display: flex; align-items: center; gap: 10px;
  width: 100%; max-width: 560px;
  padding: 13px 12px 13px 20px;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 999px; cursor: text;
  background: #000000; transition: border-color 0.15s;
}

.pill-search.focused { border-color: rgba(255,255,255,0.45); }

.pill-search input {
  flex: 1; background: transparent;
  border: none; outline: none;
  font-family: inherit; font-size: 0.9rem;
  color: #fff; caret-color: #fff; min-width: 0;
}

.pill-search input::placeholder { color: rgba(255,255,255,0.28); }

.pill-arrow {
  flex-shrink: 0; width: 32px; height: 32px;
  border-radius: 50%; border: 1px solid rgba(255,255,255,0.15);
  background: transparent; color: rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  cursor: default; transition: all 0.18s;
}

.pill-arrow.active { color: #fff; border-color: rgba(255,255,255,0.5); cursor: pointer; }
.pill-arrow.active:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.75); }

.confirmation {
  margin-top: 14px; font-size: 0.7rem;
  color: rgba(255,255,255,0.3); letter-spacing: 0.03em;
  text-align: center; min-height: 1.1rem;
}

.conf-enter-active, .conf-leave-active { transition: opacity 0.3s ease; }
.conf-enter-from, .conf-leave-to { opacity: 0; }

.section-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 8px 0 0; }

.recent { flex: 1; padding: 28px 0 0; }

.recent-header {
  font-size: 0.6rem; font-weight: 500;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(255,255,255,0.22); margin-bottom: 20px;
}

.prompt-list { display: flex; flex-direction: column; }

.prompt-item {
  display: flex; gap: 14px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.prompt-item:last-child { border-bottom: none; }

.status-dot {
  width: 7px; height: 7px;
  border-radius: 50%; margin-top: 5px; flex-shrink: 0;
}

.status-dot.queued   { background: rgba(255,255,255,0.2); }
.status-dot.progress { background: rgba(255,255,255,0.6); }
.status-dot.done     { background: #fff; }

.prompt-body { flex: 1; min-width: 0; }

.prompt-text {
  font-size: 0.95rem; color: rgba(255,255,255,0.85); line-height: 1.4;
}

.prompt-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; }

.prompt-date { font-size: 0.65rem; color: rgba(255,255,255,0.22); }

.prompt-badge {
  font-size: 0.6rem; font-weight: 500;
  letter-spacing: 0.07em; text-transform: uppercase;
  padding: 2px 8px; border-radius: 999px; border: 1px solid;
}

.prompt-badge.queued   { color: rgba(255,255,255,0.3);  border-color: rgba(255,255,255,0.12); }
.prompt-badge.progress { color: rgba(255,255,255,0.65); border-color: rgba(255,255,255,0.35); }
.prompt-badge.done     { color: #fff; border-color: rgba(255,255,255,0.5); }

.prompt-result {
  margin-top: 12px; padding: 14px 16px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; background: rgba(255,255,255,0.02);
}

.prompt-result-label {
  font-size: 0.58rem; font-weight: 500;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(255,255,255,0.2); margin-bottom: 6px;
}

.prompt-result-img { width: 100%; border-radius: 6px; display: block; }

.prompt-result-placeholder {
  font-size: 0.75rem; color: rgba(255,255,255,0.2); letter-spacing: 0.03em;
}

.empty-state { padding: 32px 0; }
.empty-state p { font-size: 0.75rem; color: rgba(255,255,255,0.18); line-height: 1.8; }

footer {
  display: flex; flex-direction: column;
  align-items: center; gap: 9px;
  padding: 36px 0; flex-shrink: 0;
}

.agent-avatar {
  width: 46px; height: 46px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: #000;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.agent-avatar img { width: 100%; height: 100%; object-fit: cover; }

.agent-label { font-size: 0.6rem; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; }

.list-enter-active { transition: all 0.3s ease; }
.list-enter-from   { opacity: 0; transform: translateY(-6px); }

@keyframes up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

header  { animation: up 0.4s ease 0.04s both; }
.hero   { animation: up 0.4s ease 0.10s both; }
.recent { animation: up 0.4s ease 0.18s both; }
footer  { animation: up 0.4s ease 0.26s both; }

@media (min-width: 768px)  { .page { padding: 0 48px; } }
@media (min-width: 1024px) { .page { padding: 0 64px; } }
</style>
