// Cycles the browser-tab favicon through a few DEWD faces.
// Files live in /public/favicons. Add or remove ids here to change the set.
const FAVES = [78, 40, 222, 346, 300, 53]
const INTERVAL_MS = 2200

export default defineNuxtPlugin(() => {
  const urls = FAVES.map((n) => `/favicons/dewd-${n}.png`)

  // Preload so swaps are instant
  urls.forEach((u) => { const i = new Image(); i.src = u })

  let current: HTMLLinkElement | null = null
  const show = (href: string) => {
    // Browsers only reliably repaint the tab icon when the <link> element is replaced
    document.head.querySelectorAll('link[rel~="icon"]').forEach((el) => el.remove())
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    link.href = href
    document.head.appendChild(link)
    current = link
  }

  let i = Math.floor(Math.random() * urls.length)
  show(urls[i])

  // Respect reduced-motion: pick one face and leave it alone
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  setInterval(() => {
    i = (i + 1) % urls.length
    show(urls[i])
  }, INTERVAL_MS)
})
