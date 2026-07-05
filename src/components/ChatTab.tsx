/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Trash2, BookOpen, Clock, Shield, HelpCircle, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatTabProps {
  token: string;
  addToast: (msg: string, type: 'success' | 'warning' | 'error') => void;
}

export default function ChatTab({ token, addToast }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    { text: "What are the rules regarding returning books late?", icon: Shield },
    { text: "I need a cozy fantasy recommendation to de-stress.", icon: Sparkles },
    { text: "Do we have any technology or philosophy books?", icon: BookOpen },
    { text: "Explain standard loan limits and renewal counts.", icon: Clock }
  ];

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch('/api/chat/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      }
    } catch (err) {
      addToast("Failed to load chat history.", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    setInputMessage('');
    setLoading(true);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: 'msg-temp-user',
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: textToSend })
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data.history);
      } else {
        addToast(data.error || "Failed to send message.", "error");
        // Remove optimistic user message on failure
        setMessages(prev => prev.filter(m => m.id !== 'msg-temp-user'));
      }
    } catch (err) {
      addToast("Failed to reach conversational librarian server.", "error");
      setMessages(prev => prev.filter(m => m.id !== 'msg-temp-user'));
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your conversation history? This cannot be undone.")) return;

    try {
      const response = await fetch('/api/chat/history', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMessages([]);
        addToast("Chat history cleared.", "success");
      }
    } catch (err) {
      addToast("Failed to clear chat log.", "error");
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-800">LibrarySense Agent Chat</h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">Prompt-engineered academic assistant holding active catalog context</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-50/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
              <p className="text-sm text-slate-400 font-sans">Connecting to counselor memory logs...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6">
              <div className="p-4 rounded-full bg-emerald-50 border border-emerald-100">
                <Sparkles className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-slate-800">Meet Your Intelligent Librarian</h3>
                <p className="text-xs text-slate-400 mt-2 font-sans max-w-sm leading-relaxed mx-auto">
                  Ask questions regarding catalogs, borrow rules, overdue fines, academic reading guides, or requests for summarizing complex plots.
                </p>
              </div>

              {/* Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full pt-4">
                {suggestedPrompts.map((prompt, index) => {
                  const IconComp = prompt.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSend(prompt.text)}
                      className="flex items-start gap-3 p-4 bg-white border border-slate-200/60 rounded-2xl text-left hover:border-emerald-300 hover:bg-emerald-50/10 hover:shadow-xs transition-all cursor-pointer"
                    >
                      <IconComp className="w-4.5 h-4.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed font-sans">{prompt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id || index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                        isUser ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {isUser ? 'ME' : 'AI'}
                      </div>

                      {/* Bubble */}
                      <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed border ${
                        isUser 
                          ? 'bg-slate-900 text-white border-slate-950 font-sans' 
                          : 'bg-white text-slate-800 border-slate-200/80 shadow-xs'
                      }`}>
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          <div className="markdown-body font-sans text-slate-700 leading-relaxed select-text">
                            {/* Render basic custom paragraphs/bold, fallback if needed. The backend outputs clean Markdown. */}
                            {msg.text.split('\n').map((line, idx) => {
                              if (line.startsWith('### ')) {
                                return <h3 key={idx} className="font-display font-bold text-slate-850 mt-3 mb-1 text-sm">{line.replace('### ', '')}</h3>;
                              } else if (line.startsWith('## ')) {
                                return <h2 key={idx} className="font-display font-bold text-slate-850 mt-4 mb-2 text-md">{line.replace('## ', '')}</h2>;
                              } else if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ') || line.startsWith('5. ')) {
                                return <li key={idx} className="ml-4 list-decimal mb-1">{line.substring(3)}</li>;
                              } else if (line.startsWith('- ') || line.startsWith('* ')) {
                                return <li key={idx} className="ml-4 list-disc mb-1">{line.substring(2)}</li>;
                              } else if (line.trim() === "") {
                                return <div key={idx} className="h-1.5" />;
                              } else {
                                return <p key={idx} className="mb-2.5 leading-relaxed">{line}</p>;
                              }
                            })}
                          </div>
                        )}
                        <span className={`text-[9px] font-mono block text-right mt-1.5 ${isUser ? 'text-white/40' : 'text-slate-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Bot thinking bubble */}
              {loading && (
                <div className="flex justify-start animate-pulse">
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold bg-emerald-600 text-white">
                      AI
                    </div>
                    <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                      <span className="font-sans font-medium text-slate-400 ml-1">Formulating context-grounded response...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-white border-t border-slate-200 shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(inputMessage); }}
            className="max-w-3xl mx-auto flex gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything (e.g. 'Recommend a classic sci fi')"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-slate-800 font-sans"
              disabled={loading}
              required
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-3 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-200 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
