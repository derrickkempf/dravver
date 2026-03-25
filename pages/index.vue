<template>
  <div class="page">

    <!-- HEADER -->
    <header>
      <div class="logo">
        <div class="logo-mark">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1 C7.6 0.8, 11.2 1.1, 12.8 3.8 C14.1 6, 13.9 9.4, 12.2 11.3 C10.3 13.4, 7.4 13.8, 5.2 12.8 C2.4 11.5, 0.8 8.3, 1 5.8 C1.3 2.5, 3.8 1.2, 7 1"
              stroke="rgba(255,255,255,0.6)" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <span class="logo-name">Dravver</span>
      </div>
      <span class="header-right">Submit a prompt.<br>Get a drawing back. Eventually.</span>
    </header>

    <!-- DESKTOP: two-col / MOBILE: single col -->
    <div class="body">

      <!-- LEFT / TOP: hero + input -->
      <div class="panel-left">
        <h1>What can I dravv?</h1>

        <label class="pill-search" :class="{ focused: inputFocused }">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.6" stroke-linecap="round">
            <circle cx="6.5" cy="6.5" r="5"/>
            <line x1="10.5" y1="10.5" x2="14.5" y2="14.5"/>
          </svg>
          <input
            ref="inputRef"
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
            @click="submit"
            aria-label="Submit"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="8" x2="13" y2="8"/>
              <polyline points="9,4 13,8 9,12"/>
            </svg>
          </button>
        </label>

        <Transition name="conf">
          <p v-if="confirmation" class="confirmation">{{ confirmation }}</p>
        </Transition>

        <!-- Desktop-only: agent footer inside left panel -->
        <div class="agent desktop-only">
          <div class="agent-avatar">
            <img v-if="avatarExists" src="/avatar.jpg" alt="dewd" />
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2 C13 1.7, 18 2.2, 20.8 5.8 C23.2 8.9, 23 13.8, 21.3 17.2 C19.2 21.5, 15 23.5, 12 22.5 C6.5 21, 1.8 16, 2 12 C2.2 6.2, 6.8 2.3, 12 2"
                stroke="rgba(255,255,255,0.28)" stroke-width="1.1" fill="none" stroke-linecap="round"/>
              <circle cx="9" cy="10.5" r="0.9" fill="rgba(255,255,255,0.28)"/>
              <circle cx="15" cy="10.5" r="0.9" fill="rgba(255,255,255,0.28)"/>
              <path d="M9 16 Q12 18.5 15 16" stroke="rgba(255,255,255,0.28)" stroke-width="0.9" fill="none" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="agent-label">meet your agent</span>
        </div>
      </div>

      <!-- RIGHT / BOTTOM: recent prompts -->
      <div class="panel-right">
        <hr class="divider mobile-only" />
        <div class="recent">
          <p class="recent-header">Recent prompts</p>

          <div v-if="prompts.length === 0" class="empty-state">
            <p>Nothing yet.<br>Submit something worth drawing.</p>
          </div>

          <TransitionGroup name="list" tag="div" class="prompt-list">
            <div
              v-for="item in prompts"
              :key="item.id"
              class="prompt-item"
            >
              <div class="prompt-status">
                <div class="status-dot" :class="item.status"></div>
              </div>
              <div class="prompt-body">
                <div class="prompt-text">{{ item.text }}</div>
                <div class="prompt-meta">
                  <span class="prompt-date">{{ formatDate(item.date) }}</span>
                  <span class="prompt-badge" :class="item.status">{{ statusLabel(item.status) }}</span>
                </div>
                <!-- Drawing result -->
                <div v-if="item.status === 'done' && item.drawing" class="prompt-result">
                  <div class="prompt-result-label">Drawing</div>
                  <img :src="item.drawing" :alt="item.text" class="prompt-result-img" />
                </div>
                <!-- Delivered but no drawing yet -->
                <div v-else-if="item.status === 'done' && !item.drawing" class="prompt-result">
                  <div class="prompt-result-label">Drawing</div>
                  <div class="prompt-result-placeholder">coming soon.</div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>

    </div>

    <!-- Mobile-only agent footer -->
    <footer class="mobile-only">
      <div class="agent-avatar">
        <img v-if="avatarExists" src="/avatar.jpg" alt="dewd" />
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2 C13 1.7, 18 2.2, 20.8 5.8 C23.2 8.9, 23 13.8, 21.3 17.2 C19.2 21.5, 15 23.5, 12 22.5 C6.5 21, 1.8 16, 2 12 C2.2 6.2, 6.8 2.3, 12 2"
            stroke="rgba(255,255,255,0.28)" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          <circle cx="9" cy="10.5" r="0.9" fill="rgba(255,255,255,0.28)"/>
          <circle cx="15" cy="10.5" r="0.9" fill="rgba(255,255,255,0.28)"/>
          <path d="M9 16 Q12 18.5 15 16" stroke="rgba(255,255,255,0.28)" stroke-width="0.9" fill="none" stroke-linecap="round"/>
        </svg>
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
  status: 'queued' | 'progress' | 'done'
  drawing: string | null
}

