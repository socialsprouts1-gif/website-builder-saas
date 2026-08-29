/**
 * Script injected into the preview when it is rendered in visual-edit mode.
 *
 * The preview iframe is sandboxed WITHOUT allow-same-origin, so the parent
 * cannot reach into its DOM. All communication is postMessage, which is exactly
 * the boundary we want: the editor drives the page by asking it, never by
 * touching it.
 */
export const EDITOR_BRIDGE = `<script>(function(){
  var selected = null;

  function describe(el){
    var tag = el.tagName.toLowerCase();
    return {
      lumenId: el.getAttribute('data-lumen-id'),
      tag: tag,
      kind: tag === 'img' ? 'image' : (el.children.length === 0 ? 'text' : 'block'),
      text: el.children.length === 0 ? (el.textContent || '').trim() : '',
      src: tag === 'img' ? el.getAttribute('src') : null,
      alt: tag === 'img' ? el.getAttribute('alt') : null,
      rect: (function(){ var r = el.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height }; })()
    };
  }

  function clearOutline(){
    if (selected) selected.style.removeProperty('outline');
  }

  document.addEventListener('click', function(event){
    var el = event.target.closest('[data-lumen-id]');
    if (!el) return;
    event.preventDefault();
    event.stopPropagation();
    clearOutline();
    selected = el;
    el.style.setProperty('outline', '2px solid #d7ff3e');
    parent.postMessage({ source: 'lumen-preview', type: 'select', payload: describe(el) }, '*');
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

    if (data.type === 'preview-text' && selected) {
      selected.textContent = data.value;
    }
    if (data.type === 'preview-image' && selected && selected.tagName.toLowerCase() === 'img') {
      selected.setAttribute('src', data.value);
    }
    if (data.type === 'preview-token') {
      document.documentElement.style.setProperty('--' + String(data.name).replace(/^--/, ''), data.value);
    }
    if (data.type === 'deselect') {
      clearOutline();
      selected = null;
    }
  });

  parent.postMessage({ source: 'lumen-preview', type: 'ready' }, '*');
})();</script>`;
