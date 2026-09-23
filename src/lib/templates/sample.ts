import type { Blueprint } from './types';

/**
 * A plausible business per industry, so a template preview reads like a site
 * rather than like a wireframe.
 *
 * This is the only place in the product where Lumen writes copy that is not
 * about a real business, and it exists for one reason: somebody choosing a
 * template has to see what the shape does to real sentences. Boxes labelled
 * "Heading" tell them nothing, and every builder that previews templates that
 * way is asking people to imagine the result.
 *
 * The preview page says plainly that the words and colours are a stand-in.
 */
export interface SampleBusiness {
  name: string;
  tagline: string;
  city: string;
  /** Four to six things they do, with a price where a price is normal. */
  offers: { title: string; body: string; meta?: string }[];
  /** What somebody vouching for them would be called. */
  marks: { title: string; meta: string }[];
  /** The claim the "why us" section makes, and three specifics under it. */
  claim: { heading: string; body: string; points: { title: string; body: string }[] };
  stats: { title: string; body: string }[];
  faq: { title: string; body: string }[];
}

const SAMPLES: Record<string, SampleBusiness> = {
  health: {
    name: 'Nova Dental',
    tagline: 'Family dentistry in Shivaji Nagar, with same-day emergency slots',
    city: 'Pune',
    offers: [
      { title: 'Check-up and clean', body: 'Examination, scaling and polish, with x-rays if needed.', meta: '₹800' },
      { title: 'Root canal', body: 'Single sitting where the tooth allows it, under local anaesthetic.', meta: 'from ₹4,500' },
      { title: 'Braces and aligners', body: 'Metal, ceramic or clear aligners, with a plan before you start.', meta: 'from ₹35,000' },
      { title: 'Implants', body: 'Titanium implant and crown, placed and restored in this clinic.', meta: 'from ₹28,000' },
      { title: 'Whitening', body: 'In-chair whitening in one 90-minute appointment.', meta: '₹6,000' },
    ],
    marks: [
      { title: 'Indian Dental Association', meta: 'Member clinic' },
      { title: 'ISO 9001', meta: 'Certified' },
      { title: 'Digital OPG', meta: 'On site' },
      { title: '18 years', meta: 'In practice' },
    ],
    claim: {
      heading: 'Why people stay with this clinic',
      body: 'A written estimate before anything starts, and the same dentist at every visit.',
      points: [
        { title: 'One dentist', body: 'You see the same person each time, not whoever is free.' },
        { title: 'Written estimates', body: 'Signed and agreed before treatment begins. No additions later.' },
        { title: 'Same-day emergencies', body: 'Two slots held open every day for pain that cannot wait.' },
      ],
    },
    stats: [
      { title: '18 years', body: 'In Shivaji Nagar' },
      { title: '9,400', body: 'Patients treated' },
      { title: '4.8★', body: 'On Google' },
      { title: '2', body: 'Emergency slots daily' },
    ],
    faq: [
      { title: 'Do you take insurance?', body: 'We work with most cashless providers. Bring your card and we will check before treatment.' },
      { title: 'How long does a root canal take?', body: 'Usually one sitting of about 90 minutes. Complicated cases take two.' },
      { title: 'Do you see children?', body: 'Yes, from age three. First visits are short and nothing is done on the day.' },
    ],
  },
  food: {
    name: 'Bistro Lunaire',
    tagline: 'Twelve tables in Bandra. A short seasonal menu, six nights a week',
    city: 'Mumbai',
    offers: [
      { title: 'Oyster, apple, dill', body: 'Three from the west coast, dressed at the pass.', meta: '₹640' },
      { title: 'Duck, cherry, farro', body: 'Aged eight days, served pink.', meta: '₹1,180' },
      { title: 'Cacio e pepe', body: 'Rolled here each morning, finished with Tellicherry pepper.', meta: '₹780' },
      { title: 'Burnt honey tart', body: 'With crème fraîche and a spoon of sea salt.', meta: '₹520' },
      { title: 'Amaro and orange', body: 'Bitter, cold, and the right way to end.', meta: '₹480' },
    ],
    marks: [
      { title: 'Condé Nast Traveller', meta: 'Hot table 2025' },
      { title: 'FSSAI', meta: 'Licensed' },
      { title: 'Slow Food', meta: 'Member kitchen' },
      { title: '4.7★', meta: 'Google' },
    ],
    claim: {
      heading: 'A short menu, changed often',
      body: 'Nine dishes at a time, rewritten whenever the market gives us a reason.',
      points: [
        { title: 'Twelve tables', body: 'One sitting a night, so nobody is moved on.' },
        { title: 'Market-led', body: 'The menu is printed the morning it is served.' },
        { title: 'No corkage on Tuesdays', body: 'Bring a bottle worth opening.' },
      ],
    },
    stats: [
      { title: '12', body: 'Tables' },
      { title: '9', body: 'Dishes at a time' },
      { title: '6 nights', body: 'Tuesday to Sunday' },
      { title: '4.7★', body: 'On Google' },
    ],
    faq: [
      { title: 'Do you take walk-ins?', body: 'Two tables are held for walk-ins each night. Everything else is booked ahead.' },
      { title: 'Is there a vegetarian menu?', body: 'Four of the nine dishes are vegetarian, and the kitchen will adapt two more.' },
      { title: 'Can you do a private dinner?', body: 'The room seats twenty-four for a private booking, Monday or Tuesday.' },
    ],
  },
  retail: {
    name: 'Saira & Co.',
    tagline: 'Handloom sarees and everyday cotton, woven in Maharashtra',
    city: 'Nagpur',
    offers: [
      { title: 'Paithani silk saree', body: 'Handwoven in Yeola, with a traditional peacock border.', meta: '₹18,500' },
      { title: 'Cotton daily wear', body: 'Soft, washable, and cut for a working week.', meta: '₹1,450' },
      { title: 'Kurta set', body: 'Block-printed cotton with matching palazzo.', meta: '₹2,200' },
      { title: 'Dupatta', body: 'Chanderi, in nine colours.', meta: '₹950' },
    ],
    marks: [
      { title: 'Handloom Mark', meta: 'Government certified' },
      { title: 'GI Paithani', meta: 'Registered weave' },
      { title: 'Free delivery', meta: 'Over ₹2,000' },
      { title: '7-day returns', meta: 'No questions' },
    ],
    claim: {
      heading: 'Bought from the loom, not a warehouse',
      body: 'We buy from twenty-six weaving families in Yeola and Nagpur and pay before the piece is made.',
      points: [
        { title: 'Named weavers', body: 'Every saree carries the name of who wove it.' },
        { title: 'One price', body: 'No sale, no strike-through, no invented discount.' },
        { title: 'Returns that work', body: 'Seven days, refunded to the way you paid.' },
      ],
    },
    stats: [
      { title: '26', body: 'Weaving families' },
      { title: '11 years', body: 'Buying direct' },
      { title: '4.9★', body: 'On Google' },
      { title: '2 days', body: 'Dispatch' },
    ],
    faq: [
      { title: 'How long does delivery take?', body: 'Two working days to dispatch, three to five in transit across India.' },
      { title: 'Can I return a saree?', body: 'Within seven days, unworn and with the tag on. Refunds go back the way you paid.' },
      { title: 'Do you ship abroad?', body: 'Yes, to twelve countries. Shipping is quoted at checkout.' },
    ],
  },
  fitness: {
    name: 'Ironworks Strength',
    tagline: 'Coached barbell training in Kothrud, six days a week',
    city: 'Pune',
    offers: [
      { title: 'Strength foundations', body: 'Eight weeks, three sessions a week, coached in groups of six.', meta: '₹6,000/month' },
      { title: 'Open gym', body: 'Full access to racks, platforms and the coach on the floor.', meta: '₹3,200/month' },
      { title: 'Personal coaching', body: 'One to one, programmed around your week.', meta: '₹1,200/session' },
      { title: 'Youth athletics', body: 'For 13 to 17, twice a week after school.', meta: '₹4,000/month' },
    ],
    marks: [
      { title: 'Starting Strength', meta: 'Coached method' },
      { title: 'REPS India', meta: 'Certified coaches' },
      { title: 'First aid', meta: 'All staff' },
      { title: '4.9★', meta: 'Google' },
    ],
    claim: {
      heading: 'Coached, not supervised',
      body: 'Every session has a coach on the floor. Nobody is left to work it out from a poster.',
      points: [
        { title: 'Six to a group', body: 'Small enough to be corrected on the lift you are doing.' },
        { title: 'Written programmes', body: 'You know what you are doing before you arrive.' },
        { title: 'Free first week', body: 'Train the full week before paying anything.' },
      ],
    },
    stats: [
      { title: '6 days', body: 'Open every week' },
      { title: '340', body: 'Members' },
      { title: '7 coaches', body: 'On the floor' },
      { title: '4.9★', body: 'On Google' },
    ],
    faq: [
      { title: 'I have never lifted before. Is that fine?', body: 'Most people start here. The foundations course assumes nothing.' },
      { title: 'Can I freeze my membership?', body: 'Yes, up to two months a year, for travel or injury.' },
      { title: 'Do you have a women-only slot?', body: 'Yes, 11am to 1pm on weekdays.' },
    ],
  },
  beauty: {
    name: 'Atelier Hair',
    tagline: 'Cutting and colour in the old quarter, by appointment',
    city: 'Bengaluru',
    offers: [
      { title: 'Cut and finish', body: 'Consultation, cut and blow-dry. Allow 45 minutes.', meta: '₹1,400' },
      { title: 'Global colour', body: 'Single process, ammonia-free, with a bond treatment.', meta: 'from ₹3,200' },
      { title: 'Balayage', body: 'Hand-painted, with toner and gloss.', meta: 'from ₹5,500' },
      { title: 'Keratin treatment', body: 'Three hours, lasts three to four months.', meta: '₹7,500' },
    ],
    marks: [
      { title: 'Wella Professionals', meta: 'Partner salon' },
      { title: 'Olaplex', meta: 'Certified' },
      { title: 'Cruelty-free', meta: 'Whole shelf' },
      { title: '4.8★', meta: 'Google' },
    ],
    claim: {
      heading: 'A cut that grows out well',
      body: 'Cut dry, checked in the mirror you actually use, and shaped so week six still works.',
      points: [
        { title: 'Consultation first', body: 'Fifteen minutes before a single cut is made.' },
        { title: 'Same stylist', body: 'Book the person, not the slot.' },
        { title: 'Honest about colour', body: 'If it will damage your hair we will say so.' },
      ],
    },
    stats: [
      { title: '9 years', body: 'On this street' },
      { title: '5 stylists', body: 'In the chair' },
      { title: '45 min', body: 'A cut and finish' },
      { title: '4.8★', body: 'On Google' },
    ],
    faq: [
      { title: 'Do I need an appointment?', body: 'Yes. We keep one chair for walk-ins on weekday mornings.' },
      { title: 'How much is a colour correction?', body: 'It is quoted after a free consultation — the price depends on what is already on the hair.' },
      { title: 'Do you do bridal?', body: 'Yes, in the salon or on location, booked at least six weeks ahead.' },
    ],
  },
  property: {
    name: 'Terrace Estates',
    tagline: 'Flats and plots across west Pune, sold without the runaround',
    city: 'Pune',
    offers: [
      { title: '3BHK, Baner', body: '1,450 sq ft, east facing, covered parking.', meta: '₹1.35 crore' },
      { title: '2BHK, Kothrud', body: '980 sq ft, eleventh floor, ready to move.', meta: '₹92 lakh' },
      { title: 'Plot, Bhugaon', body: '2,400 sq ft, N.A. sanctioned, clear title.', meta: '₹68 lakh' },
      { title: '4BHK duplex, Balewadi', body: '2,900 sq ft with a private terrace.', meta: '₹2.4 crore' },
    ],
    marks: [
      { title: 'MahaRERA', meta: 'Registered agent' },
      { title: 'NAR India', meta: 'Member' },
      { title: 'Title verified', meta: 'Every listing' },
      { title: '4.6★', meta: 'Google' },
    ],
    claim: {
      heading: 'Every listing has been walked',
      body: 'We do not list a property we have not stood in, and the photographs are ours.',
      points: [
        { title: 'Verified titles', body: 'Checked by our panel advocate before it is listed.' },
        { title: 'Real photographs', body: 'Taken on the day, unedited, no renders.' },
        { title: 'One agent', body: 'The same person from viewing to registration.' },
      ],
    },
    stats: [
      { title: '14 years', body: 'In west Pune' },
      { title: '610', body: 'Homes sold' },
      { title: '9 areas', body: 'Covered' },
      { title: '4.6★', body: 'On Google' },
    ],
    faq: [
      { title: 'Do you charge buyers a fee?', body: 'One per cent on completion, agreed in writing before any viewing.' },
      { title: 'Can you help with the home loan?', body: 'We introduce you to three lenders and leave the choice to you.' },
      { title: 'How fast can a sale close?', body: 'Six to eight weeks with a loan, three without.' },
    ],
  },
  software: {
    name: 'Ledgerly',
    tagline: 'Invoices that chase themselves, for freelancers who hate admin',
    city: 'Bengaluru',
    offers: [
      { title: 'Automatic reminders', body: 'Polite, escalating, and stopped the moment a client pays.', meta: 'All plans' },
      { title: 'GST-ready invoices', body: 'Correct format, correct numbering, exported for your CA.', meta: 'All plans' },
      { title: 'Payment links', body: 'UPI and card on every invoice, settled to your account.', meta: 'All plans' },
      { title: 'Expense capture', body: 'Photograph a bill and it lands in the right month.', meta: 'Pro' },
    ],
    marks: [
      { title: 'Razorpay', meta: 'Payments' },
      { title: 'Zoho Books', meta: 'Two-way sync' },
      { title: 'Google Drive', meta: 'Backups' },
      { title: 'ISO 27001', meta: 'Certified' },
    ],
    claim: {
      heading: 'The invoice is not the problem. The chasing is.',
      body: 'Sending one takes two minutes. Getting paid for it takes six weeks and four awkward emails you did not want to write.',
      points: [
        { title: 'It chases for you', body: 'Three reminders on a schedule you set once.' },
        { title: 'It stops on payment', body: 'Nobody gets chased for money they already sent.' },
        { title: 'It keeps the record', body: 'Every invoice, reminder and receipt in one export.' },
      ],
    },
    stats: [
      { title: '11 days', body: 'Faster payment, on average' },
      { title: '4,200', body: 'Freelancers' },
      { title: '₹38 crore', body: 'Invoiced last year' },
      { title: '99.9%', body: 'Uptime' },
    ],
    faq: [
      { title: 'Does it work with my accountant?', body: 'Yes — exports to Tally and Zoho Books, and your CA can be given read-only access.' },
      { title: 'Is there a free plan?', body: 'Five invoices a month, free forever, with every feature.' },
      { title: 'Where is my data?', body: 'In Mumbai, on AWS, encrypted at rest. Export everything at any time.' },
    ],
  },
};

/** Industries without a sample of their own borrow the closest one. */
const BORROWS: Record<string, string> = {
  hospitality: 'food',
  events: 'food',
  education: 'fitness',
  creative: 'beauty',
  professional: 'health',
  agency: 'software',
  automotive: 'property',
  trades: 'property',
  community: 'fitness',
};

export function sampleFor(blueprint: Blueprint): SampleBusiness {
  return SAMPLES[blueprint.industry] ?? SAMPLES[BORROWS[blueprint.industry] ?? 'health'];
}

export const SAMPLE_INDUSTRIES = Object.keys(SAMPLES);
