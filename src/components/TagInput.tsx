import React, { useState, useRef, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function TagInput({ value, onChange, suggestions = [], placeholder, className = "" }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tags = (value || '').split(',').map(t => t.trim()).filter(Boolean);

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    
    // Prevent duplicate exact tags (case-insensitive)
    if (!tags.some(t => t.toUpperCase() === trimmed.toUpperCase())) {
      const newTags = [...tags, trimmed.toUpperCase()];
      onChange(newTags.join(', '));
    }
    
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      e.stopPropagation();
      if (inputValue.trim()) {
        handleAddTag(inputValue.trim());
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      handleRemoveTag(tags.length - 1);
    }
  };

  const filteredSuggestions = suggestions
    .filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.some(t => t.toLowerCase() === s.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="w-full relative">
      <div 
        className={`flex flex-wrap gap-2 w-full bg-white border rounded-xl px-3 py-2 min-h-[46px] items-center focus-within:ring-2 transition-all cursor-text ${className}`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, idx) => (
          <span key={idx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold uppercase shadow-sm border border-slate-200/60 transition-all hover:bg-slate-200">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemoveTag(idx); }}
              className="text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 p-0.5 transition-colors ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // When blurring, if there is valid text, we can try to add it.
            // Using a slight timeout helps to avoid conflicts with suggestion clicks.
            setTimeout(() => {
              setShowSuggestions(false);
            }, 250);
          }}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm font-bold uppercase text-slate-700 placeholder-slate-400"
          placeholder={tags.length === 0 ? placeholder : ''}
          enterKeyHint="enter"
        />
        {inputValue.trim() && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleAddTag(inputValue);
            }}
            className="ml-auto inline-flex items-center justify-center p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shadow-sm border border-indigo-200 hover:bg-indigo-100 active:bg-indigo-200 transition-colors"
            title="Adicionar"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
          {filteredSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevents input blur
              }}
              onClick={() => handleAddTag(suggestion)}
              className="w-full text-left px-4 py-3 text-sm font-bold uppercase text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:pl-5 transition-all outline-none border-b border-slate-50 last:border-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
