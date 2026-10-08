/**
 * The objects a generated site can put on screen, and what they are made of.
 *
 * Built in code rather than downloaded. A GLB is a network request, a licence
 * and a thing that can 404; a lathe profile is forty numbers. More importantly
 * it is parametric: the same `bottle` with different proportions, shoulder and
 * cap is a different bottle, so two sites in the same category do not get the
 * same object. That is the whole reason the reference site's bottles work.
 *
 * Everything is normalised to one height before it leaves here, so the
 * choreography can place a perfume bottle and a laptop at the same screen
 * fraction and get the same visual weight.
 */

import {
  BoxGeometry,
  DoubleSide,
  BufferGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type ColorRepresentation,
} from 'three';

export type ModelKind =
  | 'bottle'
  | 'jar'
  | 'tube'
  | 'box'
  | 'can'
  | 'orb'
  | 'ring'
  | 'slab'
  | 'sculpture'
  | 'pebble';

export type MaterialKind =
  | 'glass'
  | 'frosted'
  | 'chrome'
  | 'metal'
  | 'ceramic'
  | 'plastic'
  | 'liquid'
  | 'stone';

/**
 * A number in 0..1 turned into a repeatable sequence.
 *
 * The same seed must give the same object every time: a site rebuilt twice
 * should be the same site, and a product that changes shape when the copy is
 * edited is a bug nobody can explain.
 */
export function rng(seed: number): () => number {
  let state = (seed * 1_103_515_245 + 12_345) >>> 0;
  return () => {
    state = (state * 1_103_515_245 + 12_345) >>> 0;
    return state / 0x1_00_00_00_00;
  };
}

/** A lathe profile, in units where the object is about 2 tall. */
function profile(points: [number, number][]): Vector2[] {
  return points.map(([x, y]) => new Vector2(x, y));
}

function bottleGeometry(random: () => number): BufferGeometry {
  // Every one of these is a real decision about the silhouette: how wide the
  // base is, how high the shoulder sits, how far the neck is drawn in. Three
  // numbers is enough for bottles that are clearly different objects.
  const width = 0.52 + random() * 0.26;
  const shoulder = 0.9 + random() * 0.5;
  const neck = 0.14 + random() * 0.1;
  const capHeight = 0.2 + random() * 0.22;

  return new LatheGeometry(
    profile([
      [0, 0],
      [width * 0.94, 0],
      [width, 0.08],
      [width, shoulder],
      // The shoulder curve. Two points rather than one, or it reads as a cone.
      [width * 0.82, shoulder + 0.16],
      [neck * 1.5, shoulder + 0.34],
      [neck, shoulder + 0.42],
      [neck, shoulder + 0.42 + capHeight * 0.5],
      [neck * 1.22, shoulder + 0.44 + capHeight * 0.5],
      [neck * 1.22, shoulder + 0.44 + capHeight],
      [0, shoulder + 0.44 + capHeight],
    ]),
    64,
  );
}

function jarGeometry(random: () => number): BufferGeometry {
  const width = 0.66 + random() * 0.2;
  const height = 0.8 + random() * 0.4;
  return new LatheGeometry(
    profile([
      [0, 0],
      [width, 0],
      [width, height],
      [width * 0.9, height + 0.1],
      [width * 0.94, height + 0.24],
      [0, height + 0.24],
    ]),
    56,
  );
}

function tubeGeometry(random: () => number): BufferGeometry {
  const width = 0.32 + random() * 0.14;
  const height = 1.5 + random() * 0.5;
  return new CapsuleGeometry(width, height, 12, 32);
}

function canGeometry(random: () => number): BufferGeometry {
  return new CylinderGeometry(0.46 + random() * 0.12, 0.46 + random() * 0.12, 1.6, 48, 1, false);
}

function geometryFor(kind: ModelKind, random: () => number): BufferGeometry {
  switch (kind) {
    case 'bottle':
      return bottleGeometry(random);
    case 'jar':
      return jarGeometry(random);
    case 'tube':
      return tubeGeometry(random);
    case 'can':
      return canGeometry(random);
    case 'box':
      return new BoxGeometry(1.1 + random() * 0.4, 1.5 + random() * 0.4, 0.5 + random() * 0.3);
    case 'slab':
      // A device: wide, thin, and only convincing with rounded corners, which
      // a BoxGeometry cannot do — so it is a flattened capsule on its side.
      return new BoxGeometry(2.2, 1.4, 0.09);
    case 'ring':
      return new TorusGeometry(0.8, 0.12 + random() * 0.1, 24, 72);
    case 'orb':
      return new SphereGeometry(0.85, 64, 48);
    case 'pebble': {
      // An icosahedron pushed about until it stops looking like one.
      const geometry = new IcosahedronGeometry(0.8, 3);
      const position = geometry.attributes.position;
      for (let index = 0; index < position.count; index += 1) {
        const scale = 0.84 + random() * 0.3;
        position.setXYZ(
          index,
          position.getX(index) * scale * 1.2,
          position.getY(index) * scale * 0.82,
          position.getZ(index) * scale,
        );
      }
      geometry.computeVertexNormals();
      return geometry;
    }
    default:
      return new IcosahedronGeometry(0.9, 1);
  }
}

