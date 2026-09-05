/**
 * Script injected into the preview when it renders in editor mode.
 *
 * The preview iframe is sandboxed WITHOUT allow-same-origin, so the parent
 * cannot reach into its DOM. Everything crosses by postMessage, which is
 * exactly the boundary we want: the editor drives the page by asking it, never
 * by touching it. Previews here are visual only — nothing is persisted until
 * the editor posts the queued edits to the server.
 */
export const EDITOR_BRIDGE = `<script>(function(){
  var selected = null;
  var HL = '2px solid #d7ff3e';

  function label(el){
    var tag = el.tagName.toLowerCase();
    if (tag === 'img') return el.getAttribute('alt') || 'Image';
    // A section's own heading names it far better than its whole text run.
    var heading = el.querySelector && el.querySelector('h1,h2,h3,h4,h5,h6');
    var source = heading || el;
    var text = (source.textContent || '').trim().replace(/\\s+/g, ' ');
    return text ? text.slice(0, 42) : tag;
  }

  /** The site's own design tokens, so the editor can offer its real palette. */
  function tokens(){
    var cs = getComputedStyle(document.documentElement);
    var body = getComputedStyle(document.body);
    var wanted = [
      ['--color-text', 'Text', body.color],
      ['--color-text-muted', 'Muted', ''],
      ['--color-accent', 'Accent', ''],
      ['--color-surface', 'Surface', ''],
      ['--color-background', 'Background', body.backgroundColor]
    ];
    var out = [];
    for (var i = 0; i < wanted.length; i++) {
      var value = cs.getPropertyValue(wanted[i][0]).trim() || wanted[i][2];
      if (value) out.push({ name: wanted[i][0], label: wanted[i][1], value: value });
    }
    return out;
  }

  function kindOf(el){
    var tag = el.tagName.toLowerCase();
    if (tag === 'img') return 'image';
    if (el.children.length === 0) return 'text';
    return 'block';
  }

  function computed(el){
    var s = getComputedStyle(el);
    return {
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      color: s.color,
      textAlign: s.textAlign,
      backgroundColor: s.backgroundColor
    };
  }

  function describe(el){
    var r = el.getBoundingClientRect();
    return {
      lumenId: el.getAttribute('data-lumen-id'),
      tag: el.tagName.toLowerCase(),
      kind: kindOf(el),
      label: label(el),
      text: el.children.length === 0 ? (el.textContent || '').trim() : '',
      src: el.tagName.toLowerCase() === 'img' ? el.getAttribute('src') : null,
      alt: el.tagName.toLowerCase() === 'img' ? el.getAttribute('alt') : null,
      style: computed(el),
      rect: { top: r.top, left: r.left, width: r.width, height: r.height }
    };
  }

  /** Top-level editable blocks, in document order — the layers list. */
  function outline(){
    var scope = document.querySelector('main') || document.body;
    var out = [];
    for (var i = 0; i < scope.children.length; i++) {
      var el = scope.children[i];
      var id = el.getAttribute && el.getAttribute('data-lumen-id');
      if (!id) continue;
      out.push({ lumenId: id, tag: el.tagName.toLowerCase(), label: label(el) });
    }
    return out;
  }

  function send(type, payload){
    parent.postMessage({ source: 'lumen-preview', type: type, payload: payload }, '*');
  }

  function byId(id){ return document.querySelector('[data-lumen-id="' + id + '"]'); }

  function clearOutline(){ if (selected) selected.style.removeProperty('outline'); }

  document.addEventListener('click', function(event){
    var el = event.target.closest('[data-lumen-id]');
    if (!el) return;
    event.preventDefault();
    event.stopPropagation();
    clearOutline();
    selected = el;
    el.style.setProperty('outline', HL);
    send('select', describe(el));
  }, true);

  document.addEventListener('mouseover', function(event){
    var el = event.target.closest('[data-lumen-id]');
    if (el && el !== selected) el.style.setProperty('outline', '1px dashed rgba(215,255,62,0.5)');
  });
  document.addEventListener('mouseout', function(event){
    var el = event.target.closest('[data-lumen-id]');
    if (el && el !== selected) el.style.removeProperty('outline');
  });

  window.addEventListener('message', function(event){
    var data = event.data;
    if (!data || data.source !== 'lumen-editor') return;
    var el = data.lumenId ? byId(data.lumenId) : selected;

    if (data.type === 'outline') { send('outline', outline()); return; }
    if (data.type === 'tokens') { send('tokens', tokens()); return; }

    if (data.type === 'select' && el) {
      clearOutline();
      selected = el;
      el.style.setProperty('outline', HL);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      send('select', describe(el));
      return;
    }

    if (data.type === 'preview-text' && el) el.textContent = data.value;
    if (data.type === 'preview-image' && el) el.setAttribute('src', data.value);

    if (data.type === 'preview-style' && el) {
      for (var prop in data.styles) {
        if (data.styles[prop]) el.style.setProperty(prop, data.styles[prop]);
        else el.style.removeProperty(prop);
      }
    }

    if (data.type === 'preview-token') {
      document.documentElement.style.setProperty('--' + String(data.name).replace(/^--/, ''), data.value);
    }

    if (data.type === 'preview-move' && el) {
      var sib = data.direction === 'up' ? el.previousElementSibling : el.nextElementSibling;
      if (sib) {
        if (data.direction === 'up') el.parentNode.insertBefore(el, sib);
        else el.parentNode.insertBefore(sib, el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      send('outline', outline());
    }

    if (data.type === 'preview-remove' && el) {
      el.remove();
      selected = null;
      send('outline', outline());
    }

    if (data.type === 'deselect') { clearOutline(); selected = null; }
  });

  send('ready', outline());
  send('tokens', tokens());
})();</script>`;
