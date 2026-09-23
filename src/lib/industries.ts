import { IDEAS, ideaBySlug, promptFor, type Idea } from './ideas';

/**
 * A page per kind of business, written to be found.
 *
 * Someone who needs a website does not search for "AI website builder". They
 * search for "website for my restaurant" or "gym website design". The home page
 * cannot answer both, so each trade gets its own page that names the thing they
 * asked for and shows what Lumen would build for it.
 *
 * These are not spun copies. Each one draws its sections, its palette and its
 * mock from the matching entry in `ideas.ts` — a real, hand-made design
 * direction — and carries questions that only that trade asks. A page that says
 * the same thing as eleven others with the noun swapped is a doorway page, and
 * Google has been demoting those since 2015.
 */
export interface IndustryFaq {
  question: string;
  answer: string;
}

export interface Industry {
  /** The URL segment under /for. Written as the thing people type. */
  slug: string;
  /** The idea in `ideas.ts` this page shows. */
  idea: string;
  /** Short label, for breadcrumbs and cards. */
  name: string;
  /** The <title>, which is also what shows in the result. */
  title: string;
  description: string;
  h1: string;
  /** Two or three sentences. The only prose above the fold. */
  intro: string;
  faqs: IndustryFaq[];
}

export const INDUSTRIES: Industry[] = [
  {
    slug: 'restaurant-website',
    idea: 'bistro',
    name: 'Restaurants',
    title: 'Restaurant website builder',
    description:
      'Build a restaurant website with the menu, table bookings, opening hours and directions on it — in about a minute, from one sentence about the place.',
    h1: 'A restaurant website, from one sentence',
    intro:
      'A restaurant site has one job on a Friday evening: show what is on, show when you are open, and let somebody book. Lumen writes all three from a description of the place, in a design chosen to suit the room rather than a stock template.',
    faqs: [
      {
        question: 'Can I change the menu myself afterwards?',
        answer:
          'Yes, and without touching code. Tell Lumen in chat — "swap the paneer tikka for the lamb chop, ₹480" — and it edits that item and republishes. The visual editor does the same by clicking the text on the page.',
      },
      {
        question: 'Does it take table bookings?',
        answer:
          'The booking form on the page sends every request straight to your enquiries list, and can hand it on to WhatsApp so the phone in the kitchen buzzes. It is not a seat-by-seat reservation system with a floor plan — it is the form most small restaurants actually use.',
      },
      {
        question: 'Will it pull in my Google listing?',
        answer:
          'If your restaurant is on Google Maps, Lumen can read the listing you already have — name, address, hours, phone, photos and reviews — so the site starts from the real place rather than from a name you typed.',
      },
    ],
  },
  {
    slug: 'gym-website',
    idea: 'gym',
    name: 'Gyms',
    title: 'Gym and fitness website builder',
    description:
      'Build a gym website with the class timetable, coach profiles, membership prices and a free-trial signup. One sentence in, a working site out.',
    h1: 'A gym website that fills the trial slots',
    intro:
      'People join a gym after they have looked at the timetable and decided they can make Tuesday at seven. Lumen puts the schedule, the coaches and the prices where that decision gets made, and puts a trial signup next to them.',
    faqs: [
      {
        question: 'Can members sign up for a free trial on the site?',
        answer:
          'Yes. The signup form is on the page and every submission lands in your enquiries list with the name, the phone number and which class they were looking at. You can have it forwarded to WhatsApp so nobody waits a day for a reply.',
      },
      {
        question: 'How do I update the timetable when classes move?',
        answer:
          'Say so in chat — "6am strength moves to 6:30, Tuesdays and Thursdays" — and Lumen rewrites that block and republishes. You do not regenerate the site, and nothing else on it changes.',
      },
      {
        question: 'Can I show membership prices?',
        answer:
          'Yes, as a proper price table with what each tier includes. If you would rather not publish prices, say that in the prompt and Lumen builds an enquiry-led page instead.',
      },
    ],
  },
  {
    slug: 'salon-website',
    idea: 'salon',
    name: 'Salons',
    title: 'Hair salon and spa website builder',
    description:
      'Build a salon website with the service price list, stylist profiles, a gallery and online booking enquiries — generated from a description of the salon.',
    h1: 'A salon website with the price list on it',
    intro:
      'The two questions a salon gets asked all day are what it costs and who is free. Lumen builds the price list and the stylist profiles first, in an editorial layout that gives the photographs room, and puts a booking enquiry beside them.',
    faqs: [
      {
        question: 'Can I list every service and price?',
        answer:
          'Yes — cut, colour, treatments, whatever the board in the salon says — grouped the way you group them. Prices are editable in chat afterwards, one line at a time.',
      },
      {
        question: 'Can clients book online?',
        answer:
          'The site takes booking enquiries — service, preferred stylist, preferred time — into your enquiries list and on to WhatsApp. It does not hold a live calendar or take deposits, so you confirm the slot yourself.',
      },
      {
        question: 'Can I show before-and-after photos?',
        answer:
          'Yes. Upload them and Lumen lays them out as a gallery. If you have no photographs yet, it can generate placeholder imagery in the right style so the page is not empty while you collect real ones.',
      },
    ],
  },
  {
    slug: 'dental-clinic-website',
    idea: 'dental',
    name: 'Clinics',
    title: 'Dental clinic and medical practice website builder',
    description:
      'Build a clinic website with treatment pages, the team, timings, insurance details and appointment enquiries — in a calm, credible design.',
    h1: 'A clinic website people trust on sight',
    intro:
      'A clinic site is read by somebody who is slightly worried. It has to look settled, say who the doctors are, explain the treatment plainly and make the appointment easy to ask for. Lumen builds it in that register by default — restrained type, plenty of air, nothing shouting.',
    faqs: [
      {
        question: 'Can I have a page per treatment?',
        answer:
          'Yes. Name the treatments in the prompt and Lumen builds a page for each, linked from the services list. You can add another later by asking for it in chat.',
      },
      {
        question: 'Is patient information handled safely?',
        answer:
          'Appointment enquiries go to your enquiries list, which only your account can read. Do not use the form to collect medical history or documents — it is a request-an-appointment form, not a records system, and Lumen is not a healthcare-compliance product.',
      },
      {
        question: 'Can I show timings and emergency contact?',
        answer:
          'Yes, and they go near the top rather than in the footer, because that is what somebody with a broken tooth on a Sunday is looking for.',
      },
    ],
  },
  {
    slug: 'photography-website',
    idea: 'photographer',
    name: 'Photographers',
    title: 'Photography portfolio website builder',
    description:
      'Build a photography website with full-bleed galleries, packages and an enquiry form — a portfolio that puts the work first.',
    h1: 'A photography site that gets out of the way',
    intro:
      'Photography sites fail by decorating. Lumen builds a quiet frame — large images, almost no chrome, type that stays out of the picture — and then puts the packages and the enquiry form where a couple who have just finished scrolling will find them.',
    faqs: [
      {
        question: 'How many galleries can I have?',
        answer:
          'As many as you ask for — weddings, portraits, editorial, each its own page. Ask in chat to add one and Lumen builds it in the same design as the rest.',
      },
      {
        question: 'Will my photographs load quickly?',
        answer:
          'Images you upload are served from storage at a size suited to the layout, and the published site is static HTML and CSS with no framework to download first. A gallery page is heavy by nature, but nothing else on the page adds to it.',
      },
      {
        question: 'Can I publish prices for packages?',
        answer:
          'Yes, as a package table. Many photographers prefer "from ₹X" or no figure at all — say which you want in the prompt and the page is built that way.',
      },
    ],
  },
  {
    slug: 'online-store',
    idea: 'roaster',
    name: 'Online stores',
    title: 'Online store builder with checkout',
    description:
      'Build an online store with product pages, a basket, checkout and orders to WhatsApp. Product photography is generated for you if you have none.',
    h1: 'An online store, products and all',
    intro:
      'Most site builders hand you a shop with nothing in it. Lumen writes the catalogue as part of the build, photographs each product, puts the stock and the departments on the home page rather than behind a "Shop" link, and wires a basket and a checkout that prices every order again on the server.',
    faqs: [
      {
        question: 'Where do the product photographs come from?',
        answer:
          'Lumen generates one per product during the build — a single object on a plain sweep, no text and no props — so the grid is not a wall of grey boxes on day one. Replace any of them with your own photograph from the shop manager whenever you have it.',
      },
      {
        question: 'How do I get the orders?',
        answer:
          'Every order lands in your orders list with the items, the delivery address and the total. It can also open in WhatsApp with the whole order written out, which is how most Indian small shops would rather work.',
      },
      {
        question: 'Does it take online payments?',
        answer:
          'Orders are placed and priced on the server, and you collect payment the way you already do — on delivery, by UPI, or on the phone. Card checkout on your own storefront is not wired up yet, so do not promise it to customers.',
      },
    ],
  },
  {
    slug: 'real-estate-website',
    idea: 'estate',
    name: 'Estate agents',
    title: 'Real estate agency website builder',
    description:
      'Build an estate agency website with property listings, agent profiles and a valuation enquiry form — generated from a description of the agency.',
    h1: 'An estate agency site built around the listings',
    intro:
      'An agency site lives or dies on the property list: a photograph, a price, an area, a bedroom count, scannable in a second. Lumen builds that list first and then the agents, the areas covered and the valuation request around it.',
    faqs: [
      {
        question: 'Can I add and remove properties as they sell?',
        answer:
          'Yes, in chat — "mark the Baner flat as sold and add a 3BHK in Kothrud at ₹1.4 crore" — and Lumen edits the list and republishes. Each edit is a diff, so the rest of the page is untouched.',
      },
      {
        question: 'Does it connect to a property portal feed?',
        answer:
          'No. Listings live on your Lumen site and are edited there. If you already publish to a portal you will be keeping two lists, which is worth knowing before you start.',
      },
      {
        question: 'Can buyers ask about a specific property?',
        answer:
          'Yes. The enquiry carries which property it came from into your enquiries list, so you are not guessing which flat somebody means.',
      },
    ],
  },
  {
    slug: 'plumber-website',
    idea: 'plumber',
    name: 'Trades',
    title: 'Plumber and electrician website builder',
    description:
      'Build a website for a plumbing, electrical or repair business — service areas, emergency callout, and a quote request that reaches your phone.',
    h1: 'A trade website for the 11pm search',
    intro:
      'Somebody with water coming through a ceiling is on their phone, on data, and will call whoever answers first. Lumen builds the page for that moment: the number enormous and tappable at the top, the areas you cover stated plainly, and a quote form that reaches you rather than an inbox you read on Sundays.',
    faqs: [
      {
        question: 'Will the phone number actually dial?',
        answer:
          'Yes — it is a tap-to-call link on mobile, in the header of every page rather than only in the footer.',
      },
      {
        question: 'Can I list the areas I cover?',
        answer:
          'Yes, by name. This is also the part that matters most for being found locally, so name every locality you work in rather than writing "and surrounding areas".',
      },
      {
        question: 'Do quote requests reach me straight away?',
        answer:
          'They land in your enquiries list, and you can have each one opened in WhatsApp so it arrives on the phone you already carry.',
      },
    ],
  },
  {
    slug: 'portfolio-website',
    idea: 'designer',
    name: 'Portfolios',
    title: 'Portfolio website builder for designers and freelancers',
    description:
      'Build a portfolio website with selected work, case studies, an about page and a contact form — a site that reads as considered rather than templated.',
    h1: 'A portfolio that does not look generated',
    intro:
      'A portfolio is judged on taste before it is read, which is a hard thing to automate. Lumen builds from a design direction chosen up front — the type pairing, the grid, the amount of motion — so the result is a coherent piece of design rather than a theme with your name in it.',
    faqs: [
      {
        question: 'Can I have a page per project?',
        answer:
          'Yes. Name the projects in the prompt and each gets its own case-study page, linked from the index. Add more later by asking in chat.',
      },
      {
        question: 'Can I change the design if I do not like it?',
        answer:
          'Yes, and specifically — "tighten the grid", "use a serif for headings", "less motion". Lumen edits the design system rather than rebuilding the site, so your content survives the change.',
      },
      {
        question: 'Can I put it on my own domain?',
        answer:
          'Yes. Lumen walks you through pointing a domain you own at the site, or publishes it on a lumensite.in address if you have not bought one yet.',
      },
    ],
  },
  {
    slug: 'saas-landing-page',
    idea: 'saas',
    name: 'SaaS',
    title: 'SaaS landing page builder',
    description:
      'Build a SaaS landing page with the problem, the features, pricing tiers and a signup call to action — written from a sentence about the product.',
    h1: 'A landing page for a product nobody has heard of yet',
    intro:
      'The hardest part of a SaaS landing page is the first two lines. Lumen writes them from what the product actually does, then builds the feature blocks, the pricing tiers and the signup around them, in a layout that keeps the call to action in view.',
    faqs: [
      {
        question: 'Can I have more than one pricing tier?',
        answer:
          'Yes — as many as you name, with what each includes and which one is highlighted. Change them in chat as your pricing moves.',
      },
      {
        question: 'Does the signup connect to my app?',
        answer:
          'The button points wherever you tell it to, including your existing signup URL. Signups collected on the page itself land in your enquiries list instead.',
      },
      {
        question: 'Can I add a changelog or docs later?',
        answer:
          'Yes. Ask for the page in chat and Lumen builds it in the same design system as the rest of the site.',
      },
    ],
  },
  {
    slug: 'yoga-studio-website',
    idea: 'yoga',
    name: 'Studios',
    title: 'Yoga and pilates studio website builder',
    description:
      'Build a yoga studio website with the class schedule, teacher profiles, class passes and a first-class booking enquiry.',
    h1: 'A studio website that feels like the room',
    intro:
      'A studio site should be quiet. Lumen builds it with room to breathe — soft palette, unhurried type, small blocks — and still puts the schedule, the teachers and the price of a first class where a beginner can find them without asking.',
    faqs: [
      {
        question: 'Can I show a weekly schedule?',
        answer:
          'Yes, laid out by day with the teacher and the level. Update it in chat when the term changes.',
      },
      {
        question: 'Can people buy a class pass on the site?',
        answer:
          'You can list passes and their prices, and take the enquiry. Taking payment for a pass on the page is not wired up yet, so you collect it the way you do now.',
      },
      {
        question: 'Can I write about the practice, not just the classes?',
        answer:
          'Yes. Ask for an about or philosophy page in the prompt and Lumen writes it in the same voice as the rest of the site rather than in marketing copy.',
      },
    ],
  },
  {
    slug: 'bakery-website',
    idea: 'bakery',
    name: 'Bakeries',
    title: 'Bakery and cafe website builder',
    description:
      'Build a bakery website with what comes out of the oven, the counter hours, pre-orders and directions — with orders reaching you on WhatsApp.',
    h1: 'A bakery site for people already nearby',
    intro:
      'Almost everybody who looks at a bakery website is within a mile of it and wants to know two things: what you have today and whether you are open. Lumen builds those two answers into the top of the page and puts pre-orders and directions underneath.',
    faqs: [
      {
        question: 'Can I take pre-orders for cakes?',
        answer:
          'Yes. The order form captures what, how many and for when, and can open in WhatsApp so it reaches the counter rather than an inbox.',
      },
      {
        question: 'What if the list changes every day?',
        answer:
          'Edit it in chat in a sentence, from your phone, before you open. That is faster than any admin panel and it republishes immediately.',
      },
      {
        question: 'Can I sell online as well as at the counter?',
        answer:
          'Yes — ask for a shop and Lumen builds product pages, a basket and a checkout, with the orders going to the same place as everything else.',
      },
    ],
  },
];

export function industryBySlug(slug: string): Industry | undefined {
  return INDUSTRIES.find((industry) => industry.slug === slug);
}

/** The idea a page renders. Every industry names one that exists. */
export function ideaFor(industry: Industry): Idea {
  const idea = ideaBySlug(industry.idea);
  if (!idea) throw new Error(`No idea "${industry.idea}" for /for/${industry.slug}`);
  return idea;
}

/** What the "Build this" button hands the generator, so the site matches the page. */
export function industryPrompt(industry: Industry): string {
  return promptFor(ideaFor(industry));
}

/** Every kind of business that has its own page — used by the ideas gallery too. */
export function industryForIdea(ideaSlug: string): Industry | undefined {
  return INDUSTRIES.find((industry) => industry.idea === ideaSlug);
}

/** Guards against an idea quietly losing its page when ideas.ts is edited. */
export const COVERED_IDEAS = new Set(INDUSTRIES.map((industry) => industry.idea));
export const ALL_IDEA_SLUGS = IDEAS.map((idea) => idea.slug);