const prompt = ref('')
const inputFocused = ref(false)
const confirmation = ref('')
const avatarExists = ref(false)
let confTimer: ReturnType<typeof setTimeout> | null = null

const { data: promptsData, refresh } = await useFetch<Prompt[]>('/api/prompts')
const prompts = computed(() => promptsData.value || [])

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

let responseIdx = 0

function nextResponse() {
  const r = responses[responseIdx % responses.length]
  responseIdx++
  return r
}

async function submit() {
  const val = prompt.value.trim()
  if (!val) return

  await $fetch('/api/prompts', {
    method: 'POST',
    body: { text: val },
  })

  await refresh()

  confirmation.value = nextResponse()
  if (confTimer) clearTimeout(confTimer)
  confTimer = setTimeout(() => { confirmation.value = '' }, 4500)

  prompt.value = ''
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusLabel(s: string) {
  return { queued: 'Queued', progress: 'In progress', done: 'Delivered' }[s] || s
}
</script>

<style scoped>
.page {
  min-height: 100dvh;
  background: #000;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  max-width: 1100px;
  margin: 0 auto;
}

/* ── HEADER ── */
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
  color: rgba(255,255,255,0.9);
}

.header-right {
  font-size: 0.65rem; font-weight: 400;
  color: rgba(255,255,255,0.3);
  text-align: right; line-height: 1.6;
}

/* ── BODY ── */
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ── LEFT PANEL ── */
.panel-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 52px 0 36px;
  flex-shrink: 0;
}

h1 {
  font-size: clamp(1.9rem, 5vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.1;
  text-align: center;
  margin-bottom: 32px;
  color: #fff;
}

/* ── INPUT PILL ── */
.pill-search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 480px;
  padding: 12px 10px 12px 18px;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 999px;
  cursor: text;
  transition: border-color 0.15s;
  background: #000;
}

.pill-search.focused { border-color: rgba(255,255,255,0.45); }

.search-icon { flex-shrink: 0; }

.pill-search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 400;
  color: #fff;
  caret-color: #fff;
  min-width: 0;
}

.pill-search input::placeholder { color: rgba(255,255,255,0.28); }

.pill-arrow {
  flex-shrink: 0;
  width: 30px; height: 30px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  cursor: default;
  transition: all 0.18s;
}

.pill-arrow.active {
  color: #fff;
  border-color: rgba(255,255,255,0.45);
  cursor: pointer;
}

.pill-arrow.active:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.7);
}

/* ── CONFIRMATION ── */
.confirmation {
  margin-top: 14px;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.3);
  letter-spacing: 0.03em;
  text-align: center;
  height: 1.1rem;
}

.conf-enter-active, .conf-leave-active { transition: opacity 0.3s ease; }
.conf-enter-from, .conf-leave-to { opacity: 0; }

