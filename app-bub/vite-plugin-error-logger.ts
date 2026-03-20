import { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const ERRORS_DIR = path.resolve(__dirname, 'errors')

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
}

function writeError(error: { type: string; message: string; source?: string; line?: number; col?: number; stack?: string }) {
  if (!fs.existsSync(ERRORS_DIR)) fs.mkdirSync(ERRORS_DIR, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const slug = sanitizeFilename(error.message.slice(0, 40))
  const filename = `${timestamp}_${error.type}_${slug}.md`

  const content = `# ${error.type}: ${error.message}

- **Time:** ${new Date().toISOString()}
- **Source:** ${error.source ?? 'unknown'}${error.line ? `:${error.line}:${error.col}` : ''}

## Stack
\`\`\`
${error.stack ?? 'N/A'}
\`\`\`
`

  fs.writeFileSync(path.join(ERRORS_DIR, filename), content)
}

export default function errorLogger(): Plugin {
  return {
    name: 'error-logger',
    apply: 'serve',

    configureServer(server) {
      server.middlewares.use('/__error', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const error = JSON.parse(body)
            writeError(error)
            console.error(`[error-logger] ${error.type}: ${error.message}`)
          } catch {
            // ignore malformed
          }
          res.statusCode = 200
          res.end('ok')
        })
      })
    },

    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'module' },
          children: `
(function() {
  function send(err) {
    fetch('/__error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(err),
    }).catch(() => {});
  }

  window.addEventListener('error', function(e) {
    send({
      type: 'uncaught-error',
      message: e.message,
      source: e.filename,
      line: e.lineno,
      col: e.colno,
      stack: e.error?.stack || '',
    });
  });

  window.addEventListener('unhandledrejection', function(e) {
    const reason = e.reason;
    send({
      type: 'unhandled-rejection',
      message: reason?.message || String(reason),
      stack: reason?.stack || '',
    });
  });

  const origError = console.error;
  console.error = function(...args) {
    origError.apply(console, args);
    send({
      type: 'console-error',
      message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
      stack: new Error().stack || '',
    });
  };
})();
`,
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}
