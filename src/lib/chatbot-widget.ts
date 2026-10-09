/**
 * The chat widget's own source, as a string.
 *
 * Kept out of the route so it can be parsed and looked at without a database
 * row. That is not tidiness: the last time a generated script shipped from
 * here, a `\n` written as a real newline inside a template literal broke the
 * script on every published site, and nothing caught it because nothing ever
 * parsed the thing that was being served.
 */
export function widgetSource(config: string): string {
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
  var ICON_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v4"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_STOP = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';

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
  var mic = null;
  if (CONFIG.voice) {
    mic = el('button', 'lumen-mic');
    mic.type = 'button';
    mic.setAttribute('aria-label', 'Talk to the assistant');
    mic.innerHTML = ICON_MIC;
    form.appendChild(mic);
  }
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
    // The mark changes with it. A launcher that says "Close chat" to a screen
    // reader while still showing a speech bubble is telling two stories.
    bubble.innerHTML = open ? ICON_CLOSE : ICON_CHAT;
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

  /**
   * Talking to the assistant.
   *
   * The browser holds the audio connection directly with the provider, over
   * WebRTC, because routing audio through Lumen would add a round trip to
   * every syllable and it would stop sounding like a conversation. What it
   * does NOT hold is a key: the endpoint above mints a credential that lasts
   * about a minute and is good for one session.
   *
   * Everything here degrades to the typed chat, which is always there.
   */
  if (mic) {
    var call = null;

    function endCall(note) {
      if (!call) return;
      try { call.pc.close(); } catch (e) {}
      try { call.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      try { call.audio.remove(); } catch (e) {}
      call = null;
      mic.innerHTML = ICON_MIC;
      mic.removeAttribute('data-live');
      mic.setAttribute('aria-label', 'Talk to the assistant');
      panel.removeAttribute('data-voice');
      if (note) addMessage('assistant', note);
    }

    function startCall() {
      mic.disabled = true;
      mic.setAttribute('data-connecting', '1');

      fetch(CONFIG.voiceEndpoint, { method: 'POST' })
        .then(function (response) { return response.json(); })
        .then(function (session) {
          if (!session || !session.clientSecret) {
            throw new Error(session && session.error ? session.error : 'no session');
          }
          return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            var pc = new RTCPeerConnection();

            // The assistant's voice. Appended to the page rather than played
            // through a detached element, because Safari will not play audio
            // from a node that is not in the document.
            var audio = document.createElement('audio');
            audio.autoplay = true;
            audio.style.display = 'none';
            document.body.appendChild(audio);
            pc.ontrack = function (event) { audio.srcObject = event.streams[0]; };

            stream.getTracks().forEach(function (track) { pc.addTrack(track, stream); });

            pc.oniceconnectionstatechange = function () {
              if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                endCall('The call dropped. You can carry on by typing.');
              }
            };

            call = { pc: pc, stream: stream, audio: audio };

            return pc
              .createOffer()
              .then(function (offer) { return pc.setLocalDescription(offer).then(function () { return offer; }); })
              .then(function (offer) {
                return fetch('https://api.openai.com/v1/realtime?model=' + encodeURIComponent(session.model), {
                  method: 'POST',
                  headers: {
                    authorization: 'Bearer ' + session.clientSecret,
                    'content-type': 'application/sdp'
                  },
                  body: offer.sdp
                });
              })
              .then(function (response) {
                if (!response.ok) throw new Error('sdp');
                return response.text();
              })
              .then(function (answer) {
                return pc.setRemoteDescription({ type: 'answer', sdp: answer });
              })
              .then(function () {
                mic.innerHTML = ICON_STOP;
                mic.setAttribute('data-live', '1');
                mic.setAttribute('aria-label', 'End the call');
                panel.setAttribute('data-voice', '1');
                addMessage('assistant', 'I am listening — just talk. Tap the square to stop.');
              });
          });
        })
        .catch(function (error) {
          endCall(null);
          var denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
          addMessage(
            'assistant',
            denied
              ? 'I could not use your microphone. You can carry on by typing.'
              : 'The voice assistant is not available right now. You can carry on by typing.'
          );
        })
        .finally(function () {
          mic.disabled = false;
          mic.removeAttribute('data-connecting');
        });
    }

    mic.addEventListener('click', function () {
      if (call) endCall('Call ended.');
      else startCall();
    });

    // A call left running on a page nobody is looking at is somebody's
    // microphone and somebody's bill.
    window.addEventListener('pagehide', function () { endCall(null); });
  }
})();`;
}
