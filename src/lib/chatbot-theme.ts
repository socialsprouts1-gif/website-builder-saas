/**
 * How the chat bubble looks, and who it looks like.
 *
 * One catalogue, read by both the picker in the app and the widget that ships
 * on the published site. The alternative — the picker holding a list of names
 * and the widget holding a list of styles — is one rename away from an owner
 * choosing a theme that silently does not exist.
 *
 * The widget is plain CSS written into a string, because a published site runs
 * under `script-src 'self'` and the widget is served from Lumen's origin: no
 * framework, no stylesheet to fetch, nothing to go wrong on somebody else's
 * page.
 */

export interface ChatTheme {
  id: string;
  label: string;
  /** One line in the picker. */
  note: string;
  /** The panel, in order: background, text, muted text, the bot's bubble. */
  panel: string;
  ink: string;
  inkMuted: string;
  botBubble: string;
  botInk: string;
  /** The border and the shadow, which is most of what separates these. */
  line: string;
  shadow: string;
  radius: string;
  /** Corner radius of a message bubble. */
  msgRadius: string;
  /** A font stack, when the theme wants its own. */
  font: string;
  /** Whether the header is the accent colour or the panel colour. */
  solidHeader: boolean;
  /** An extra rule or two, for the themes that need one. */
  extra?: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'clean',
    label: 'Clean',
    note: 'White, quiet, gets out of the way. Suits almost any site.',
    panel: '#ffffff',
    ink: '#14140f',
    inkMuted: '#6b6b63',
    botBubble: '#f4f4f1',
    botInk: '#14140f',
    line: 'rgba(0,0,0,.08)',
    shadow: '0 24px 70px -12px rgba(0,0,0,.28)',
    radius: '20px',
    msgRadius: '16px',
    font: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    solidHeader: false,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    note: 'Dark panel, bright accent. Right for a dark site.',
    panel: '#14141a',
    ink: '#f2f2f6',
    inkMuted: '#9b9baa',
    botBubble: '#20202a',
    botInk: '#f2f2f6',
    line: 'rgba(255,255,255,.1)',
    shadow: '0 24px 70px -12px rgba(0,0,0,.6)',
    radius: '20px',
    msgRadius: '16px',
    font: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    solidHeader: false,
  },
  {
    id: 'glass',
    label: 'Glass',
    note: 'Frosted and translucent, with the page showing through.',
    panel: 'rgba(255,255,255,.72)',
    ink: '#14140f',
    inkMuted: '#5f5f58',
    botBubble: 'rgba(255,255,255,.75)',
    botInk: '#14140f',
    line: 'rgba(255,255,255,.5)',
    shadow: '0 30px 80px -16px rgba(0,0,0,.3)',
    radius: '24px',
    msgRadius: '18px',
    font: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    solidHeader: false,
    extra: '.lumen-panel{backdrop-filter:blur(20px) saturate(1.5);-webkit-backdrop-filter:blur(20px) saturate(1.5)}.lumen-msg[data-role="assistant"]{backdrop-filter:blur(8px)}',
  },
  {
    id: 'cartoon',
    label: 'Cartoon',
    note: 'Thick outlines and a hard shadow. Playful, for a friendly brand.',
    panel: '#fffdf5',
    ink: '#1c1a14',
    inkMuted: '#6b6558',
    botBubble: '#ffffff',
    botInk: '#1c1a14',
    line: '#1c1a14',
    shadow: '7px 7px 0 #1c1a14',
    radius: '22px',
    msgRadius: '18px',
    font: '"Comic Sans MS","Chalkboard SE",system-ui,sans-serif',
    solidHeader: true,
    extra: '.lumen-panel{border:3px solid #1c1a14}.lumen-msg{border:2px solid #1c1a14}.lumen-bubble{border:3px solid #1c1a14;box-shadow:5px 5px 0 #1c1a14}.lumen-send{border:2px solid #1c1a14}',
  },
  {
    id: 'anime',
    label: 'Anime',
    note: 'Soft gradient, rounded everything, a pastel glow.',
    panel: 'linear-gradient(170deg,#fff6fb 0%,#f3f0ff 100%)',
    ink: '#2a1f3d',
    inkMuted: '#7a6b96',
    botBubble: '#ffffff',
    botInk: '#2a1f3d',
    line: 'rgba(160,120,220,.26)',
    shadow: '0 26px 70px -14px rgba(150,90,200,.45)',
    radius: '26px',
    msgRadius: '20px',
    font: '"Quicksand","Nunito",system-ui,sans-serif',
    solidHeader: true,
    extra: '.lumen-bubble{box-shadow:0 10px 30px rgba(150,90,200,.5)}.lumen-msg[data-role="assistant"]{box-shadow:0 2px 10px rgba(150,90,200,.14)}',
  },
  {
    id: 'terminal',
    label: 'Terminal',
    note: 'Monospace on near-black. For a developer tool.',
    panel: '#0b0d10',
    ink: '#d6f5d6',
    inkMuted: '#6f8a6f',
    botBubble: '#121720',
    botInk: '#d6f5d6',
    line: 'rgba(120,220,120,.22)',
    shadow: '0 20px 60px -14px rgba(0,0,0,.7)',
    radius: '10px',
    msgRadius: '6px',
    font: 'ui-monospace,"SF Mono","Cascadia Code",Menlo,monospace',
    solidHeader: false,
    extra: '.lumen-head{letter-spacing:.04em}.lumen-input{letter-spacing:.02em}',
  },
];

