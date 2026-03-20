import { useState, useEffect, useRef } from 'react'
import Button from './Button'
import AccountDropdown from './AccountDropdown'
import { sendMessage, getOrCreateChat } from '../server/chat'

interface ChatProps {
  onNavigate?: (src: string) => void
  hasProvider: boolean
  chatStatus: 'ready' | 'saving' | 'failed'
  welcomeMessage?: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat({ onNavigate, hasProvider, chatStatus, welcomeMessage }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [serverWelcome, setServerWelcome] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading || !chatId) return

    const userMessage: Message = { role: 'user', content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await sendMessage({ data: { chatId, messages: updatedMessages } })
      setMessages((prev) => [...prev, response])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
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
                msg.role === 'user'
                  ? 'bg-blue-600/20 text-blue-200 ml-4'
                  : 'bg-slate-800 text-gray-300 mr-4'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="text-sm px-3 py-2 rounded-lg bg-slate-800 text-gray-500 mr-4">
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            disabled={loading}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <Button type="submit" className="px-3 py-2 text-xs" disabled={loading}>
            Send
          </Button>
        </form>
      </>
    )
  }

  return (
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">Bub.ai</h2>
        <AccountDropdown onNavigate={onNavigate} />
      </div>
      {renderBody()}
    </aside>
  )
}
