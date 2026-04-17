import { useEffect, useRef } from 'react';
import Message from './Message';
import './ChatWindow.css';

export default function ChatWindow({ messages, isStreaming }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="chat-window">
      {messages.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✨</span>
          <p className="empty-title">Start a conversation</p>
          <p className="empty-sub">Ask Gemma anything — it runs entirely on your machine.</p>
        </div>
      ) : (
        <div className="messages-list">
          {messages.map((msg, i) => (
            <Message
              key={i}
              role={msg.role}
              content={msg.content}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </main>
  );
}
