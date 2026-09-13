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
    <div className="flex flex-col h-full bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d0a08] border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-[#1e1510] border border-[#c88d51]/30 flex items-center justify-center text-[#dda15e]">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#dda15e] border-2 border-[#0d0a08]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-white tracking-tight">Livepeer Agent</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1e1510] text-[#dda15e] border border-[#c88d51]/25">
                MCP Creative
              </span>
            </div>
            <p className="text-[10px] text-[#ab9482] font-mono">Decentralized Video Execution Layer</p>
          </div>
        </div>

        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#18120e] hover:bg-[#241a14] text-[#dda15e] border border-[#c88d51]/30 text-xs font-medium transition disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Regenerate</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 text-xs ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-6 h-6 rounded-md bg-[#1e1510] border border-[#c88d51]/30 flex items-center justify-center shrink-0 text-[#dda15e] mt-0.5">
                <Bot className="w-3 h-3 text-[#c88d51]" />
              </div>
            )}

            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#241a14] text-[#fbf7ee] border border-[#9c4e1f]/35 rounded-br-xs'
                  : 'bg-[#120e0b] border border-white/10 text-[#f5f2eb] rounded-bl-xs'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.versionNumber && (
                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#dda15e] font-mono">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#c88d51]" />
                    <span>Livepeer Render: v{msg.versionNumber}</span>
                  </div>
                  <span className="text-[#ab9482] text-[10px]">MCP Tool Completed</span>
                </div>
              )}

              <span className="block text-[9px] text-[#ab9482] font-mono text-right mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 rounded-md bg-[#241a14] border border-[#9c4e1f]/35 flex items-center justify-center shrink-0 text-[#dda15e] mt-0.5">
                <User className="w-3 h-3 text-[#c88d51]" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested Demo Prompts */}
      <div className="px-4 py-2.5 bg-[#0b0806] border-t border-white/5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#ab9482] font-medium">
            Demo Scenarios &amp; Revisions
          </span>
          <span className="text-[9px] font-mono text-[#786152]">Quick Presets</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSelectSuggestion && onSelectSuggestion(suggestion)}
              className="text-left text-xs text-[#cbbba8] hover:text-[#fbf7ee] bg-[#140e0b] hover:bg-[#201712] px-3 py-1.5 rounded-xl border border-white/5 hover:border-[#c88d51]/30 flex items-center justify-between group transition"
            >
              <span className="truncate pr-2">{suggestion}</span>
              <ArrowRight className="w-3 h-3 text-[#ab9482] group-hover:text-[#dda15e] group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#0d0a08] border-t border-white/5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Direct the creative agent or review revisions..."
            disabled={isLoading}
            className="flex-1 bg-[#140e0b] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#786152] focus:outline-none focus:border-[#c88d51] transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2 rounded-xl bg-[#fbf7ee] text-[#140e0b] hover:bg-[#ede4d1] disabled:opacity-30 font-semibold shadow-sm transition flex items-center justify-center shrink-0"
            title="Send prompt"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};

