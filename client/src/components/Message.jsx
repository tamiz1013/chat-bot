import './Message.css';

export default function Message({ role, content, isStreaming }) {
  const isUser = role === 'user';
  const isError = role === 'error';

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      <div className={`avatar ${isUser ? 'avatar-user' : 'avatar-ai'}`}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div className={`bubble ${isUser ? 'bubble-user' : isError ? 'bubble-error' : 'bubble-ai'}`}>
        {content ? (
          <p className="bubble-text">{content}</p>
        ) : isStreaming ? null : (
          <p className="bubble-text empty-content">...</p>
        )}
        {isStreaming && (
          <span className="cursor-blink" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
