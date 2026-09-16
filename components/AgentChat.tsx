'use client';

import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { ChatMessage } from '@/lib/types';

interface AgentChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  isLoading?: boolean;
  onSelectSuggestion?: (text: string) => void;
  suggestions?: string[];
}

export const AgentChat: React.FC<AgentChatProps> = ({
  messages,
  onSendMessage,
  onRegenerate,
  isLoading = false,
  onSelectSuggestion,
  suggestions = [
    'Create a 20-second product promo for my new app.',
    'The intro is too slow. Make the captions larger and remove this style of background music.',
    'Create a promo for my new clothing brand.',
  ],
}) => {
  const [inputText, setInputText] = useState('');
  const hasUserSentMessage = messages.some((msg) => msg.sender === 'user');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col overflow-hidden h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-medium text-[var(--fg)]">Creative Agent</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-[var(--fg-muted)]">Creative Assistant · Ready</span>
            </div>
          </div>
        </div>

        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] transition-all duration-300 hover:rotate-180 active:scale-90"
          title="Regenerate current version"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[280px] max-h-[400px] bg-[var(--bg)]/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 animate-fadeIn ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-6 h-6 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)] shrink-0 mt-0.5 shadow-xs">
                <Sparkles className="w-3 h-3 animate-pulse-subtle" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed transition-all duration-200 ${
                msg.sender === 'user'
                  ? 'bg-[var(--surface-2)] text-[var(--fg)] shadow-xs rounded-tr-xs font-normal'
                  : 'bg-[var(--surface)] text-[var(--fg)] shadow-xs rounded-tl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div
                className={`mt-1 text-[9px] font-mono ${
                  msg.sender === 'user' ? 'text-[var(--fg-muted)] text-right' : 'text-[var(--fg-muted)]'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--fg-muted)] shrink-0 mt-0.5 shadow-xs">
                <User className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested Prompts (only shown before user sends first message) */}
      {!hasUserSentMessage && suggestions && suggestions.length > 0 && (
        <div className="px-3.5 py-2.5 bg-[var(--surface)] border-t border-[var(--border)]/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-muted)] font-medium">
              Suggested Prompts
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectSuggestion && onSelectSuggestion(suggestion)}
                className="text-left text-[11px] text-[var(--fg-soft)] hover:text-[var(--fg)] bg-[var(--surface-2)] hover:bg-[var(--surface-2)]/80 px-3 py-2 rounded-lg flex items-center justify-between group transition-all duration-200 hover:translate-x-1 active:scale-[0.99]"
              >
                <span className="truncate pr-2">{suggestion}</span>
                <ArrowRight className="w-3 h-3 text-[var(--fg-faint)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input Box */}
      <form onSubmit={handleSubmit} className="p-3 bg-[var(--surface)] border-t border-[var(--border)]/60">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Direct the creative agent or review revisions..."
            disabled={isLoading}
            className="flex-1 bg-[var(--bg)] rounded-lg px-3.5 py-2 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2 rounded-lg bg-[var(--accent-deep)] text-[#4a2c0e] hover:bg-[var(--accent)] disabled:opacity-30 font-medium shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
            title="Send prompt"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};
