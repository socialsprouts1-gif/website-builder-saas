import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { avatarById, themeById, themeCss } from '@/lib/chatbot-theme';

export const runtime = 'nodejs';

/**
 * The chat widget, as it ships on a published site.
 *
 * One dependency-free script, styled from the generated site's own palette and
 * the theme its owner chose — never Lumen's colours on somebody else's site.
 *
 * It was rebuilt because the first version looked like a browser dialog from
 * 2009: square bubbles, a hard-coded grey, no avatar, no open animation, and a
 * "…" where a typing indicator should be. A chat bubble is the one piece of
 * Lumen a business's own customers actually touch, so it is the last place to
 * leave something that reads as a default.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ embedKey: string }> }) {
  const { embedKey } = await context.params;

  const admin = createAdminClient();
  const { data: chatbot } = await admin
    .from('chatbots')
    .select('name, greeting, accent_color, is_active, theme, avatar_url, avatar_preset')
    .eq('embed_key', embedKey)
    .maybeSingle();

  if (!chatbot || !chatbot.is_active) {
    return new Response('/* Lumen: this assistant is not available. */', {
      headers: { 'content-type': 'text/javascript; charset=utf-8' },
    });
  }

  const theme = themeById(chatbot.theme);
  const accent = chatbot.accent_color || '#15150f';
  const preset = avatarById(chatbot.avatar_preset);

  const config = JSON.stringify({
    endpoint: `${request.nextUrl.origin}/api/chatbot/${embedKey}`,
    name: chatbot.name,
    greeting: chatbot.greeting,
    css: themeCss(theme, accent),
    // An uploaded picture wins; otherwise the chosen face; otherwise nothing,
    // and the header is just a name, which is a legitimate choice.
    avatarUrl: chatbot.avatar_url ?? null,
    avatarSvg: preset?.svg ?? '',
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
  style.textContent = CONFIG.css;
  document.head.appendChild(style);

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // The avatar. An uploaded picture is put in an <img> with its src set as a
  // property rather than through markup, and a preset is inline SVG we wrote
  // ourselves — so nothing the owner typed is ever parsed as HTML.
  function face() {
    var wrap = el('div', 'lumen-face');
    if (CONFIG.avatarUrl) {
      var img = document.createElement('img');
      img.src = CONFIG.avatarUrl;
      img.alt = '';
      wrap.appendChild(img);
    } else if (CONFIG.avatarSvg) {
      wrap.innerHTML = CONFIG.avatarSvg;
    } else {
      wrap.textContent = (CONFIG.name || '?').trim().charAt(0).toUpperCase();
    }
    return wrap;
  }

  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.9 8.9 0 01-4-.9L3 21l1.9-5a8.4 8.4 0 01-.9-4 8.4 8.4 0 018.4-8.4h.6a8.4 8.4 0 018 8v.4z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  var bubble = el('button', 'lumen-bubble');
  bubble.type = 'button';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.innerHTML = ICON_CHAT;

  var panel = el('div', 'lumen-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', CONFIG.name);
  panel.setAttribute('data-open', '0');

  var head = el('div', 'lumen-head');
  var who = el('div');
  who.appendChild(el('div', 'lumen-title', CONFIG.name));
  var sub = el('div', 'lumen-sub');
  sub.appendChild(el('span', 'lumen-dot'));
  sub.appendChild(el('span', null, 'Online'));
  who.appendChild(sub);
  var close = el('button', 'lumen-x', '\\u00D7');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close chat');
  head.appendChild(face());
  head.appendChild(who);
  head.appendChild(close);

  var log = el('div', 'lumen-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');

  var form = document.createElement('form');
  form.className = 'lumen-form';
  var input = el('input', 'lumen-input');
  input.placeholder = 'Ask a question…';
  input.setAttribute('aria-label', 'Your message');
  var send = el('button', 'lumen-send');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Send');
  send.innerHTML = ICON_SEND;
  form.appendChild(input);
  form.appendChild(send);

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(form);
  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  function addMessage(role, text) {
    var node = el('div', 'lumen-msg', text);
    node.setAttribute('data-role', role);
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  // Three dots rather than an ellipsis character. The old version wrote "…"
  // into a bubble and left it there, which reads as a message the assistant
  // actually sent rather than as waiting.
  function addTyping() {
    var node = el('div', 'lumen-typing');
    node.setAttribute('aria-label', 'Typing');
    node.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  addMessage('assistant', CONFIG.greeting);

  function setOpen(open) {
    panel.setAttribute('data-open', open ? '1' : '0');
    bubble.setAttribute('data-open', open ? '1' : '0');
    bubble.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    if (open) input.focus();
  }

  bubble.addEventListener('click', function () {
    setOpen(panel.getAttribute('data-open') !== '1');
  });
  close.addEventListener('click', function () { setOpen(false); bubble.focus(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && panel.getAttribute('data-open') === '1') {
      setOpen(false);
      bubble.focus();
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    send.disabled = true;
    var typing = addTyping();

    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: sessionId })
    })
      .then(function (response) { return response.json(); })
      .then(function (payload) {
        typing.remove();
        addMessage('assistant', payload.answer || payload.error || 'Sorry, something went wrong.');
      })
      .catch(function () {
        typing.remove();
        addMessage('assistant', 'Sorry, I could not reach the assistant.');
      })
      .finally(function () {
        send.disabled = false;
        log.scrollTop = log.scrollHeight;
        input.focus();
      });
  });
})();`;
}
