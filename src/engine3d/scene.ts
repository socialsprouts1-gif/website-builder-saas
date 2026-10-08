/**
 * The canvas, the light in it, and the rules objects move by.
 *
 * One fixed transparent canvas for the whole page, with the site's own markup
 * on both sides of it. That single decision is most of what separates a site
 * with a 3D widget on it from a 3D site: the object is not inside a section,
 * it is behind and in front of all of them, and it travels as you scroll.
 *
 * Three things from the reference are load-bearing and are kept exactly:
 *
 *   a continuous section coordinate — `s = 3.5` means halfway through section
 *     three. Keyframes are keyed on it, so the choreography is written in the
 *     language of the page rather than in pixels.
 *   positions in screen fractions — `x: 0.5` is the middle of the viewport at
 *     that object's own depth, so the composition survives any aspect ratio
 *     instead of being correct only on the laptop it was authored on.
 *   damping toward a target — nothing is ever set directly from scroll. The
 *     object chases where it should be, which is what gives the weight; set
 *     directly it twitches with every scroll event.
 */

import {
  ACESFilmicToneMapping,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';

export interface Keyframe {
  /** The section coordinate this pose belongs to. */
  s: number;
  /** Across the viewport, 0 to 1, at this object's depth. */
  x: number;
  /** Down the viewport, 0 to 1. */
  y: number;
  /** Towards the camera. Negative is further away. */
  z?: number;
  scale?: number;
  /** Rotations in turns rather than radians, because a spec is written by a model. */
  rx?: number;
  ry?: number;
  rz?: number;
  opacity?: number;
}

export interface ActorSpec {
  id: string;
  model: string;
  material: string;
  colour: string;
  seed?: number;
  tracks: Keyframe[];
}

export interface SceneSpec {
  lighting?: 'studio' | 'dusk' | 'gallery' | 'neon';
  /** 0 is calm, 1 is wild. Scales float, parallax and rotation. */
  intensity?: number;
  accent?: string;
  accent2?: string;
  background?: string;
  actors: ActorSpec[];
}

/**
 * The environment, built rather than downloaded.
 *
 * Emissive planes in a scene that is rendered once into a cube map. This is
 * the `Lightformer` idea from the reference and it is why the site needs no
 * HDR file: the reflections in the glass are reflections of rectangles that
 * were put where a photographer would have put softboxes.
 */
function buildEnvironment(
  renderer: WebGLRenderer,
  lighting: SceneSpec['lighting'],
  accent: Color,
  accent2: Color,
) {
  const room = new Scene();

  const panel = (
    colour: Color | number,
    intensity: number,
    position: [number, number, number],
    scale: [number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    const mesh = new Mesh(
      new PlaneGeometry(scale[0], scale[1]),
      new MeshBasicMaterial({ color: colour, toneMapped: false }),
    );
    mesh.material.color.multiplyScalar(intensity);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    room.add(mesh);
  };

  // A lightbox, not three lamps in a void.
  //
  // The first version was a key, a fill and a rim against a near-black
  // surround, and chrome came out as a black ball with two white streaks on
  // it — because that is what was actually around it to reflect. A real studio
  // is mostly bright: a big soft surround, a lit ceiling and floor, and the
  // key panels on top of that. The surround is what fills the reflection; the
  // panels are only what shapes it.
  const schemes = {
    studio: { surround: 0x8d8d96, ceiling: 2.6, key: 5.0, fill: 2.2, rim: 3.0, tint: 1.1, back: 0x9a9aa4 },
    gallery: { surround: 0xb4b4bc, ceiling: 3.0, key: 3.6, fill: 2.8, rim: 1.8, tint: 0.7, back: 0xc2c2c8 },
    dusk: { surround: 0x3a3447, ceiling: 1.2, key: 3.2, fill: 1.0, rim: 4.0, tint: 2.2, back: 0x2b2736 },
    neon: { surround: 0x241f3a, ceiling: 0.8, key: 2.2, fill: 0.8, rim: 4.8, tint: 3.4, back: 0x171428 },
  } as const;
  const scheme = schemes[lighting ?? 'studio'];

  room.background = new Color(scheme.back);

  // Ceiling and floor first, large and soft. These are what a curved object
  // reflects across most of its surface.
  panel(0xffffff, scheme.ceiling, [0, 7, 0], [18, 18], [Math.PI / 2, 0, 0]);
  panel(scheme.surround, scheme.ceiling * 0.45, [0, -7, 0], [18, 18], [-Math.PI / 2, 0, 0]);
  // The surround, on all four sides.
  panel(scheme.surround, 1.0, [0, 0, -9], [20, 14]);
  panel(scheme.surround, 0.8, [0, 0, 9], [20, 14], [0, Math.PI, 0]);
  panel(scheme.surround, 0.9, [-9, 0, 0], [18, 14], [0, Math.PI / 2, 0]);
  panel(scheme.surround, 0.9, [9, 0, 0], [18, 14], [0, -Math.PI / 2, 0]);

  // Then the shaping light, which is what gives an edge and a highlight.
  panel(0xffffff, scheme.key, [-3.4, 3.2, 3.2], [6, 7], [0, Math.PI / 4, 0]);
  panel(0xffffff, scheme.fill, [4.2, 0.6, 3.4], [5, 6], [0, -Math.PI / 3, 0]);
  panel(0xffffff, scheme.rim, [0, 2.4, -5.5], [9, 4], [0, 0, 0]);
  // And the brand colour, so the accent appears in the reflection rather than
  // only in the material — which is what makes two sites with the same object
  // read as two different brands.
  panel(accent, scheme.tint, [-6, -1.2, -2], [4, 9], [0, Math.PI / 2, 0]);
  panel(accent2, scheme.tint * 0.85, [6, -2, -1], [4, 9], [0, -Math.PI / 2, 0]);

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0.04);
  pmrem.dispose();
  room.clear();
  return target.texture;
}

/** Linear interpolation between the two keyframes either side of `s`. */
export function poseAt(tracks: Keyframe[], s: number): Required<Keyframe> {
  const fill = (frame: Keyframe): Required<Keyframe> => ({
    s: frame.s,
    x: frame.x,
    y: frame.y,
    z: frame.z ?? 0,
    scale: frame.scale ?? 1,
    rx: frame.rx ?? 0,
    ry: frame.ry ?? 0,
    rz: frame.rz ?? 0,
    opacity: frame.opacity ?? 1,
  });

  if (tracks.length === 0) return fill({ s: 0, x: 0.5, y: 0.5 });
  if (s <= tracks[0].s) return fill(tracks[0]);
  if (s >= tracks[tracks.length - 1].s) return fill(tracks[tracks.length - 1]);

  let index = 0;
  while (index < tracks.length - 2 && tracks[index + 1].s < s) index += 1;

  const from = fill(tracks[index]);
  const to = fill(tracks[index + 1]);
  const span = to.s - from.s;
  const raw = span <= 0 ? 0 : (s - from.s) / span;
  // Smoothstep rather than linear: a constant-velocity move between poses
  // reads as a slide, and every one of these is meant to read as a camera
  // move that starts and stops.
  const t = raw * raw * (3 - 2 * raw);

  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    s,
    x: mix(from.x, to.x),
    y: mix(from.y, to.y),
    z: mix(from.z, to.z),
    scale: mix(from.scale, to.scale),
    rx: mix(from.rx, to.rx),
    ry: mix(from.ry, to.ry),
    rz: mix(from.rz, to.rz),
    opacity: mix(from.opacity, to.opacity),
  };
}

