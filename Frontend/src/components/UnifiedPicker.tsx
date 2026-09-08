import React, { useState, useRef, useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { GifPicker, Theme } from 'gif-picker-react';
import { Giphy } from 'gif-picker-react/providers/giphy';
import './UnifiedPicker.css';

interface UnifiedPickerProps {
  onEmojiSelect: (emoji: any) => void;
  onGifSelect: (gif: any) => void;
  disabled?: boolean;
}

export function UnifiedPicker({ onEmojiSelect, onGifSelect, disabled = false }: UnifiedPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'emoji' | 'gif'>('emoji');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmojiClick = (emoji: any) => {
    onEmojiSelect(emoji);
  };

  const handleGifClick = (gif: any) => {
    onGifSelect(gif);
    setIsOpen(false);
  };

  return (
    <div ref={pickerRef} className="unified-picker-container">
      <button
        type="button"
        className="icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        title="Add Emoji or GIF"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>

      {isOpen && (
        <div className="unified-picker-popup">
          <div className="picker-tabs">
            <button
              type="button"
              className={`picker-tab ${activeTab === 'emoji' ? 'active' : ''}`}
              onClick={() => setActiveTab('emoji')}
            >
              Emoji
            </button>
            <button
              type="button"
              className={`picker-tab ${activeTab === 'gif' ? 'active' : ''}`}
              onClick={() => setActiveTab('gif')}
            >
              GIFs
            </button>
          </div>
          <div className="picker-content">
            {activeTab === 'emoji' ? (
              <Picker data={data} onEmojiSelect={handleEmojiClick} theme="dark" />
            ) : (
              <GifPicker 
                provider={Giphy(import.meta.env.VITE_GIPHY_API_KEY || "")} 
                onGifClick={handleGifClick} 
                theme={Theme.DARK} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
