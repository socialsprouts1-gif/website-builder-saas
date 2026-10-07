import { cn } from '@/components/ui/cn';
import type { SceneShape } from '@/lib/studio';

/**
 * A 3D scene, drawn with CSS.
 *
 * No WebGL and no library. A marketing page is not worth half a megabyte of
 * renderer, and a scene that fails to load on a mid-range Android is worse than
 * no scene at all — these are transformed divs, so they cost nothing and cannot
 * fail. The scenes inside the websites Lumen generates are built the same way,
 * for the same reasons plus one more: a published site runs under
 * `script-src 'self'`, where a CDN renderer would simply be blocked.
 *
 * Each shape is a different arrangement of the same primitives: planes, a
 * solid, a horizon, a scatter. Eight categories therefore read as eight kinds
 * of work rather than eight copies of one illustration.
 */
export function Scene({
  shape,
  tint = ['#d7ff3e', '#55691a'],
  className,
  dim = false,
  live = true,
}: {
  shape: SceneShape;
  tint?: [string, string];
  className?: string;
  /** Behind text, where the scene should not compete with the words. */
  dim?: boolean;
  /** Set false for the dozens of miniatures that must not all animate at once. */
  live?: boolean;
}) {
  const [near, far] = tint;

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ perspective: '900px', ['--near' as string]: near, ['--far' as string]: far }}
      aria-hidden
    >
      {/* The light. One source, low and behind, which is what gives a flat
          arrangement of rectangles a direction to sit in. */}
      <span
        className="pointer-events-none absolute left-1/2 top-[38%] h-[70%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[46px]"
        style={{ background: near, opacity: dim ? 0.07 : 0.12 }}
      />

      <div
        className={cn('absolute inset-0', live && 'lumen-scene-drift')}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <Shape shape={shape} dim={dim} />
      </div>

      {/* The floor it all stands on, and the shadow it casts onto it. */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}

