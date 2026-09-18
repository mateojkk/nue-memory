'use client';

import React, { useState, useRef } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, ArrowRight, ImagePlus, X } from 'lucide-react';
import { ChatMessage } from '@/lib/types';

interface AgentChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, imageUrl?: string) => void;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUserSentMessage = messages.some((msg) => msg.sender === 'user');

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.88);
            setSelectedImage(compressed);
            return;
          }
        }
        setSelectedImage(result);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.items) {
      const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
      if (item) {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || isLoading) return;
    const promptToSend = inputText.trim() || 'Animate and bring this image to life with cinematic motion and depth.';
    onSendMessage(promptToSend, selectedImage || undefined);
    setInputText('');
    setSelectedImage(null);
    setImageFileName(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col overflow-hidden h-full transition-all ${
        isDragging ? 'ring-2 ring-[var(--accent)] bg-[var(--surface-2)]/50' : ''
      }`}
    >
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
              {msg.imageUrl && (
                <div className="mb-2 overflow-hidden rounded-xl border border-[var(--border)] max-w-[260px] bg-black/20">
                  <img
                    src={msg.imageUrl}
                    alt="Chat attachment"
                    className="w-full h-auto max-h-[180px] object-cover"
                  />
                </div>
              )}
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

      {/* Image Preview Chip Above Input */}
      {selectedImage && (
        <div className="px-3 pt-2.5 pb-1 bg-[var(--surface)] border-t border-[var(--border)]/60 flex items-center gap-2.5 animate-fadeIn">
          <div className="relative group rounded-lg overflow-hidden border border-[var(--border)] w-12 h-12 bg-black/30 shrink-0">
            <img src={selectedImage} alt="Attachment preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                setImageFileName(null);
              }}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/80 text-white hover:bg-red-600 transition-colors"
              title="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-[var(--fg)] truncate">
              {imageFileName || 'Image attached'}
            </p>
            <p className="text-[10px] text-[var(--fg-muted)] truncate">
              Ready for image animation and creative direction
            </p>
          </div>
        </div>
      )}

      {/* Message Input Box */}
      <form onSubmit={handleSubmit} className="p-3 bg-[var(--surface)] border-t border-[var(--border)]/60">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processImageFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-2 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-2)] disabled:opacity-40 transition-colors shrink-0"
            title="Upload picture to animate"
          >
            <ImagePlus className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPaste={handlePaste}
            placeholder={selectedImage ? "Direct how to animate this picture..." : "Direct the creative agent or review revisions..."}
            disabled={isLoading}
            className="flex-1 bg-[var(--bg)] rounded-lg px-3.5 py-2 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] transition-all"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isLoading}
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
