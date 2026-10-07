import { Scene } from '@/components/studio/Scene';
import { cn } from '@/components/ui/cn';
import { SHOWCASE_BLURB, SHOWCASE_TITLE, STUDIO_SHOWCASE } from '@/lib/studio';

/**
 * The cinematic wall at the bottom.
 *
 * Mixed widths rather than a tidy grid: eight identical rectangles read as a
 * template gallery, and the one thing this section exists to say is that these
 * are not templates. Each project keeps its own palette and its own scene.
 */
export function StudioShowcase() {
  return (
    <section className="mx-auto max-w-shell px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-[38px] leading-[1.08] text-ink-primary sm:text-[52px]">
          {SHOWCASE_TITLE}
        </h2>
        <p className="mt-4 text-[18px] leading-snug text-ink-secondary">{SHOWCASE_BLURB}</p>
{/* Said here as well as at the top. Somebody who lands on this
            section from a shared link sees eight finished-looking projects and
            nothing else, and the plan it needs is the one thing they cannot
            work out from the pictures. */}
        <p className="mt-3 text-[14.5px] text-ink-muted">
          Eight directions Studio builds in. 3D websites are on the Premium plan.
        </p>
      </div>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {STUDIO_SHOWCASE.map((project) => (
          <li
            key={project.id}
            className={cn(
              'group relative overflow-hidden rounded-card border border-hairline bg-raised',
              'transition duration-500 hover:border-white/25',
              project.wide ? 'lg:col-span-3' : 'lg:col-span-2',
            )}
          >
            <Scene
              shape={project.shape}
              tint={project.tint}
              live={false}
              className={cn(
                'transition-transform duration-700 group-hover:scale-[1.05]',
                project.wide ? 'h-64 sm:h-80' : 'h-56 sm:h-64',
              )}
            />

            {/* The caption sits over the scene and lifts on hover, which is
                the only motion here — eight cards animating on arrival is a
                page that cannot be read. */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-5 pt-14">
              <p className="text-[12.5px] uppercase tracking-[0.16em] text-accent">
                {project.category}
              </p>
              <p className="mt-1.5 font-display text-[22px] leading-tight text-ink-primary">
                {project.title}
              </p>
              <p className="mt-1.5 max-h-0 overflow-hidden text-[14.5px] leading-relaxed text-ink-secondary opacity-0 transition-all duration-500 group-hover:max-h-24 group-hover:opacity-100">
                {project.blurb}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
