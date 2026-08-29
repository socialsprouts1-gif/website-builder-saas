import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * The drop-in widget: a floating bubble the business owner pastes onto any
 * site. It is deliberately plain, dependency-free JavaScript styled from the
 * generated site's own palette — never Lumen's (spec Section 9).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await context.params;

  const admin = createAdminClient();
  const { data: chatbot } = await admin
    .from('chatbots')
    .select('name, greeting, accent_color, is_active')
    .eq('embed_key', embedKey)
    .maybeSingle();

  if (!chatbot || !chatbot.is_active) {
    return new Response('/* Lumen: this assistant is not available. */', {
      headers: { 'content-type': 'text/javascript; charset=utf-8' },
    });
  }

  const origin = request.nextUrl.origin;
  const config = JSON.stringify({
    endpoint: `${origin}/api/chatbot/${embedKey}`,
    name: chatbot.name,
    greeting: chatbot.greeting,
    accent: chatbot.accent_color,
  });

  return new Response(widgetSource(config), {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'access-control-allow-origin': '*',
    },
  });
}

function widgetSource(config: string): string {
  return `(function(){
  var CONFIG = ${config};
  if (window.__lumenWidgetLoaded) return;
  window.__lumenWidgetLoaded = true;

  var sessionKey = 'lumen-chat-session';
  var sessionId = null;
  try { sessionId = localStorage.getItem(sessionKey); } catch (e) {}
  if (!sessionId) {
    sessionId = 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(sessionKey, sessionId); } catch (e) {}
  }

  var style = document.createElement('style');
  style.textContent = [
    '.lumen-bubble{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:999px;border:0;cursor:pointer;background:' + CONFIG.accent + ';color:#fff;font-size:22px;box-shadow:0 10px 30px rgba(0,0,0,.25);z-index:2147483000}',
    '.lumen-panel{position:fixed;right:20px;bottom:88px;width:340px;max-width:calc(100vw - 40px);height:460px;max-height:calc(100vh - 120px);background:#fff;color:#111;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;font:14px/1.5 system-ui,-apple-system,sans-serif}',
    '.lumen-panel[data-open="1"]{display:flex}',
    '.lumen-head{padding:12px 14px;background:' + CONFIG.accent + ';color:#fff;font-weight:600}',
    '.lumen-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}',
    '.lumen-msg{padding:8px 11px;border-radius:12px;max-width:85%;white-space:pre-wrap;word-break:break-word}',
    '.lumen-msg[data-role="user"]{align-self:flex-end;background:' + CONFIG.accent + ';color:#fff}',
    '.lumen-msg[data-role="assistant"]{align-self:flex-start;background:#f1f1ef;color:#111}',
    '.lumen-form{display:flex;gap:6px;border-top:1px solid #e6e6e2;padding:10px}',
    '.lumen-input{flex:1;border:1px solid #dcdcd8;border-radius:999px;padding:8px 12px;font:inherit;outline:none}',
    '.lumen-send{border:0;border-radius:999px;padding:8px 14px;background:' + CONFIG.accent + ';color:#fff;cursor:pointer;font:inherit}',
    '.lumen-send:disabled{opacity:.5;cursor:not-allowed}'
  ].join('');
  document.head.appendChild(style);

  var bubble = document.createElement('button');
  bubble.className = 'lumen-bubble';
  bubble.type = 'button';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.textContent = '\\u{1F4AC}';

  var panel = document.createElement('div');
  panel.className = 'lumen-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', CONFIG.name);

  var head = document.createElement('div');
  head.className = 'lumen-head';
  head.textContent = CONFIG.name;

  var log = document.createElement('div');
  log.className = 'lumen-log';

  var form = document.createElement('form');
  form.className = 'lumen-form';
  var input = document.createElement('input');
  input.className = 'lumen-input';
  input.placeholder = 'Ask a question…';
  input.setAttribute('aria-label', 'Your message');
  var send = document.createElement('button');
  send.className = 'lumen-send';
  send.type = 'submit';
  send.textContent = 'Send';
  form.appendChild(input);
  form.appendChild(send);

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(form);
  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  function addMessage(role, text) {
    var el = document.createElement('div');
    el.className = 'lumen-msg';
    el.setAttribute('data-role', role);
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  addMessage('assistant', CONFIG.greeting);

  bubble.addEventListener('click', function () {
    var open = panel.getAttribute('data-open') === '1';
    panel.setAttribute('data-open', open ? '0' : '1');
    if (!open) input.focus();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    send.disabled = true;
    var pending = addMessage('assistant', '…');

    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: sessionId })
    })
      .then(function (response) { return response.json(); })
      .then(function (payload) {
        pending.textContent = payload.answer || payload.error || 'Sorry, something went wrong.';
      })
      .catch(function () {
        pending.textContent = 'Sorry, I could not reach the assistant.';
      })
      .finally(function () {
        send.disabled = false;
        log.scrollTop = log.scrollHeight;
      });
  });
})();`;
}