/**
 * A screen fraction turned into a world position at a given depth.
 *
 * The whole reason positions are authored as fractions. At depth `z` the
 * visible height is a function of the camera's field of view and the distance
 * to it, so the same 0.5 is the middle of the screen whether the object is
 * near the lens or far behind it, on a phone or on a 34-inch monitor.
 */
export function screenToWorld(
  camera: PerspectiveCamera,
  x: number,
  y: number,
  z: number,
): Vector3 {
  const distance = camera.position.z - z;
  const height = 2 * Math.tan((camera.fov * Math.PI) / 360) * distance;
  const width = height * camera.aspect;
  return new Vector3((x - 0.5) * width, -(y - 0.5) * height, z);
}

export interface Engine {
  canvas: HTMLCanvasElement;
  /** Called with the current section coordinate every frame. */
  render: (s: number, pointer: { x: number; y: number }, time: number) => void;
  resize: () => void;
  dispose: () => void;
}

export function createEngine(spec: SceneSpec, build: (actor: ActorSpec) => Group): Engine {
  const canvas = document.createElement('canvas');
  canvas.className = 'lumen3d__canvas';

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // Capped at 2. A phone reporting 3 or 4 renders nine to sixteen times the
  // pixels for a difference nobody can see, and drops to single-figure frames.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const accent = new Color(spec.accent ?? '#ffffff');
  const accent2 = new Color(spec.accent2 ?? spec.accent ?? '#ffffff');
  scene.environment = buildEnvironment(renderer, spec.lighting, accent, accent2);

  const intensity = Math.max(0, Math.min(1, spec.intensity ?? 0.6));

  const actors = spec.actors.map((actorSpec) => {
    const group = build(actorSpec);
    scene.add(group);
    return {
      spec: actorSpec,
      group,
      // Where it is now, as opposed to where it should be. The gap between
      // the two is the weight.
      current: new Vector3(0, 0, 0),
      started: false,
    };
  });

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function render(s: number, pointer: { x: number; y: number }, time: number) {
    for (const actor of actors) {
      const pose = poseAt(actor.spec.tracks, s);
      const target = screenToWorld(camera, pose.x, pose.y, pose.z);

      // Pointer parallax, scaled by depth so near objects answer more than far
      // ones — which is the cue that tells the eye they are at different
      // distances rather than different sizes.
      const depth = 1 + pose.z * 0.12;
      target.x += pointer.x * 0.9 * intensity * depth;
      target.y += pointer.y * 0.5 * intensity * depth;

      // An idle float, so nothing is ever perfectly still. Different phase per
      // actor or they bob in unison and read as one rigid object.
      const phase = actor.spec.id.length * 1.7;
      target.y += Math.sin(time * 0.0006 + phase) * 0.14 * intensity;

      if (!actor.started) {
        // First frame: snap, rather than flying in from the origin.
        actor.current.copy(target);
        actor.started = true;
      } else {
        actor.current.lerp(target, 0.075);
      }

      actor.group.position.copy(actor.current);
      actor.group.scale.setScalar(pose.scale);
      actor.group.rotation.set(
        pose.rx * Math.PI * 2,
        pose.ry * Math.PI * 2 + time * 0.00008 * intensity,
        pose.rz * Math.PI * 2,
      );
      actor.group.visible = pose.opacity > 0.01;
    }

    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    scene.traverse((node) => {
      if (node instanceof Mesh) {
        node.geometry.dispose();
        const material = node.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      }
    });
  }

  resize();
  return { canvas, render, resize, dispose };
}
