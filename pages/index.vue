<template>
  <div class="page">

    <header>
      <div class="logo">
        <div class="logo-mark">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1 C7.6 0.8, 11.2 1.1, 12.8 3.8 C14.1 6, 13.9 9.4, 12.2 11.3 C10.3 13.4, 7.4 13.8, 5.2 12.8 C2.4 11.5, 0.8 8.3, 1 5.8 C1.3 2.5, 3.8 1.2, 7 1"
              stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round"
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
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" style="color: var(--gray-z-5)">
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
              <span class="prompt-status" :class="item.status">{{ statusLabel(item.status) }}</span>
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
/* --- Page Shell --- */
.page {
  min-height: 100dvh;
  background: var(--background);
  display: flex;
  flex-direction: column;
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
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--size-2);
}

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

.header-right {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--gray-z-5);
  text-align: right;
  line-height: var(--line-height-lg);
  text-transform: var(--ui-text-transform);
  letter-spacing: var(--letter-spacing);
}

/* --- Hero --- */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--size-9) 0 var(--size-8);
  flex-shrink: 0;
}

h1 {
  font-size: clamp(1.5rem, 4vw, var(--font-xl));
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-sm);
  text-align: center;
  margin-bottom: var(--size-7);
}

/* --- Search Input --- */
.pill-search {
  display: flex;
  align-items: center;
  gap: var(--size-2);
  width: 100%;
  max-width: var(--content-width-sm);
  padding: var(--size-3) var(--size-3) var(--size-3) var(--size-5);
  border: 1px solid var(--border-color);
  border-radius: var(--size-1);
  cursor: text;
  background: var(--background);
  transition: border-color 0.2s ease;
}

.pill-search.focused {
  border-color: var(--border-color-highlight);
}

.pill-search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--font-sm);
  color: var(--color);
  caret-color: var(--color);
  min-width: 0;
  min-height: 44px;
}

.pill-search input::placeholder {
  color: var(--gray-z-5);
}

.pill-arrow {
  flex-shrink: 0;
  width: 36px; height: 36px;
  border-radius: var(--size-1);
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--gray-z-4);
  display: flex; align-items: center; justify-content: center;
  cursor: default;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.pill-arrow.active {
  color: var(--color);
  border-color: var(--border-color-highlight);
  cursor: pointer;
}

.pill-arrow.active:hover {
  background: var(--gray-z-1);
  border-color: var(--gray-z-4);
}

/* --- Confirmation --- */
.confirmation {
  margin-top: var(--size-3);
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--muted);
  letter-spacing: var(--letter-spacing);
  text-align: center;
  min-height: 1.1rem;
}

.conf-enter-active, .conf-leave-active { transition: opacity 0.3s ease; }
.conf-enter-from, .conf-leave-to { opacity: 0; }

/* --- Divider --- */
.section-divider {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: var(--size-2) 0 0;
}

/* --- Recent Prompts --- */
.recent {
  flex: 1;
  padding: var(--size-7) 0 0;
}

.recent-header {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-lg);
  text-transform: var(--ui-text-transform);
  color: var(--gray-z-4);
  margin-bottom: var(--size-5);
}

.prompt-list {
  display: flex;
  flex-direction: column;
}

.prompt-item {
  display: flex;
  gap: var(--size-3);
  padding: var(--size-4) 0;
  border-bottom: 1px solid var(--border-color);
}

.prompt-item:last-child { border-bottom: none; }

.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.status-dot.queued   { background: var(--gray-z-4); }
.status-dot.progress { background: var(--gray-z-7); }
.status-dot.done     { background: var(--color); }

.prompt-body { flex: 1; min-width: 0; }

.prompt-text {
  font-size: var(--font-base);
  color: var(--gray-z-8);
  line-height: var(--line-height-md);
}

.prompt-meta {
  display: flex;
  align-items: center;
  gap: var(--size-2);
  margin-top: var(--size-1);
}

.prompt-date {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--gray-z-4);
}

.prompt-status {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-md);
  text-transform: var(--ui-text-transform);
}

.prompt-status.queued   { color: var(--gray-z-4); }
.prompt-status.progress { color: var(--gray-z-7); }
.prompt-status.done     { color: var(--color); }

/* --- Drawing Result --- */
.prompt-result {
  margin-top: var(--size-3);
  padding: var(--size-3) var(--size-4);
  border: 1px solid var(--border-color);
  border-radius: var(--size-1);
  background: var(--gray-z-1);
}

.prompt-result-label {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-lg);
  text-transform: var(--ui-text-transform);
  color: var(--gray-z-4);
  margin-bottom: var(--size-2);
}

.prompt-result-img {
  width: 100%;
  border-radius: var(--size-1);
  display: block;
}

.prompt-result-placeholder {
  font-size: var(--font-sm);
  color: var(--gray-z-4);
  letter-spacing: var(--letter-spacing);
}

/* --- Empty State --- */
.empty-state { padding: var(--size-7) 0; }
.empty-state p {
  font-size: var(--font-sm);
  color: var(--gray-z-4);
  line-height: var(--line-height-lg);
}

/* --- Footer --- */
footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--size-2);
  padding: var(--size-8) 0;
  flex-shrink: 0;
}

.agent-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--background);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.agent-avatar img { width: 100%; height: 100%; object-fit: cover; }

.agent-label {
  font-family: var(--ui-font-family);
  font-size: var(--font-xs);
  color: var(--muted);
  letter-spacing: var(--letter-spacing-lg);
  text-transform: var(--ui-text-transform);
}

/* --- List Transitions --- */
.list-enter-active { transition: opacity 0.2s ease; }
.list-enter-from   { opacity: 0; }

/* --- Responsive --- */
@media (min-width: 640px)  { .page { padding: 0 var(--size-8); } }
@media (min-width: 960px)  { .page { padding: 0 var(--size-10); } }
</style>
