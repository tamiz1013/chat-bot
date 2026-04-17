(function () {
  'use strict';

  const CONFIG = window.CHATBOT_CONFIG || {};
  const API_KEY = CONFIG.apiKey || '';
  const SERVER = (CONFIG.serverUrl || '').replace(/\/$/, '');
  const POSITION = CONFIG.position || 'bottom-right';
  const PRIMARY_COLOR = CONFIG.primaryColor || '#7c6af7';

  if (!API_KEY || !SERVER) {
    console.error('[ChatBot Widget] Missing apiKey or serverUrl in CHATBOT_CONFIG');
    return;
  }

  let sessionId = sessionStorage.getItem('cb_session') || '';
  let isOpen = false;
  let isStreaming = false;
  let messages = [];

  // ── Styles ────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #cb-widget-btn {
      position: fixed;
      ${POSITION.includes('right') ? 'right: 20px' : 'left: 20px'};
      ${POSITION.includes('top') ? 'top: 20px' : 'bottom: 20px'};
      width: 56px; height: 56px;
      border-radius: 50%;
      background: ${PRIMARY_COLOR};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      z-index: 99999;
      transition: transform 0.2s;
    }
    #cb-widget-btn:hover { transform: scale(1.08); }
    #cb-widget-window {
      position: fixed;
      ${POSITION.includes('right') ? 'right: 20px' : 'left: 20px'};
      ${POSITION.includes('top') ? 'top: 90px' : 'bottom: 90px'};
      width: 380px; max-width: calc(100vw - 40px);
      height: 520px; max-height: calc(100vh - 120px);
      background: #0f0f10;
      border-radius: 16px;
      border: 1px solid #2e2e3a;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 99998;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #e8e8f0;
      font-size: 14px;
    }
    #cb-widget-window.open { display: flex; }
    #cb-header {
      padding: 14px 16px;
      background: #1a1a1f;
      border-bottom: 1px solid #2e2e3a;
      font-weight: 700;
      font-size: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #cb-close { background:none;border:none;color:#9090a8;cursor:pointer;font-size:20px;padding:0 4px; }
    #cb-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cb-msg {
      max-width: 85%;
      padding: 8px 12px;
      border-radius: 12px;
      line-height: 1.55;
      word-break: break-word;
      white-space: pre-wrap;
      font-size: 13.5px;
      animation: cb-fade 0.15s ease-out;
    }
    @keyframes cb-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    .cb-msg.user {
      align-self: flex-end;
      background: #3a2f7a;
      border: 1px solid #5a4db0;
      color: #d4c9ff;
      border-bottom-right-radius: 4px;
    }
    .cb-msg.assistant {
      align-self: flex-start;
      background: #1e1e28;
      border: 1px solid #2e2e3e;
      border-bottom-left-radius: 4px;
    }
    .cb-msg.error {
      align-self: flex-start;
      background: #2a1515;
      border: 1px solid #5a2020;
      color: #f08080;
    }
    #cb-input-area {
      padding: 10px 12px;
      background: #1a1a1f;
      border-top: 1px solid #2e2e3a;
      display: flex;
      gap: 8px;
    }
    #cb-input {
      flex: 1;
      background: #2a2a35;
      border: 1px solid #2e2e3a;
      border-radius: 8px;
      padding: 8px 10px;
      color: #e8e8f0;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      resize: none;
    }
    #cb-input:focus { border-color: ${PRIMARY_COLOR}; }
    #cb-send {
      width: 34px; height: 34px;
      border-radius: 8px;
      background: ${PRIMARY_COLOR};
      border: none;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      align-self: flex-end;
    }
    #cb-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #cb-messages::-webkit-scrollbar { width: 4px; }
    #cb-messages::-webkit-scrollbar-track { background: transparent; }
    #cb-messages::-webkit-scrollbar-thumb { background: #4a4a60; border-radius: 2px; }
  `;
  document.head.appendChild(style);

  // ── DOM ───────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'cb-widget-btn';
  btn.innerHTML = '💬';
  btn.setAttribute('aria-label', 'Open chat');

  const win = document.createElement('div');
  win.id = 'cb-widget-window';
  win.innerHTML = `
    <div id="cb-header">
      <span>💬 Chat with us</span>
      <button id="cb-close">&times;</button>
    </div>
    <div id="cb-messages"></div>
    <div id="cb-input-area">
      <input id="cb-input" placeholder="Type your message..." />
      <button id="cb-send" aria-label="Send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(win);

  const messagesEl = document.getElementById('cb-messages');
  const inputEl = document.getElementById('cb-input');
  const sendEl = document.getElementById('cb-send');

  // ── Toggle ────────────────────────────────────────
  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    btn.innerHTML = isOpen ? '✕' : '💬';
    if (isOpen && messages.length === 0) {
      // Show greeting (fetched from server or default)
      addMessage('assistant', 'Hello! How can I help you today?');
    }
    if (isOpen) inputEl.focus();
  });

  document.getElementById('cb-close').addEventListener('click', () => {
    isOpen = false;
    win.classList.remove('open');
    btn.innerHTML = '💬';
  });

  // ── Messages ──────────────────────────────────────
  function addMessage(role, content) {
    messages.push({ role, content });
    const div = document.createElement('div');
    div.className = `cb-msg ${role}`;
    div.textContent = content;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  // ── Send ──────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isStreaming) return;

    addMessage('user', text);
    inputEl.value = '';
    isStreaming = true;
    sendEl.disabled = true;

    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'cb-msg assistant';
    assistantDiv.textContent = '';
    messagesEl.appendChild(assistantDiv);

    try {
      const res = await fetch(`${SERVER}/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ message: text, sessionId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        assistantDiv.className = 'cb-msg error';
        assistantDiv.textContent = err.error || 'Something went wrong.';
        messages.push({ role: 'error', content: assistantDiv.textContent });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        const lines = raw.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const payload = line.slice(6);
          if (payload === '[DONE]') break;

          try {
            const data = JSON.parse(payload);
            if (data.sessionId) {
              sessionId = data.sessionId;
              sessionStorage.setItem('cb_session', sessionId);
            }
            if (data.content) {
              fullContent += data.content;
              assistantDiv.textContent = fullContent;
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
            if (data.error) {
              assistantDiv.className = 'cb-msg error';
              assistantDiv.textContent = data.error;
              fullContent = data.error;
            }
          } catch { /* skip */ }
        }
      }

      messages.push({ role: 'assistant', content: fullContent });
    } catch (err) {
      assistantDiv.className = 'cb-msg error';
      assistantDiv.textContent = 'Connection failed. Please try again.';
      messages.push({ role: 'error', content: assistantDiv.textContent });
    } finally {
      isStreaming = false;
      sendEl.disabled = false;
      inputEl.focus();
    }
  }

  sendEl.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
})();