export const themeById = (id: string | null | undefined): ChatTheme =>
  CHAT_THEMES.find((theme) => theme.id === id) ?? CHAT_THEMES[0];

/**
 * The faces the assistant can wear, when the owner has not uploaded one.
 *
 * Inline SVG rather than image files: the widget is one script on somebody
 * else's page, and a second request for a 2kB picture is a request that can
 * fail, be blocked, or arrive after the bubble has already been seen empty.
 * `currentColor` so each one takes the site's accent.
 */
export interface AvatarPreset {
  id: string;
  label: string;
  svg: string;
}

const face = (body: string) =>
  `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'spark',
    label: 'Spark',
    svg: face('<path fill="currentColor" d="M24 4l4.6 12.4L41 21l-12.4 4.6L24 38l-4.6-12.4L7 21l12.4-4.6z"/>'),
  },
  {
    id: 'orb',
    label: 'Orb',
    svg: face('<circle cx="24" cy="24" r="16" fill="currentColor" opacity=".25"/><circle cx="24" cy="24" r="9" fill="currentColor"/>'),
  },
  {
    id: 'robot',
    label: 'Robot',
    svg: face('<rect x="10" y="14" width="28" height="22" rx="7" fill="currentColor"/><circle cx="19" cy="25" r="3.2" fill="#fff"/><circle cx="29" cy="25" r="3.2" fill="#fff"/><rect x="22" y="7" width="4" height="7" rx="2" fill="currentColor"/>'),
  },
  {
    id: 'cat',
    label: 'Cat',
    svg: face('<path fill="currentColor" d="M12 16l2-9 8 6h4l8-6 2 9v10a14 14 0 01-24 0z"/><circle cx="19" cy="24" r="2.6" fill="#fff"/><circle cx="29" cy="24" r="2.6" fill="#fff"/>'),
  },
  {
    id: 'ghost',
    label: 'Ghost',
    svg: face('<path fill="currentColor" d="M10 24a14 14 0 0128 0v17l-5-4-4 4-5-4-5 4-4-4-5 4z"/><circle cx="19" cy="23" r="2.8" fill="#fff"/><circle cx="29" cy="23" r="2.8" fill="#fff"/>'),
  },
  {
    id: 'bloom',
    label: 'Bloom',
    svg: face('<g fill="currentColor"><circle cx="24" cy="13" r="7"/><circle cx="24" cy="35" r="7"/><circle cx="13" cy="24" r="7"/><circle cx="35" cy="24" r="7"/></g><circle cx="24" cy="24" r="6" fill="#fff"/>'),
  },
  {
    id: 'none',
    label: 'No face',
    svg: '',
  },
];

export const avatarById = (id: string | null | undefined): AvatarPreset | undefined =>
  AVATAR_PRESETS.find((preset) => preset.id === id);

/** The stylesheet for one theme, as the widget writes it. */
export function themeCss(theme: ChatTheme, accent: string): string {
  const headBg = theme.solidHeader ? accent : theme.panel;
  const headInk = theme.solidHeader ? '#ffffff' : theme.ink;

  return [
    `.lumen-bubble{position:fixed;right:20px;bottom:20px;width:60px;height:60px;border-radius:999px;border:0;cursor:pointer;background:${accent};color:#fff;display:grid;place-items:center;box-shadow:0 12px 34px -6px rgba(0,0,0,.4);z-index:2147483000;transition:transform .25s cubic-bezier(.2,.7,.3,1),box-shadow .25s ease}`,
    `.lumen-bubble:hover{transform:translateY(-3px) scale(1.05)}`,
    `.lumen-bubble svg{width:30px;height:30px}`,
    // Open: it shrinks slightly and shows a cross. It used to rotate 90°
    // while keeping the speech-bubble mark, which reads as a rendering
    // fault rather than as "close".
    `.lumen-bubble[data-open="1"]{transform:scale(.92)}`,
    `.lumen-panel{position:fixed;right:20px;bottom:92px;width:372px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 128px);background:${theme.panel};color:${theme.ink};border-radius:${theme.radius};box-shadow:${theme.shadow};display:flex;flex-direction:column;overflow:hidden;z-index:2147483000;font:15px/1.55 ${theme.font};opacity:0;transform:translateY(14px) scale(.97);pointer-events:none;transition:opacity .28s ease,transform .28s cubic-bezier(.2,.7,.3,1)}`,
    `.lumen-panel[data-open="1"]{opacity:1;transform:none;pointer-events:auto}`,
    `.lumen-head{display:flex;align-items:center;gap:11px;padding:15px 17px;background:${headBg};color:${headInk};border-bottom:1px solid ${theme.line}}`,
    `.lumen-face{width:38px;height:38px;border-radius:999px;display:grid;place-items:center;flex:0 0 auto;background:${theme.solidHeader ? 'rgba(255,255,255,.2)' : accent};color:#fff;overflow:hidden}`,
    `.lumen-face img{width:100%;height:100%;object-fit:cover}`,
    `.lumen-face svg{width:24px;height:24px}`,
    `.lumen-title{font-weight:650;font-size:15.5px;letter-spacing:-.01em}`,
    `.lumen-sub{font-size:12.5px;opacity:.72;display:flex;align-items:center;gap:5px}`,
    `.lumen-dot{width:7px;height:7px;border-radius:999px;background:#35c759;box-shadow:0 0 0 0 rgba(53,199,89,.6);animation:lumen-pulse 2.4s infinite}`,
    `@keyframes lumen-pulse{70%{box-shadow:0 0 0 7px rgba(53,199,89,0)}100%{box-shadow:0 0 0 0 rgba(53,199,89,0)}}`,
    `.lumen-x{margin-left:auto;background:none;border:0;color:inherit;opacity:.6;cursor:pointer;font-size:21px;line-height:1;padding:4px 6px;border-radius:8px}`,
    `.lumen-x:hover{opacity:1}`,
    `.lumen-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin}`,
    `.lumen-msg{padding:10px 14px;border-radius:${theme.msgRadius};max-width:84%;white-space:pre-wrap;word-break:break-word;animation:lumen-in .32s cubic-bezier(.2,.7,.3,1) both}`,
    `@keyframes lumen-in{from{opacity:0;transform:translateY(8px)}}`,
    `.lumen-msg[data-role="user"]{align-self:flex-end;background:${accent};color:#fff;border-bottom-right-radius:5px}`,
    `.lumen-msg[data-role="assistant"]{align-self:flex-start;background:${theme.botBubble};color:${theme.botInk};border-bottom-left-radius:5px}`,
    `.lumen-typing{align-self:flex-start;display:flex;gap:4px;padding:13px 15px;background:${theme.botBubble};border-radius:${theme.msgRadius}}`,
    `.lumen-typing i{width:7px;height:7px;border-radius:999px;background:${theme.inkMuted};animation:lumen-bounce 1.3s infinite}`,
    `.lumen-typing i:nth-child(2){animation-delay:.18s}.lumen-typing i:nth-child(3){animation-delay:.36s}`,
    `@keyframes lumen-bounce{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-5px);opacity:1}}`,
    `.lumen-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px}`,
    `.lumen-chip{border:1px solid ${theme.line};background:transparent;color:${theme.inkMuted};border-radius:999px;padding:6px 12px;font:inherit;font-size:13.5px;cursor:pointer;transition:border-color .2s,color .2s}`,
    `.lumen-chip:hover{border-color:${accent};color:${accent}}`,
    `.lumen-form{display:flex;gap:8px;border-top:1px solid ${theme.line};padding:12px 13px}`,
    `.lumen-input{flex:1;min-width:0;border:1px solid ${theme.line};border-radius:999px;padding:11px 15px;font:inherit;font-size:14.5px;background:transparent;color:${theme.ink};outline:none;transition:border-color .2s}`,
    `.lumen-input:focus{border-color:${accent}}`,
    `.lumen-input::placeholder{color:${theme.inkMuted}}`,
    `.lumen-send{border:0;border-radius:999px;width:42px;height:42px;flex:0 0 auto;background:${accent};color:#fff;cursor:pointer;display:grid;place-items:center;transition:transform .2s,opacity .2s}`,
    `.lumen-send:hover:not(:disabled){transform:scale(1.07)}`,
    `.lumen-send:disabled{opacity:.4;cursor:not-allowed}`,
    `.lumen-send svg{width:19px;height:19px}`,
    `.lumen-mic{border:1px solid ${theme.line};background:transparent;color:${theme.inkMuted};border-radius:999px;width:42px;height:42px;flex:0 0 auto;cursor:pointer;display:grid;place-items:center;transition:color .2s,border-color .2s,background .2s}`,
    `.lumen-mic:hover:not(:disabled){border-color:${accent};color:${accent}}`,
    `.lumen-mic svg{width:18px;height:18px}`,
    `.lumen-mic:disabled{opacity:.5;cursor:progress}`,
    `.lumen-mic[data-live]{background:${accent};color:#fff;border-color:${accent};animation:lumen-live 1.8s ease-in-out infinite}`,
    `@keyframes lumen-live{0%,100%{box-shadow:0 0 0 0 ${accent}66}50%{box-shadow:0 0 0 9px ${accent}00}}`,
    // The panel says it is listening, so somebody who looked away knows the
    // microphone is still open.
    `.lumen-panel[data-voice] .lumen-head{box-shadow:inset 0 -2px 0 0 ${accent}}`,
    `.lumen-foot{padding:0 16px 11px;font-size:11.5px;color:${theme.inkMuted};text-align:center}`,
    `@media (max-width:420px){.lumen-panel{right:12px;left:12px;width:auto;bottom:86px;height:calc(100vh - 110px)}}`,
    `@media (prefers-reduced-motion:reduce){.lumen-panel,.lumen-msg,.lumen-bubble,.lumen-typing i,.lumen-dot{animation:none!important;transition:none!important}}`,
    theme.extra ?? '',
  ].join('');
}
