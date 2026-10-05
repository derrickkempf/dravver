<template>
  <main class="page">
    <header class="head">
      <DewdLogo :size="72" class="logo" />
      <h1>Drawn</h1>
      <p class="sub">Everything that's made it out of the notebook.</p>
    </header>

    <p v-if="!drawings.length" class="empty">Nothing drawn yet. The notebook is thinking about it.</p>

    <ul v-else class="grid">
      <li v-for="(d, i) in drawings" :key="d.id">
        <button class="tile" type="button" :aria-label="`Open drawing: ${d.text}`" @click="open(i, $event)">
          <span class="frame"><img :src="d.drawing!" :alt="d.text" loading="lazy" /></span>
          <span class="cap">{{ d.text }}</span>
        </button>
      </li>
    </ul>

    <!-- Persistent back button -->
    <nav v-show="active === null" class="back-bar" aria-label="Back">
      <NuxtLink to="/" class="back-btn">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        <span>Back home</span>
      </NuxtLink>
    </nav>

    <!-- Lightbox -->
    <Transition name="lb">
      <div v-if="active !== null" class="lb" @click.self="close">
        <div
          ref="lbEl"
          class="lb-inner"
          role="dialog"
          aria-modal="true"
          :aria-label="current?.text"
          tabindex="-1"
          @keydown.esc="close"
          @keydown.left.prevent="step(-1)"
          @keydown.right.prevent="step(1)"
          @click.self="close"
        >
          <button class="lb-close" type="button" aria-label="Close" @click="close">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>

          <button v-if="drawings.length > 1" class="lb-nav prev" type="button" aria-label="Previous drawing" @click="step(-1)">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>

          <figure v-if="current">
            <img :src="current.drawing!" :alt="current.text" />
            <figcaption>{{ current.text }}</figcaption>
          </figure>

          <button v-if="drawings.length > 1" class="lb-nav next" type="button" aria-label="Next drawing" @click="step(1)">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
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

useHead({ title: 'Drawn · dravver' })

const { data, refresh } = await useFetch<Prompt[]>('/api/prompts')
const drawings = computed(() => (data.value || []).filter(p => !!p.drawing))

const active = ref<number | null>(null)
const lbEl = ref<HTMLElement | null>(null)
const current = computed(() => (active.value === null ? null : drawings.value[active.value] ?? null))
let opener: HTMLElement | null = null

async function open(i: number, e?: Event) {
  opener = (e?.currentTarget as HTMLElement) ?? null
  active.value = i
  document.body.style.overflow = 'hidden'
  await nextTick()
  lbEl.value?.focus()
}
function close() {
  active.value = null
  document.body.style.overflow = ''
  opener?.focus()
}
function step(dir: number) {
  if (active.value === null || !drawings.value.length) return
  const n = drawings.value.length
  active.value = (active.value + dir + n) % n
}

onMounted(() => { refresh() })
onBeforeUnmount(() => { document.body.style.overflow = '' })
</script>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  max-width: var(--form-width);
  margin: 0 auto;
  padding: 0 var(--space-lg) calc(120px + env(safe-area-inset-bottom, 0px));
  background: var(--color-bg);
}

.head {
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
.sub { color: var(--color-muted); line-height: 1.55; }
.empty { text-align: center; color: var(--color-muted); padding: var(--space-xl) 0; }

/* Two columns */
.grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-lg) var(--space-md);
}
.tile {
  display: block;
  width: 100%;
  text-align: left;
  cursor: zoom-in;
}
.frame {
  display: block;
  aspect-ratio: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.frame img { display: block; width: 100%; height: 100%; object-fit: contain; }
.tile:hover .frame { border-color: var(--color-fg); transform: translateY(-2px); }
.tile:focus-visible { outline: 2px solid var(--color-fg); outline-offset: 4px; border-radius: var(--radius-md); }
.cap {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: var(--space-sm);
  font-size: var(--font-size-sm);
  line-height: 1.4;
  color: var(--color-muted);
}

/* Persistent back button */
.back-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  justify-content: center;
  padding: var(--space-lg) var(--space-lg) calc(var(--space-lg) + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
  background: linear-gradient(to top, var(--color-bg) 35%, rgba(255, 255, 255, 0));
}
.back-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 var(--space-lg);
  font-size: var(--font-size-base);
  font-weight: var(--fw-bold);
  color: var(--color-bg);
  background: var(--color-fg);
  border: 2px solid var(--color-fg);
  border-radius: var(--radius-pill);
  box-shadow: 0 6px 20px rgba(0, 0, 0, .12);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.back-btn:hover { background: var(--color-bg); color: var(--color-fg); }
.back-btn:active { transform: translateY(1px); }

/* Lightbox */
.lb {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, .86);
}
.lb-inner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: 64px var(--space-md) calc(var(--space-lg) + env(safe-area-inset-bottom, 0px));
  outline: none;
}
.lb figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  flex: 1 1 auto;
  width: min(100%, 1100px);
  min-width: 0;
}
.lb img {
  display: block;
  width: 100%;            /* scale up to fill, so "larger" is actually larger */
  height: auto;
  max-height: calc(100dvh - 190px);
  object-fit: contain;
  background: #fff;
  border-radius: var(--radius-md);
}
.lb figcaption {
  max-width: 60ch;
  text-align: center;
  font-size: var(--font-size-base);
  line-height: 1.4;
  color: #fff;
}
.lb-close, .lb-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: #fff;
  background: rgba(255, 255, 255, .12);
  border-radius: 50%;
  flex-shrink: 0;
  transition: background var(--dur-fast) var(--ease-out);
}
.lb-close:hover, .lb-nav:hover { background: rgba(255, 255, 255, .24); }
.lb-close { position: absolute; top: calc(12px + env(safe-area-inset-top, 0px)); right: 12px; }

@media (max-width: 560px) {
  /* On phones the arrows float over the bottom corners so the image keeps full width */
  .lb-nav { position: absolute; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
  .lb-nav.prev { left: 16px; }
  .lb-nav.next { right: 16px; }
  .lb img { max-height: calc(100dvh - 230px); }
}

.lb-enter-active, .lb-leave-active { transition: opacity var(--dur-base) var(--ease-out); }
.lb-enter-from, .lb-leave-to { opacity: 0; }
</style>