/* ── AGENT (desktop, inside left panel) ── */
.agent {
  margin-top: auto;
  padding-top: 48px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}

/* ── DIVIDER ── */
.divider {
  border: none;
  border-top: 1px solid rgba(255,255,255,0.08);
  margin: 0 0 24px;
}

/* ── RECENT ── */
.panel-right { flex: 1; }

.recent { padding-top: 4px; }

.recent-header {
  font-size: 0.6rem; font-weight: 500;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(255,255,255,0.22);
  margin-bottom: 16px;
}

.prompt-list { display: flex; flex-direction: column; }

.prompt-item {
  display: flex;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.prompt-item:last-child { border-bottom: none; }

.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  margin-top: 6px; flex-shrink: 0;
}

.status-dot.queued   { background: rgba(255,255,255,0.2); }
.status-dot.progress { background: rgba(255,255,255,0.6); }
.status-dot.done     { background: #fff; }

.prompt-body { flex: 1; min-width: 0; }

.prompt-text {
  font-size: 0.88rem; font-weight: 400;
  color: rgba(255,255,255,0.85);
  line-height: 1.45;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.prompt-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }

.prompt-date { font-size: 0.62rem; color: rgba(255,255,255,0.2); }

.prompt-badge {
  font-size: 0.58rem; font-weight: 500;
  letter-spacing: 0.07em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px; border: 1px solid;
}

.prompt-badge.queued   { color: rgba(255,255,255,0.28); border-color: rgba(255,255,255,0.1); }
.prompt-badge.progress { color: rgba(255,255,255,0.6);  border-color: rgba(255,255,255,0.3); }
.prompt-badge.done     { color: #fff; border-color: rgba(255,255,255,0.45); }

.prompt-result {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
}

.prompt-result-label {
  font-size: 0.58rem; font-weight: 500;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(255,255,255,0.22);
  margin-bottom: 8px;
}

.prompt-result-img {
  width: 100%; border-radius: 6px;
  display: block;
}

.prompt-result-placeholder {
  font-size: 0.72rem;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.04em;
  padding: 8px 0;
}

.empty-state {
  padding: 32px 0;
}

.empty-state p {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.18);
  line-height: 1.8;
}

/* ── AGENT AVATAR ── */
.agent-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: #000;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.agent-avatar img { width: 100%; height: 100%; object-fit: cover; }

.agent-label {
  font-size: 0.58rem; font-weight: 400;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.1em;
}

/* ── MOBILE FOOTER ── */
footer {
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  padding: 28px 0 32px;
}

/* ── LIST ANIMATION ── */
.list-enter-active { transition: all 0.3s ease; }
.list-enter-from   { opacity: 0; transform: translateY(-6px); }

/* ── SHOW/HIDE by breakpoint ── */
.desktop-only { display: none; }
.mobile-only  { display: flex; }

/* ── DESKTOP ── */
@media (min-width: 768px) {
  .page { padding: 0 40px; }

  .body {
    flex-direction: row;
    gap: 60px;
    align-items: flex-start;
  }

  .panel-left {
    width: 360px;
    flex-shrink: 0;
    align-items: flex-start;
    position: sticky;
    top: 0;
    min-height: calc(100dvh - 56px);
    padding: 52px 0 36px;
  }

  .panel-left h1 { text-align: left; }
  .panel-left .pill-search { max-width: 100%; }
  .panel-left .confirmation { text-align: left; }

  .panel-right {
    flex: 1;
    padding-top: 52px;
    border-left: 1px solid rgba(255,255,255,0.08);
    padding-left: 48px;
    min-height: calc(100dvh - 56px);
  }

  .desktop-only { display: flex; }
  .mobile-only  { display: none; }

  .divider { display: none; }
}

@media (min-width: 1024px) {
  .page { max-width: 1100px; padding: 0 60px; }
  .panel-left { width: 400px; }
}
</style>
