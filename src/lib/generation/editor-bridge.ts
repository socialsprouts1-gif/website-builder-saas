/**
 * Script injected into the preview when it renders in editor mode.
 *
 * The preview iframe is sandboxed WITHOUT allow-same-origin, so the parent
 * cannot reach into its DOM. Everything crosses by postMessage, which is
 * exactly the boundary we want: the editor drives the page by asking it, never
 * by touching it. Previews here are visual only — nothing is persisted until
 * the editor posts the queued edits to the server.
 */
import { themeColourProbeSource } from '@/lib/theme-tokens';

export const EDITOR_BRIDGE = `<script>(function(){
  var THEME = ${themeColourProbeSource()};
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

  /**
   * The site's own palette.
   *
   * Each entry is a list of candidate property names — the current one and the
   * one older sites use — and the page answers with whichever it actually
   * defines. Asking for a fixed set of names is how the editor ended up
   * offering a palette the page had never heard of.
   */
  function tokens(){
    var cs = getComputedStyle(document.documentElement);
    var out = [];
    for (var i = 0; i < THEME.length; i++) {
      var names = THEME[i][0];
      for (var n = 0; n < names.length; n++) {
        var value = cs.getPropertyValue(names[n]).trim();
        if (value) { out.push({ name: names[n], label: THEME[i][1], value: value }); break; }
      }
    }
    return out;
  }

  function kindOf(el){
    var tag = el.tagName.toLowerCase();
    if (tag === 'img') return 'image';
    if (tag === 'a' || tag === 'button') return 'link';
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

  /** The first picture inside a section, so a section can offer to swap it. */
  function innerImage(el){
    if (el.tagName.toLowerCase() === 'img') return null;
    var img = el.querySelector && el.querySelector('img[data-lumen-id]');
    return img ? { lumenId: img.getAttribute('data-lumen-id'), src: img.getAttribute('src') } : null;
  }

  function describe(el){
    var r = el.getBoundingClientRect();
    var isImage = el.tagName.toLowerCase() === 'img';
    return {
      lumenId: el.getAttribute('data-lumen-id'),
      tag: el.tagName.toLowerCase(),
      kind: kindOf(el),
      label: label(el),
      text: el.children.length === 0 ? (el.textContent || '').trim() : '',
      src: isImage ? el.getAttribute('src') : null,
      alt: isImage ? el.getAttribute('alt') : null,
      // Selecting a section and wanting to change its picture is the common
      // case; making someone click the picture itself first was busywork.
      image: innerImage(el),
      href: el.tagName.toLowerCase() === 'a' ? el.getAttribute('href') : null,
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
    if (data.type === 'preview-link' && el) el.setAttribute('href', data.value);

    /**
     * A new section, shown where it will land.
     *
     * The markup comes from the server — the editor asked for it and is only
     * relaying it — and the same section is rendered again from the same id on
     * save, so what is previewed is what is kept.
     */
    if (data.type === 'preview-insert') {
      var host = document.createElement('div');
      host.innerHTML = data.html;
      var added = host.firstElementChild;
      if (added) {
        if (el) el.insertAdjacentElement('afterend', added);
        else (document.querySelector('main') || document.body).appendChild(added);
        added.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clearOutline();
        selected = added;
        added.style.setProperty('outline', HL);
        send('outline', outline());
        send('select', describe(added));
      }
      return;
    }

    if (data.type === 'preview-style' && el) {
      for (var prop in data.styles) {
        if (data.styles[prop]) el.style.setProperty(prop, data.styles[prop]);
        else el.style.removeProperty(prop);
      }
    }

    if (data.type === 'preview-token') {
      document.documentElement.style.setProperty('--' + String(data.name).replace(/^--/, ''), data.value);
    }

    // Swapping the family without loading it shows a fallback, which makes a
    // perfectly good choice look broken.
    if (data.type === 'preview-font-link') {
      var link = document.querySelector('link[data-lumen-font]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('data-lumen-font', '');
        document.head.appendChild(link);
      }
      link.setAttribute('href', data.href);
      return;
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
