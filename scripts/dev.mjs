// Runs the API and the web app together with prefixed output. Ctrl+C stops both.
import { spawn, spawnSync } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

// The API imports the compiled shared package, so build it once up front.
const build = spawnSync(npm, ['run', 'build', '-w', '@riftroom/shared'], { stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)

const apps = [
  { name: 'api', color: '\x1b[35m', workspace: '@riftroom/api' },
  { name: 'web', color: '\x1b[36m', workspace: '@riftroom/web' },
]

const children = apps.map(({ name, color, workspace }) => {
  const child = spawn(npm, ['run', 'dev', '-w', workspace], {
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const prefix = `${color}[${name}]\x1b[0m `
  const forward = (target) => (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) target.write(prefix + line + '\n')
    }
  }
  child.stdout.on('data', forward(process.stdout))
  child.stderr.on('data', forward(process.stderr))
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`)
    shutdown(code ?? 0)
  })
  return child
})

let stopping = false
function shutdown(code) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  process.exitCode = code
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
