import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help centre',
  description: 'How each part of Lumen works, in the order you meet it.',
};

/**
 * The help centre.
 *
 * Grouped in the order somebody actually meets the product — build it, change
 * it, publish it, sell from it, get paid — rather than alphabetically, which
 * is a filing system rather than an explanation. Every answer is written from
 * what the product does today; where something is not built yet, it says so
 * instead of describing it hopefully.
 */

const SECTIONS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: 'Building a site',
    items: [
      {
        q: 'How long does a build take?',
        a: 'Three to five minutes for a full site. The home page appears first and you can look at it while the rest is written; each page shows up in the preview as it lands.',
      },
      {
        q: 'What should I write in the prompt?',
        a: 'What the business is, where it is, and who it is for. "Family dental clinic in Akola, open Sundays, mostly parents with young children" beats "professional dentist website" every time. Lumen fills in the rest.',
      },
      {
        q: 'Can I build from a photo or a screenshot?',
        a: 'Yes. Upload a screenshot, a poster, a visiting card or a menu and Lumen reads the structure and the details off it. Text is optional when you do.',
      },
      {
        q: 'Can I build from my Google listing?',
        a: 'Yes — From Google in the sidebar. Paste the share link from your Google Business Profile and Lumen reads your name, address, hours, photographs and reviews off it.',
      },
      {
        q: 'My build stopped part way',
        a: 'Press "Build it again" on the project. A build runs on our servers, but it needs a browser watching to start; if the tab closed at the wrong moment, restarting picks it up. Nothing is charged twice.',
      },
    ],
  },
  {
    title: 'Changing it',
    items: [
      {
        q: 'How do I change something?',
        a: 'Type it in the chat — "make the hero darker", "add a page about our team". Or use Visual edit to click the thing on the page and change it directly. Both write to the same files.',
      },
      {
        q: 'Can I undo?',
        a: 'Yes. Version history in the chat panel lists every save. Restore any one of them.',
      },
      {
        q: 'Can I add my own photographs?',
        a: 'Add, in the chat box, then pick the files. They upload straight to storage and Lumen puts them in the page. You can also generate photographs made for the business, which is the better option until you have real ones.',
      },
      {
        q: 'Can I change the whole look at once?',
        a: 'Three looks — Soft, Sharp and Warm — are offered under the chat, and the Design tab in the editor changes colours, fonts, corners and spacing for the whole site. Only the styling changes; your words and pictures stay as they are.',
      },
    ],
  },
  {
    title: 'Publishing',
    items: [
      {
        q: 'Where does my site live?',
        a: 'Publishing gives it an address on Lumen straight away. You can also point your own domain at it, or export the code and host it anywhere — it is plain HTML and CSS and it is yours.',
      },
      {
        q: 'Do changes go live automatically?',
        a: 'Yes, within about a minute of saving. There is no separate deploy step.',
      },
      {
        q: 'Does my site work on a phone?',
        a: 'Every generated site is built mobile-first from the same component library, and the preview has a phone size you can check it in.',
      },
    ],
  },
  {
    title: 'Enquiries, orders and the shop',
    items: [
      {
        q: 'Where do enquiries go?',
        a: 'The Results tab on the project. Every form on a published site files there with the page it came from. You can also have each one handed to WhatsApp as it arrives.',
      },
      {
        q: 'Can I sell things?',
        a: 'Yes. The Shop tab holds your products, categories, stock, delivery charges and the order book. A published shop has a product grid, product pages, a basket and a checkout, and orders arrive with the customer’s address.',
      },
      {
        q: 'How do customers pay me?',
        a: 'On delivery, or through your own payment link — Razorpay, UPI, Stripe — which the checkout shows after the order with the amount and the order number. Lumen never holds your money and takes no cut of it.',
      },
      {
        q: 'Do I need a payment gateway to start?',
        a: 'No. Pay-on-delivery is on by default, which is how most orders in India are paid for anyway.',
      },
    ],
  },
  {
    title: 'Your account and billing',
    items: [
      {
        q: 'What do credits do?',
        a: 'Building a site costs several credits and each change costs one. A free account gets a fresh allowance every day; a paid plan gets a much larger one.',
      },
      {
        q: 'Can I use my own OpenAI key?',
        a: 'Yes — API keys in Settings. Generation then runs on your key and your account, and Lumen stops metering it. The key is encrypted before it is stored.',
      },
      {
        q: 'How do I cancel?',
        a: 'Settings, then Billing, then Cancel. You keep the paid features until the end of the period you have paid for, and your sites stay published either way.',
      },
      {
        q: 'I forgot my password',
        a: 'Use the link on the log-in screen. We send a link that lasts an hour and works once.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-[34px] leading-tight text-ink-primary sm:text-[40px]">
        Help centre
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
        How each part works, in the order you meet it. If the answer is not here,{' '}
        <Link href="/support" className="text-accent hover:underline">
          write to us
        </Link>{' '}
        — and tell us what you were looking for, so it ends up on this page.
      </p>

      <nav aria-label="Sections" className="mt-8 flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.title}
            href={`#${slug(section.title)}`}
            className="rounded-pill border border-hairline px-3.5 py-1.5 text-[13px] text-ink-secondary transition hover:border-accent/40 hover:text-ink-primary"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="mt-12 space-y-12">
        {SECTIONS.map((section) => (
          <section key={section.title} id={slug(section.title)} className="scroll-mt-24">
            <h2 className="font-display text-[20px] text-ink-primary">{section.title}</h2>
            <div className="mt-4 space-y-2">
              {section.items.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-card border border-hairline bg-raised px-4 py-3.5"
                >
                  <summary className="cursor-pointer list-none text-[14px] text-ink-primary marker:content-none">
                    <span className="mr-2 text-ink-muted transition group-open:rotate-90 inline-block">
                      ›
                    </span>
                    {item.q}
                  </summary>
                  <p className="mt-2.5 pl-5 text-[13.5px] leading-relaxed text-ink-secondary">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-14 border-t border-hairline pt-6 text-[13.5px] leading-relaxed text-ink-muted">
        Still stuck?{' '}
        <Link href="/support" className="text-accent hover:underline">
          Support
        </Link>{' '}
        reaches the people who built this.
      </p>
    </div>
  );
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
