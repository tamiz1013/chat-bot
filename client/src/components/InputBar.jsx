import { useState, useRef, useEffect } from 'react';
import './InputBar.css';

export default function InputBar({ onSend, onStop, isStreaming }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [text]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <footer className="input-bar">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Gemma… (Enter to send, Shift+Enter for newline)"
          rows={1}
          disabled={isStreaming}
        />
        <button
          className={`send-btn ${isStreaming ? 'stop' : ''}`}
          onClick={isStreaming ? onStop : handleSubmit}
          disabled={!isStreaming && !text.trim()}
          aria-label={isStreaming ? 'Stop' : 'Send'}
        >
          {isStreaming ? (
            <StopIcon />
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
      <p className="input-hint">
        Gemma runs locally on your machine · No data leaves your device
      </p>
    </footer>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}
