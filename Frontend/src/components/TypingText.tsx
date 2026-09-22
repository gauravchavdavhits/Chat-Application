import React, { useState, useEffect } from 'react';

interface TypingTextProps {
  phrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  className?: string;
}

export const TypingText: React.FC<TypingTextProps> = ({
  phrases,
  typingSpeed = 80,
  deletingSpeed = 45,
  pauseDuration = 1600,
  className = '',
}) => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Respect prefers-reduced-motion: display full phrase statically
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setDisplayedText(phrases[0] || '');
      return;
    }

    const currentPhrase = phrases[phraseIndex] || '';

    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      // Typing phase
      if (displayedText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setDisplayedText(currentPhrase.substring(0, displayedText.length + 1));
        }, typingSpeed);
      } else {
        // Pausing after typing
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      }
    } else {
      // Deleting phase
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText(currentPhrase.substring(0, displayedText.length - 1));
        }, deletingSpeed);
      } else {
        // Move to next phrase
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  return (
    <span className={`typing-wrapper ${className}`}>
      <span className="typing-text-content">{displayedText}</span>
      <span className="typing-cursor" aria-hidden="true" />
    </span>
  );
};