/**
 * The materials.
 *
 * The glass is not `transmission` glass, and that is a decision rather than an
 * oversight. Transmission refracts the WebGL scene, and this canvas is
 * transparent over the site's own HTML — so there is nothing in the scene
 * behind the object to refract, and the material comes out as flat tinted
 * plastic. What reads as glass over a page is the other half of what glass
 * does: a sharp environment reflection, a bright specular edge, and the page
 * showing through by alpha. That is what is built here.
 */
export function materialFor(kind: MaterialKind, colour: ColorRepresentation): MeshPhysicalMaterial {
  const base = { color: colour, toneMapped: true };

  switch (kind) {
    case 'glass':
      return new MeshPhysicalMaterial({
        ...base,
        transparent: true,
        opacity: 0.42,
        roughness: 0.03,
        metalness: 0,
        ior: 1.52,
        // High, because the reflection is doing the work the refraction cannot.
        envMapIntensity: 2.6,
        reflectivity: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        specularIntensity: 1,
        // Both faces, so the far wall of the bottle is visible through the
        // near one — which is most of what tells the eye it is hollow.
        side: DoubleSide,
        depthWrite: false,
      });
    case 'frosted':
      return new MeshPhysicalMaterial({
        ...base,
        transparent: true,
        opacity: 0.62,
        roughness: 0.42,
        metalness: 0,
        ior: 1.45,
        envMapIntensity: 1.4,
        clearcoat: 0.5,
        clearcoatRoughness: 0.4,
        side: DoubleSide,
        depthWrite: false,
      });
    case 'liquid':
      return new MeshPhysicalMaterial({
        ...base,
        transparent: true,
        opacity: 0.78,
        roughness: 0.06,
        metalness: 0,
        ior: 1.36,
        envMapIntensity: 1.8,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
      });
    case 'chrome':
      return new MeshPhysicalMaterial({ ...base, metalness: 1, roughness: 0.04, envMapIntensity: 1.9 });
    case 'metal':
      return new MeshPhysicalMaterial({ ...base, metalness: 1, roughness: 0.32, envMapIntensity: 1.3 });
    case 'ceramic':
      return new MeshPhysicalMaterial({
        ...base,
        metalness: 0,
        roughness: 0.42,
        clearcoat: 0.6,
        clearcoatRoughness: 0.3,
        envMapIntensity: 0.9,
      });
    case 'stone':
      return new MeshPhysicalMaterial({ ...base, metalness: 0, roughness: 0.92, envMapIntensity: 0.6 });
    default:
      return new MeshPhysicalMaterial({
        ...base,
        metalness: 0.05,
        roughness: 0.5,
        clearcoat: 0.3,
        envMapIntensity: 0.9,
      });
  }
}

/**
 * One object, normalised.
 *
 * Scaled so its height is exactly 2 and recentred on its own middle, which is
 * what lets the choreography treat a bottle and a laptop as the same thing.
 * Without it every spec would need per-model fudge factors and no two sites
 * would compose the same way.
 */
export function buildActor(params: {
  model: ModelKind;
  material: MaterialKind;
  colour: ColorRepresentation;
  seed: number;
}): Object3D {
  const random = rng(params.seed);
  const geometry = geometryFor(params.model, random);

  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const height = Math.max(box.max.y - box.min.y, 0.0001);
  const scale = 2 / height;

  geometry.translate(
    -(box.max.x + box.min.x) / 2,
    -(box.max.y + box.min.y) / 2,
    -(box.max.z + box.min.z) / 2,
  );
  geometry.scale(scale, scale, scale);

  const mesh = new Mesh(geometry, materialFor(params.material, params.colour));
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  // A group, so the choreography can rotate the wrapper while an idle float
  // moves the mesh inside it without the two fighting over one transform.
  const group = new Object3D();
  group.add(mesh);
  return group;
}
