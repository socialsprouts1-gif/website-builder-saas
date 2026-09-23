import Link from 'next/link';
import { cn } from './cn';

/**
 * The Lumen mark: the folded L on its near-black tile. It is artwork rather
 * than a drawing in code, so it stays the same mark here, in the browser tab
 * and on a phone's home screen — see `src/app/icon.png`, `apple-icon.png` and
 * `favicon.ico`, which are cut from the same file.
 *
 * The tile's rounded corners are transparent in the PNG, so the mark sits on a
 * dark surface as the green L alone and on a light one as the full tile.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/lumen-mark.png"
      alt=""
      width={size}
      height={size}
      className={cn('select-none', className)}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="font-display text-[19px] tracking-tight text-ink-primary">Lumen</span>
    </Link>
  );
}
