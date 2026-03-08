import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// When running from dist/, data is at ../src/data (dev) or shipped in the package
const candidates = [
  join(__dirname, 'data'),                    // src/data (dev via ts-node)
  join(__dirname, '..', 'src', 'data'),       // dist/ → src/data (built locally or npm installed)
]

export const dataDir = candidates.find((d) => existsSync(d)) ?? candidates[1]