function Shape({ shape, dim }: { shape: SceneShape; dim: boolean }) {
  const face = dim ? 0.5 : 1;

  switch (shape) {
    /** A site in space: sections stacked away from the reader. */
    case 'stack':
      return (
        <Stage>
          {[0, 1, 2, 3].map((index) => (
            <Plane
              key={index}
              z={-index * 42}
              y={index * 14 - 18}
              lit={index === 0}
              opacity={face * (1 - index * 0.18)}
              lines={index === 0 ? [62, 38] : [44, 70, 30]}
            />
          ))}
        </Stage>
      );

    /** One object, lit, turning. */
    case 'product':
      return (
        <Stage>
          <Plane z={-70} y={10} opacity={face * 0.3} lines={[50]} />
          <Solid />
          <Ring />
        </Stage>
      );

    /** A device at an angle, the mockup case. */
    case 'device':
      return (
        <Stage>
          <Plane z={-60} y={6} opacity={face * 0.25} lines={[40, 60]} />
          <div
            className="absolute left-1/2 top-1/2 h-[46%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border"
            style={{
              transform: 'rotateY(-24deg) rotateX(8deg) translateZ(18px)',
              borderColor: 'color-mix(in srgb, var(--near) 55%, transparent)',
              background: 'color-mix(in srgb, var(--near) 9%, transparent)',
              boxShadow: '0 24px 60px -24px var(--near)',
            }}
          >
            <span
              className="absolute inset-x-3 top-3 h-1.5 rounded-pill"
              style={{ background: 'var(--near)', opacity: 0.6 }}
            />
            <span className="absolute inset-x-3 top-7 h-1 rounded-pill bg-white/25" />
            <span className="absolute inset-x-3 top-10 h-1 w-1/2 rounded-pill bg-white/20" />
          </div>
        </Stage>
      );

    /** A page that answers the cursor: a band that curves through the frame. */
    case 'ribbon':
      return (
        <Stage>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="absolute left-1/2 top-1/2 h-[14%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-pill"
              style={{
                transform: `rotateX(66deg) rotateZ(${-18 + index * 14}deg) translateZ(${index * 26}px)`,
                background: index === 0 ? 'var(--near)' : 'var(--far)',
                opacity: face * (index === 0 ? 0.6 : 0.3),
                filter: 'blur(0.4px)',
              }}
            />
          ))}
        </Stage>
      );

    /** Work laid out in depth. */
    case 'grid':
      return (
        <Stage>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className="absolute left-1/2 top-1/2 h-[26%] w-[26%] rounded-[8px] border"
              style={{
                transform: `translate(-50%, -50%) translate3d(${((index % 3) - 1) * 72}px, ${
                  (Math.floor(index / 3) - 0.5) * 60
                }px, ${-index * 14}px) rotateY(-16deg)`,
                borderColor: 'color-mix(in srgb, var(--near) 40%, transparent)',
                background:
                  index === 1
                    ? 'color-mix(in srgb, var(--near) 22%, transparent)'
                    : 'rgba(255,255,255,0.03)',
                opacity: face,
              }}
            />
          ))}
        </Stage>
      );

    /** A floor with stock standing on it. */
    case 'room':
      return (
        <Stage>
          <div
            className="absolute left-1/2 top-[64%] h-[70%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border"
            style={{
              transform: 'rotateX(68deg)',
              borderColor: 'color-mix(in srgb, var(--near) 30%, transparent)',
              background:
                'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 34px), repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 34px)',
              opacity: face,
            }}
          />
          {[-1, 0, 1].map((offset) => (
            <div
              key={offset}
              className="absolute left-1/2 top-1/2 w-[14%] rounded-[6px]"
              style={{
                height: offset === 0 ? '42%' : '28%',
                transform: `translate(-50%, -50%) translate3d(${offset * 86}px, ${
                  offset === 0 ? -6 : 14
                }px, ${offset * -20}px)`,
                background: offset === 0 ? 'var(--near)' : 'var(--far)',
                opacity: face * (offset === 0 ? 0.85 : 0.5),
                boxShadow: offset === 0 ? '0 20px 50px -18px var(--near)' : undefined,
              }}
            />
          ))}
        </Stage>
      );

    /** A world behind the copy. */
    case 'terrain':
      return (
        <Stage>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="absolute inset-x-0 bottom-[28%]"
              style={{
                transform: `translateZ(${-index * 48}px) translateY(${index * -10}px)`,
                opacity: face * (1 - index * 0.2),
              }}
            >
              <div
                className="mx-auto h-[70px] w-[86%]"
                style={{
                  background: index === 0 ? 'var(--near)' : 'var(--far)',
                  opacity: index === 0 ? 0.55 : 0.4,
                  clipPath:
                    index % 2 === 0
                      ? 'polygon(0 100%, 14% 46%, 30% 76%, 48% 18%, 66% 62%, 84% 34%, 100% 100%)'
                      : 'polygon(0 100%, 20% 60%, 38% 28%, 56% 70%, 74% 40%, 100% 100%)',
                }}
              />
            </div>
          ))}
          <Sparks />
        </Stage>
      );

    /** A camera path: something circled rather than looked at. */
    case 'orbit':
    default:
      return (
        <Stage>
          {/* Two panels well behind the object, which is what gives the middle
              of the frame something to be in front of. */}
          <Plane z={-150} y={-30} opacity={face * 0.22} lines={[48, 30]} />
          <Plane z={-110} y={34} opacity={face * 0.16} lines={[36, 56, 24]} />
          <Ring />
          <Solid />
          <Sparks />
        </Stage>
      );
  }
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
      {children}
    </div>
  );
}

