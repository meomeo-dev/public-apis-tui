import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const inputPath = resolve(process.argv[2] ?? join(process.cwd(), 'summary/news-flash.json'))
const outPath = resolve(process.argv[3] ?? join(process.cwd(), 'summary/news-flash.txt'))
const payload = JSON.parse(await readFile(inputPath, 'utf8'))
const flash = payload.flash ?? payload
const items = Array.isArray(flash.items) ? flash.items : []
const lines = []

lines.push(`# ${flash.headline ?? 'Public APIs 快讯'}`)
lines.push('')
lines.push(`生成时间: ${payload.generated_at ?? new Date().toISOString()}`)
lines.push(`快讯时间: ${flash.briefing_time ?? '未知'}`)
lines.push(`来源: ${flash.source_operation ?? 'unknown'}`)
lines.push(`状态: ${flash.status ?? 'unknown'}`)
lines.push('')
lines.push('## 要点')
lines.push('')

if (items.length === 0) {
  lines.push('- 暂无可展示条目。')
} else {
  for (const [index, item] of items.entries()) {
    lines.push(`${index + 1}. ${item.title}`)
    lines.push(`   来源: ${item.source} · ${item.published_at}`)
    lines.push(`   摘要: ${item.summary}`)
    lines.push(`   影响: ${item.why_it_matters}`)
    lines.push(`   链接: ${item.url}`)
    lines.push('')
  }
}

lines.push('## 观察清单')
const watchlist = Array.isArray(flash.watchlist) ? flash.watchlist : []
if (watchlist.length === 0) lines.push('- 无')
else for (const item of watchlist) lines.push(`- ${item}`)
lines.push('')
lines.push('## 下一步')
lines.push(flash.next_action ?? '继续观察。')
lines.push('')

await mkdir(dirname(outPath), { recursive: true })
await writeFile(outPath, lines.join('\n'), 'utf8')
console.log(JSON.stringify({ outPath, headline: flash.headline ?? 'Public APIs 快讯', itemCount: items.length }, null, 2))
