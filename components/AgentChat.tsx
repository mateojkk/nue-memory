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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="rounded-2xl bg-white border border-[#e7e2da] shadow-sm flex flex-col overflow-hidden h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-[#faf6f0] border-b border-[#e7e2da] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#f5ece4] border border-[#e2d5c5] flex items-center justify-center text-[#9c4e1f]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-medium text-[#18120e]">Livepeer Creative Agent</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono text-[#786152]">MCP Connected · MemWal Active</span>
            </div>
          </div>
        </div>

        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="p-1.5 rounded-md text-[#786152] hover:text-[#18120e] hover:bg-white transition border border-transparent hover:border-[#e2d5c5]"
          title="Regenerate current version"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[260px] max-h-[360px] bg-white">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-6 h-6 rounded-md bg-[#f5ece4] border border-[#e2d5c5] flex items-center justify-center text-[#9c4e1f] shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#1a120c] text-white shadow-2xs font-medium'
                  : 'bg-[#faf6f0] border border-[#e7e2da] text-[#18120e]'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div
                className={`mt-1 text-[9px] font-mono ${
                  msg.sender === 'user' ? 'text-stone-400 text-right' : 'text-[#786152]'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-md bg-[#1a120c] flex items-center justify-center text-white shrink-0 mt-0.5">
                <User className="w-3 h-3" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested Demo Prompts */}
      <div className="px-4 py-3 bg-[#faf6f0] border-t border-[#e7e2da]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#786152] font-medium">
            Demo Scenarios &amp; Revisions
          </span>
          <span className="text-[9px] font-mono text-[#9c4e1f] font-medium">Quick Presets</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSelectSuggestion && onSelectSuggestion(suggestion)}
              className="text-left text-xs text-[#18120e] hover:text-[#9c4e1f] bg-white hover:bg-[#f5ece4] px-3 py-2 rounded-md border border-[#e7e2da] hover:border-[#c88d51]/50 flex items-center justify-between group transition shadow-2xs"
            >
              <span className="truncate pr-2 font-medium">{suggestion}</span>
              <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-[#9c4e1f] group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-[#e7e2da]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Direct the creative agent or review revisions..."
            disabled={isLoading}
            className="flex-1 bg-[#faf6f0] border border-[#e7e2da] rounded-md px-4 py-2 text-xs text-[#18120e] placeholder-[#786152] focus:outline-none focus:border-[#c88d51] focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-md bg-[#1a120c] text-white hover:bg-[#281c15] disabled:opacity-30 font-medium shadow-sm transition flex items-center justify-center shrink-0"
            title="Send prompt"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};
