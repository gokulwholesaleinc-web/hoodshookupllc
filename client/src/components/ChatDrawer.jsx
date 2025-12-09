import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../utils'

function ChatDrawer({ quoteId, quoteName, isOpen, onClose }) {
  const { token, user } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (isOpen && quoteId) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 5000) // Poll every 5s
      return () => clearInterval(interval)
    }
  }, [isOpen, quoteId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage.trim() })
      })
      if (res.ok) {
        setNewMessage('')
        fetchMessages()
      }
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:w-96 h-[80vh] sm:h-[600px] sm:mr-4 sm:mb-4 rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl modal-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Messages</h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{quoteName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = (isAdmin && msg.sender_type === 'admin') || (!isAdmin && msg.sender_type === 'customer')
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMine ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMine ? 'text-orange-200' : 'text-gray-400'}`}>
                      {formatDate(msg.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatDrawer
