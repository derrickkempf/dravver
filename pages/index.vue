<template>
  <div class="page">

    <!-- NAV — matches VV fixed nav -->
    <nav>
      <div class="nav-inner">
        <a href="/" class="nav-logo" aria-label="Home">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1 C7.6 0.8, 11.2 1.1, 12.8 3.8 C14.1 6, 13.9 9.4, 12.2 11.3 C10.3 13.4, 7.4 13.8, 5.2 12.8 C2.4 11.5, 0.8 8.3, 1 5.8 C1.3 2.5, 3.8 1.2, 7 1"
              stroke="currentColor" stroke-width="1.1" fill="none" stroke-linecap="round"
            />
          </svg>
        </a>
        <div class="nav-links">
          <span class="nav-brand">Dravver</span>
        </div>
      </div>
    </nav>

    <!-- MAIN — form layout matching /visuals/request -->
    <main>
      <div class="form-container">

        <h1>Submit a drawing prompt</h1>
        <p class="subtitle">Have an idea, concept, or phrase you'd like to see drawn? Describe it below.</p>

        <div class="form-fields">
          <div class="field">
            <label for="idea">The idea</label>
            <textarea
              id="idea"
              v-model="prompt"
              placeholder="A quote, concept, or idea you want drawn..."
              rows="3"
              @keydown.meta.enter="submit"
              @keydown.ctrl.enter="submit"
            ></textarea>
          </div>

          <button
            class="submit-btn"
            :disabled="!prompt.trim()"
            @click="submit"
          >
            Submit request
          </button>
        </div>

        <Transition name="conf">
          <p v-if="confirmation" class="confirmation">{{ confirmation }}</p>
        </Transition>

      </div>

      <!-- RECENT PROMPTS -->
      <div class="recent-container">
        <h2 class="recent-header">Recent prompts</h2>

        <div v-if="!prompts.length" class="empty-state">
          <p>Nothing yet. Submit something worth drawing.</p>
        </div>

        <TransitionGroup name="list" tag="div" class="prompt-list">
          <div v-for="item in prompts" :key="item.id" class="prompt-item">
            <div class="prompt-body">
              <div class="prompt-text">{{ item.text }}</div>
              <div class="prompt-meta">
                <span class="prompt-date">{{ formatDate(item.date) }}</span>
                <span class="prompt-status" :class="item.status">{{ statusLabel(item.status) }}</span>
              </div>
              <div v-if="item.status === 'done'" class="prompt-result">
                <img v-if="item.drawing" :src="item.drawing" :alt="item.text" class="prompt-result-img" />
                <p v-else class="prompt-result-placeholder">coming soon.</p>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </main>

    <!-- FOOTER — dark, matching VV -->
    <footer>
      <div class="footer-inner">
        <a href="/" class="footer-brand">Dravver</a>
        <div class="footer-links">
          <span class="footer-credit">by Derrick Kempf</span>
        </div>
        <p class="footer-copy">&copy; {{ new Date().getFullYear() }} Dravver</p>
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

const prompt = ref('')
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
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

/* --- Nav (VV style: fixed, white/blur, border-bottom) --- */
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

.nav-logo:hover { color: var(--color-text-secondary); }

.nav-brand {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text);
  letter-spacing: 0.02em;
}

/* --- Main --- */
main {
  flex: 1;
  padding-top: 96px; /* 48px nav + 48px spacing */
}

/* --- Form Container (matches /visuals/request) --- */
.form-container {
  max-width: var(--form-width);
  margin: 0 auto;
  padding: 0 16px 48px;
}

@media (min-width: 640px) { .form-container { padding: 0 24px 48px; } }

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
  line-height: 1.2;
}

.subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
  line-height: 1.5;
}

/* --- Form Fields --- */
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

.field textarea {
  width: 100%;
  padding: 12px 16px;
  font-size: 0.875rem;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  resize: none;
  transition: border-color 0.3s ease;
  line-height: 1.5;
}

.field textarea::placeholder {
  color: var(--color-text-secondary);
}

.field textarea:focus {
  border-color: var(--color-text);
}

/* --- Submit Button (VV pill style) --- */
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

.submit-btn:hover {
  background: var(--color-accent-hover);
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* --- Confirmation --- */
.confirmation {
  margin-top: 16px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.conf-enter-active, .conf-leave-active { transition: opacity 0.3s ease; }
.conf-enter-from, .conf-leave-to { opacity: 0; }

/* --- Recent Prompts --- */
.recent-container {
  max-width: var(--form-width);
  margin: 0 auto;
  padding: 0 16px 64px;
}

@media (min-width: 640px) { .recent-container { padding: 0 24px 64px; } }

.recent-header {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
  padding-top: 32px;
  border-top: 1px solid var(--color-border);
}

.prompt-list {
  display: flex;
  flex-direction: column;
}

.prompt-item {
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border);
}

.prompt-item:last-child { border-bottom: none; }

.prompt-body { min-width: 0; }

.prompt-text {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

.prompt-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.prompt-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.prompt-status {
  font-size: 0.75rem;
  font-weight: 500;
}

.prompt-status.queued   { color: var(--color-text-secondary); }
.prompt-status.progress { color: var(--color-text); }
.prompt-status.done     { color: var(--color-text); }

/* --- Drawing Result --- */
.prompt-result {
  margin-top: 12px;
}

.prompt-result-img {
  width: 100%;
  border-radius: var(--radius-sm);
  display: block;
  border: 1px solid var(--color-border);
}

.prompt-result-placeholder {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

/* --- Empty State --- */
.empty-state {
  padding: 24px 0;
}

.empty-state p {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* --- Footer (VV dark footer) --- */
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

.footer-brand:hover { color: #fff; }

.footer-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.footer-credit {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.3s ease;
}

.footer-copy {
  font-size: 0.75rem;
}

/* --- List Transitions --- */
.list-enter-active { transition: opacity 0.2s ease; }
.list-enter-from   { opacity: 0; }
</style>
