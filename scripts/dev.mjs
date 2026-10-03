import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 一条命令同时起后端和前端：
 *   npm run dev  ->  接口 http://localhost:3000，页面 http://localhost:5173
 * 打开 5173 就行，前端的 /api 和 /uploads 会自动转发到 3000。
 */
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

const children = []

function start(label, script) {
  // Windows 下要通过 shell 才能执行 npm，这里传整条命令字符串（传数组会触发弃用警告）
  const child = spawn(`npm run ${script}`, { cwd: root, stdio: 'inherit', shell: true })
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[dev] ${label} 退出，状态码 ${code}`)
      stopAll(code)
    }
  })
  children.push(child)
}

function stopAll(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  process.exit(code)
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))

console.log('[dev] 后端 http://localhost:3000  ·  前端 http://localhost:5173')
start('server', 'dev:server')
start('web', 'dev:web')
