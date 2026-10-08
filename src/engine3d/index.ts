/**
 * The 3D runtime, as a generated site loads it.
 *
 * One file, served from Lumen's own origin so `script-src 'self'` is
 * satisfied, and the same bytes for every site ever published — so it is
 * downloaded once and cached, rather than bundled into each site.
 *
 * It reads its instructions out of the page rather than being configured in
 * code: the generator writes a JSON scene into a data attribute, and this
 * boots from that. No inline script, which the policy forbids anyway.
 *
 * It refuses to run, quietly and completely, in four cases: no scene in the
 * page, no WebGL, a phone that cannot be expected to hold a frame rate, or a
 * reader who has asked their system for less motion. In every one of them the
 * site is the HTML underneath, which is a complete page on its own.
 */

import { Group } from 'three';
import { buildActor, type MaterialKind, type ModelKind } from './models';
import { createEngine, type ActorSpec, type SceneSpec } from './scene';

const MOUNT = '[data-lumen-scene]';
/**
 * The bands the choreography is keyed on.
 *
 * `main > section` rather than a marker attribute, because every section the
 * kit renders is already one of those — a marker would mean touching twenty
 * renderers and would be one rename away from a scene that never moves.
 */
const SECTION = 'main > section, [data-s3d-section]';

function readSpec(): SceneSpec | null {
  const mount = document.querySelector(MOUNT);
  const raw = mount?.getAttribute('data-lumen-scene');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SceneSpec;
    return Array.isArray(parsed.actors) && parsed.actors.length > 0 ? parsed : null;
  } catch {
    // A malformed scene is a site with no 3D on it, not a site with an error
    // dialog on it.
    return null;
  }
}

function supported(): boolean {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  // A real check rather than a user-agent guess: the answer is whether this
  // device can make a context, which is the thing that actually matters.
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * How far through the page we are, in sections.
 *
 * The continuous coordinate everything is keyed on: 3.5 is halfway through the
 * fourth section. Measured from the sections' own boxes every frame, so it is
 * correct while images load and the page is still settling — a value cached at
 * load is wrong by the time the first photograph arrives.
 */
function sectionCoordinate(sections: HTMLElement[]): number {
  const middle = window.innerHeight / 2;
  for (let index = 0; index < sections.length; index += 1) {
    const box = sections[index].getBoundingClientRect();
    if (box.bottom >= middle || index === sections.length - 1) {
      const span = Math.max(box.height, 1);
      const through = Math.max(0, Math.min(1, (middle - box.top) / span));
      return index + through;
    }
  }
  return 0;
}

function boot() {
  const spec = readSpec();
  if (!spec || !supported()) return;

  const sections = [...document.querySelectorAll<HTMLElement>(SECTION)];
  if (sections.length === 0) return;

  const engine = createEngine(spec, (actor: ActorSpec) => {
    const group = new Group();
    group.add(
      buildActor({
        model: actor.model as ModelKind,
        material: actor.material as MaterialKind,
        colour: actor.colour,
        seed: actor.seed ?? actor.id.length * 97,
      }),
    );
    return group;
  });

  document.body.appendChild(engine.canvas);
  // Only once there is something to see. The class is what fades it in, so a
  // slow first frame is not a black rectangle over the page.
  requestAnimationFrame(() => engine.canvas.classList.add('is-ready'));

  const pointer = { x: 0, y: 0 };
  window.addEventListener(
    'pointermove',
    (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );

  window.addEventListener('resize', () => engine.resize(), { passive: true });

  // Paused when the page is not on screen. A fixed canvas rendering sixty
  // times a second behind a tab nobody is looking at is somebody's battery.
  let visible = true;
  document.addEventListener('visibilitychange', () => {
    visible = document.visibilityState === 'visible';
  });

  function frame(time: number) {
    requestAnimationFrame(frame);
    if (!visible) return;
    engine.render(sectionCoordinate(sections), pointer, time);
  }
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
