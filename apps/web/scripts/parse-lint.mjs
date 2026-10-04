import { execSync } from 'node:child_process'

let out = ''
try {
  out = execSync('corepack pnpm lint 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
} catch (e) {
  out = (e.stdout || '') + (e.stderr || '')
}
const lines = out.split(/\r?\n/)
let file = ''
for (const line of lines) {
  if (line.startsWith('D:')) {
    file = line.replace(/^.*apps\.web\.src\./, 'src/').replace(/\\/g, '/')
  }
  const m = line.match(/^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s{2,}([@a-z/-]+)\s*$/)
  if (m) console.log(`${file}:${m[1]} [${m[3]}] ${m[4]} (${m[5]})`)
}