/** A section of a page, floating. */
function Plane({
  z,
  y,
  lit = false,
  opacity,
  lines,
}: {
  z: number;
  y: number;
  lit?: boolean;
  opacity: number;
  lines: number[];
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2 h-[42%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border"
      style={{
        transform: `translate3d(0, ${y}px, ${z}px) rotateX(10deg) rotateY(-18deg)`,
        borderColor: lit
          ? 'color-mix(in srgb, var(--near) 60%, transparent)'
          : 'rgba(255,255,255,0.12)',
        background: lit ? 'color-mix(in srgb, var(--near) 10%, transparent)' : 'rgba(255,255,255,0.03)',
        boxShadow: lit ? '0 22px 55px -22px var(--near)' : undefined,
        opacity,
      }}
    >
      <div className="flex h-full flex-col justify-center gap-2 px-5">
        {lines.map((width, index) => (
          <span
            key={index}
            className="block h-1.5 rounded-pill"
            style={{
              width: `${width}%`,
              background: lit && index === 0 ? 'var(--near)' : 'rgba(255,255,255,0.22)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The object in the middle: a real box, six faces, lit from one side.
 *
 * It was one rounded rectangle on a spin, which from most angles reads as a
 * card flipping rather than as a solid turning — the thing a 3D showcase can
 * least afford to look like. Six faces at the right offsets cost the same and
 * read as an object with a near side and a far one.
 *
 * Two elements deep because the spin sets `transform` outright: a single
 * element centred with a translate loses the translate on the first keyframe.
 */
const FACES: { transform: string; shade: number }[] = [
  { transform: 'translateZ(var(--half))', shade: 1 },
  { transform: 'rotateY(180deg) translateZ(var(--half))', shade: 0.4 },
  { transform: 'rotateY(90deg) translateZ(var(--half))', shade: 0.72 },
  { transform: 'rotateY(-90deg) translateZ(var(--half))', shade: 0.52 },
  { transform: 'rotateX(90deg) translateZ(var(--half))', shade: 0.95 },
  { transform: 'rotateX(-90deg) translateZ(var(--half))', shade: 0.3 },
];

function Solid() {
  return (
    // Square and fixed, because a cube's faces are pushed out by exactly half
    // its side: a percentage box whose width and height differ makes six
    // rectangles that meet at nothing, which is what it did.
    <div
      className="absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 sm:h-[160px] sm:w-[160px]"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div
        className="lumen-scene-spin relative h-full w-full [--half:66px] sm:[--half:80px]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {FACES.map((face) => (
          <span
            key={face.transform}
            className="absolute inset-0 rounded-[10px] border"
            style={{
              transform: face.transform,
              background: `color-mix(in srgb, var(--near) ${Math.round(face.shade * 82)}%, #0b0b09)`,
              borderColor: `color-mix(in srgb, var(--near) ${Math.round(face.shade * 60)}%, transparent)`,
              boxShadow: face.shade > 0.9 ? '0 0 40px -6px var(--near)' : undefined,
            }}
          />
        ))}
      </div>

      {/* What it is standing on. A solid with no contact shadow floats in a way
          that reads as a mistake rather than as weightlessness. */}
      <span
        className="pointer-events-none absolute left-1/2 top-full h-5 w-[130%] -translate-x-1/2 translate-y-6 rounded-[50%] blur-[16px]"
        style={{ background: 'var(--far)', opacity: 0.6 }}
      />
    </div>
  );
}

/** The camera's path around it. */
function Ring() {
  return (
    <div
      className="absolute left-1/2 top-1/2 h-[64%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border"
      style={{
        transform: 'rotateX(74deg)',
        borderColor: 'color-mix(in srgb, var(--near) 45%, transparent)',
      }}
    />
  );
}

/** Particles, kept to nine so the page does not pay for a snowstorm. */
function Sparks() {
  const dots = [
    [18, 24],
    [34, 62],
    [52, 18],
    [68, 48],
    [80, 70],
    [26, 80],
    [60, 86],
    [44, 36],
    [88, 30],
  ];
  return (
    <>
      {dots.map(([left, top], index) => (
        <span
          key={index}
          className="lumen-scene-float absolute h-1 w-1 rounded-full"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            background: 'var(--near)',
            opacity: 0.55,
            animationDelay: `${index * 0.42}s`,
          }}
        />
      ))}
    </>
  );
}
