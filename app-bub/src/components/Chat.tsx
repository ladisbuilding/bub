import { useState, useEffect, useRef, useCallback } from 'react'
import { SendHorizonal, Paperclip } from 'lucide-react'
import ChatMessage from './ChatMessage'
import AccountDropdown from './AccountDropdown'
import { sendMessage, getOrCreateChat } from '../server/chat'
import { uploadImage } from '../server/upload'

interface ChatProps {
  onNavigate?: (src: string) => void
  hasProvider: boolean
  chatStatus: 'ready' | 'saving' | 'failed'
  welcomeMessage?: string | null
  activeProjectId?: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  activeProject?: string | null
  imageUrl?: string
  queued?: boolean
}

export default function Chat({ onNavigate, hasProvider, chatStatus, welcomeMessage, activeProjectId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [serverWelcome, setServerWelcome] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [queue, setQueue] = useState<string[]>([])
  const processingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Image too large. Max size is 10MB.' }])
      return
    }

    setUploading(true)
    setMessages((prev) => [...prev, { role: 'user', content: `Uploading ${file.name}...`, imageUrl: URL.createObjectURL(file) }])

    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.readAsDataURL(file)
      })

      const result = await uploadImage({
        data: {
          projectId: activeProjectId || undefined,
          fileName: file.name,
          contentType: file.type,
          base64,
        },
      })

      setMessages((prev) => {
        const updated = [...prev]
        const uploadIdx = updated.findLastIndex((m) => m.content.includes(`Uploading ${file.name}`))
        if (uploadIdx >= 0) {
          updated[uploadIdx] = { role: 'user', content: file.name, imageUrl: URL.createObjectURL(file) }
        }
        if (result.projectId) {
          updated.push({ role: 'assistant', content: `Uploaded **${result.name}** (${(result.size / 1024).toFixed(0)} KB). You can now use this image in your project.` })
        } else {
          updated.push({ role: 'assistant', content: `Uploaded **${result.name}** (${(result.size / 1024).toFixed(0)} KB). Which project would you like to add this image to?` })
        }
        return updated
      })
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to upload image. Please try again.' }])
    } finally {
      setUploading(false)
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!hasProvider) return
    getOrCreateChat().then((data) => {
      setChatId(data.chatId)
      if (data.messages.length > 0) {
        setMessages(data.messages as Message[])
      }
      if (data.welcomeMessage) {
        setServerWelcome(data.welcomeMessage)
      }
      setHistoryLoaded(true)
    }).catch(() => setHistoryLoaded(true))
  }, [hasProvider])

  useEffect(() => {
    const msg = welcomeMessage ?? serverWelcome ?? null
    if (msg && historyLoaded) {
      setMessages((prev) => {
        if (prev.some((m) => m.content === msg)) return prev
        return [{ role: 'assistant', content: msg }, ...prev]
      })
    }
  }, [welcomeMessage, serverWelcome, historyLoaded])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function processMessage(text: string) {
    // Mark as no longer queued (if it was queued) or add as new
    setMessages((prev) => {
      const queuedIdx = prev.findIndex((m) => m.queued && m.content === text)
      if (queuedIdx >= 0) {
        const updated = [...prev]
        updated[queuedIdx] = { ...updated[queuedIdx], queued: false }
        return updated
      }
      return [...prev, { role: 'user', content: text }]
    })
    setLoading(true)

    try {
      const currentMessages = await new Promise<Message[]>((resolve) => {
        setMessages((prev) => {
          resolve(prev)
          return prev
        })
      })
      const response = await sendMessage({ data: { chatId: chatId!, messages: currentMessages } })
      setMessages((prev) => {
        const updated = [...prev, { role: response.role as 'assistant', content: response.content, activeProject: response.activeProject }]
        if (response.memorySaved) {
          updated.push({ role: 'assistant', content: '🧠 *I\'ve saved this conversation to memory so I can reference it later.*' })
        }
        return updated
      })
      if (response.navigateTo) {
        onNavigate?.(response.navigateTo)
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  // Process queue sequentially
  useEffect(() => {
    if (queue.length === 0 || processingRef.current || !chatId) return

    processingRef.current = true
    const next = queue[0]
    setQueue((q) => q.slice(1))

    processMessage(next).finally(() => {
      processingRef.current = false
    })
  }, [queue, loading, chatId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !chatId) return

    const text = input.trim()
    setInput('')

    if (loading || processingRef.current) {
      // Queue it — show as queued in chat
      setMessages((prev) => [...prev, { role: 'user', content: text, queued: true } as any])
      setQueue((q) => [...q, text])
    } else {
      processMessage(text)
    }
  }

  function renderBody() {
    if (chatStatus === 'saving') {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-gray-400 text-sm">Updating settings...</p>
        </div>
      )
    }

    if (chatStatus === 'failed' || !hasProvider) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-3">
              {chatStatus === 'failed'
                ? 'Invalid API key. Please try again.'
                : 'Set up an AI provider to start chatting'}
            </p>
            <button
              className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 transition-colors"
              onClick={() => onNavigate?.('/settings')}
            >
              Go to Settings
            </button>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && historyLoaded && (
            <p className="text-sm text-gray-500 text-center mt-8">Start a conversation</p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm px-3 py-2 rounded-lg ${
                msg.queued
                  ? 'bg-blue-600/10 text-blue-300/60 ml-4 italic'
                  : msg.role === 'user'
                    ? 'bg-blue-600/20 text-blue-200 ml-4'
                    : 'bg-slate-800 text-gray-300 mr-4'
              }`}
            >
              {msg.queued && (
                <span className="text-xs text-blue-400/50 block mb-0.5">queued</span>
              )}
              {msg.role === 'assistant' && msg.activeProject && (
                <span className="inline-block text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded mb-1">
                  {msg.activeProject}
                </span>
              )}
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="" className="rounded max-h-32 mb-1" />
              )}
              {msg.role === 'assistant' ? (
                <ChatMessage content={msg.content} />
              ) : (
                !msg.imageUrl && msg.content
              )}
            </div>
          ))}
          {loading && (
            <div className="text-sm px-3 py-2 rounded-lg bg-slate-800 text-gray-500 mr-4">
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            disabled={uploading || loading}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = '38px'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
            placeholder="Message..."
            rows={1}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
            style={{ minHeight: '38px', maxHeight: '120px' }}
            ref={(el) => {
              if (el) {
                el.style.height = '38px'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }
            }}
          />
          <button
            type="submit"
            className="cursor-pointer self-end w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors shrink-0"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        </form>
      </>
    )
  }

  return (
    <aside
      className="w-80 flex flex-col bg-slate-900/50"
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const file = e.dataTransfer.files[0]
        if (file?.type.startsWith('image/')) {
          handleFileUpload(file)
        }
      }}
    >
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">Bub.ai</h2>
        <AccountDropdown onNavigate={onNavigate} />
      </div>
      {renderBody()}
    </aside>
  )
}
