interface ChatMessageProps {
  content: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(text: string): string {
  // First, extract code blocks and replace with placeholders
  const codeBlocks: string[] = []
  let processed = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(`<pre class="bg-slate-900 rounded p-2 my-1 overflow-x-auto"><code>${escapeHtml(code)}</code></pre>`)
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`
  })

  // Extract inline code
  const inlineCodes: string[] = []
  processed = processed.replace(/`([^`]+)`/g, (_, code) => {
    inlineCodes.push(`<code class="bg-slate-900 px-1 rounded text-blue-300">${escapeHtml(code)}</code>`)
    return `%%INLINE_${inlineCodes.length - 1}%%`
  })

  // Escape remaining HTML
  processed = escapeHtml(processed)

  // Apply markdown formatting
  processed = processed
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold mt-2 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-2 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold text-lg mt-2 mb-1">$1</h1>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="border-slate-700 my-2" />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="my-1">')
    // Single newlines
    .replace(/\n/g, '<br />')

  // Wrap consecutive <li> in <ul> or <ol>
  // Unordered lists: lines starting with "- "
  processed = processed.replace(/((?:^|- )(.+?)(?:<br \/>|$))+/gm, (match) => {
    // This regex approach is fragile, let's do it differently
    return match
  })

  // Better approach: process line by line after the initial transforms
  // Replace list items with markers, then wrap groups
  processed = processed
    .replace(/^- (.+)$/gm, '%%UL_ITEM%%$1%%/UL_ITEM%%')
    .replace(/^\d+\. (.+)$/gm, '%%OL_ITEM%%$1%%/OL_ITEM%%')

  // Wrap consecutive UL items
  processed = processed.replace(/(%%UL_ITEM%%[\s\S]*?%%\/UL_ITEM%%(?:<br \/>)?)+/g, (match) => {
    const items = match.match(/%%UL_ITEM%%([\s\S]*?)%%\/UL_ITEM%%/g) || []
    const lis = items.map((item) => {
      const content = item.replace(/%%\/?UL_ITEM%%/g, '')
      return `<li class="ml-4 list-disc">${content}</li>`
    }).join('')
    return `<ul class="mb-4 last:mb-0">${lis}</ul>`
  })

  // Wrap consecutive OL items
  processed = processed.replace(/(%%OL_ITEM%%[\s\S]*?%%\/OL_ITEM%%(?:<br \/>)?)+/g, (match) => {
    const items = match.match(/%%OL_ITEM%%([\s\S]*?)%%\/OL_ITEM%%/g) || []
    const lis = items.map((item) => {
      const content = item.replace(/%%\/?OL_ITEM%%/g, '')
      return `<li class="ml-4 list-decimal">${content}</li>`
    }).join('')
    return `<ol class="mb-4 last:mb-0">${lis}</ol>`
  })

  // Clean up any remaining markers
  processed = processed.replace(/%%\/?[A-Z_]+%%/g, '')

  // Restore code blocks and inline code
  processed = processed.replace(/%%CODEBLOCK_(\d+)%%/g, (_, i) => codeBlocks[parseInt(i)])
  processed = processed.replace(/%%INLINE_(\d+)%%/g, (_, i) => inlineCodes[parseInt(i)])

  return processed
}

export default function ChatMessage({ content }: ChatMessageProps) {
  return (
    <div
      className="[&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0"
      dangerouslySetInnerHTML={{ __html: `<p class="my-1">${renderMarkdown(content)}</p>` }}
    />
  )
}
