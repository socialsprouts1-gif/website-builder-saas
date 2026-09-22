import { COMPANY } from '../company';
import type { LegalDocument } from '../types';

const UPDATED = '2026-09-22';

/**
 * The four commerce policies.
 *
 * Two of them — shipping, and returns — do not really apply to software, and
 * the honest version says so in a sentence rather than inventing a delivery
 * timetable for a thing that is not delivered. They exist because an Indian
 * payment gateway asks for them by name during merchant onboarding, and
 * because a customer looking for one should find a straight answer.
 */

export const REFUNDS: LegalDocument = {
  slug: 'refund-policy',
  title: 'Refund Policy',
  summary: 'When money comes back, how long it takes, and what is not refundable.',
  updated: UPDATED,
  group: 'Policies',
  intro: [
    `Lumen is a monthly subscription. You can try it without paying: a free account gets a daily allowance of credits, which is enough to build a site and see what you are buying before you buy it.`,
  ],
  sections: [
    {
      heading: 'The first seven days',
      blocks: [
        { p: 'If you subscribe and it is not what you expected, write to us within 7 days of the payment and we will refund that month in full. You do not have to give a reason.' },
      ],
    },
    {
      heading: 'After that',
      blocks: [
        { p: 'A month already started is not refunded, because the service was available to you for it. Cancel and you keep the paid features until the end of the period you have paid for; nothing further is charged.' },
        { p: 'We do not pro-rate a part-used month.' },
      ],
    },
    {
      heading: 'When we refund anyway',
      blocks: [
        {
          ul: [
            'You were charged twice for the same period.',
            'You were charged after cancelling.',
            'Lumen was unavailable for a prolonged period within a month you paid for, through our fault.',
            'A payment was made on your card without your authority — tell us and your bank.',
          ],
        },
      ],
    },
    {
      heading: 'What is not refundable',
      blocks: [
        {
          ul: [
            'Credits that have been spent. Generating a site costs us money at the moment you press the button, whether or not you liked the result.',
            'A domain name bought through a registrar — that is between you and them, under their terms.',
            'Charges incurred on your own OpenAI key. Those never pass through us.',
          ],
        },
      ],
    },
    {
      heading: 'How to ask, and how long it takes',
      blocks: [
        { p: `Write to ${COMPANY.email} from the email address on the account, with the date and amount. We will reply within 3 working days.` },
        { p: 'Approved refunds are sent back to the original payment method. Our provider releases them within 5 to 7 working days; how long it then takes to appear is up to your bank, and is usually another 2 to 5.' },
      ],
    },
  ],
};

export const CANCELLATION: LegalDocument = {
  slug: 'cancellation-policy',
  title: 'Cancellation Policy',
  summary: 'How to stop paying, what happens to your sites, and how to come back.',
  updated: UPDATED,
  group: 'Policies',
  intro: ['Cancelling takes one click and needs no conversation with anybody.'],
  sections: [
    {
      heading: 'How',
      blocks: [
        { p: 'Settings, then Billing, then Cancel subscription. It takes effect immediately and no further payment is taken.' },
      ],
    },
    {
      heading: 'What happens to what you have paid for',
      blocks: [
        { p: 'You keep the paid features until the end of the period you have already paid for. We do not cut you off on the day you cancel.' },
        { p: 'After that the account continues on the free plan: your sites stay published, your projects stay where they are, and your daily credit allowance returns to the free one.' },
      ],
    },
    {
      heading: 'What happens to your sites',
      blocks: [
        { p: 'Nothing. Cancelling a subscription does not unpublish anything, delete anything, or take a custom domain away. Closing your account is a separate, deliberate action.' },
      ],
    },
    {
      heading: 'Closing the account entirely',
      blocks: [
        { p: 'Settings, then Account. This deletes your projects and unpublishes your sites, and it cannot be undone. Export anything you want to keep first — every site exports as plain HTML and CSS.' },
      ],
    },
    {
      heading: 'Coming back',
      blocks: [
        { p: 'Subscribe again at any time and the paid features return at once. Nothing is lost by pausing, as long as you did not close the account.' },
      ],
    },
    {
      heading: 'If you cannot cancel',
      blocks: [
        { p: `If the button does not work, or you no longer have access to the account, write to ${COMPANY.email} from the address the account was opened with and we will cancel it for you. We will confirm in writing, and no payment is taken after that.` },
      ],
    },
  ],
};

export const SHIPPING: LegalDocument = {
  slug: 'shipping-policy',
  title: 'Shipping Policy',
  summary: 'Nothing is shipped. Access is immediate.',
  updated: UPDATED,
  group: 'Policies',
  intro: [
    'Lumen is software delivered over the internet. There is no physical product, nothing is posted, and no delivery charge is ever added.',
  ],
  sections: [
    {
      heading: 'Delivery',
      blocks: [
        { p: 'Your account is available the moment you sign up. A paid plan takes effect as soon as the payment is confirmed, which is usually within a minute.' },
        { p: 'If a payment succeeded and the paid features have not appeared within 30 minutes, write to us and we will sort it out.' },
      ],
    },
    {
      heading: 'Where we are available',
      blocks: [
        { p: 'Anywhere with an internet connection. Prices are in Indian rupees and payment is taken by an Indian payment provider.' },
      ],
    },
    {
      heading: 'If you sell physical goods through a site you build',
      blocks: [
        { p: 'Your shop’s delivery charges and timescales are set by you, in the Shop tab, and shown to your own customers at checkout. They are yours, not ours — Lumen records the order and does not ship anything.' },
      ],
    },
    {
      heading: 'Contact',
      blocks: [{ p: `${COMPANY.email}.` }],
    },
  ],
};

export const RETURNS: LegalDocument = {
  slug: 'return-exchange-policy',
  title: 'Return / Exchange Policy',
  summary: 'There is nothing to return. What you probably want is the refund policy.',
  updated: UPDATED,
  group: 'Policies',
  intro: [
    'Lumen sells access to software, not goods. Nothing is delivered, so nothing can be returned or exchanged.',
  ],
  sections: [
    {
      heading: 'If you want your money back',
      blocks: [
        { p: 'See the Refund Policy. In short: within 7 days of a payment, for any reason, we refund it in full.' },
      ],
    },
    {
      heading: 'If you want a different plan',
      blocks: [
        { p: 'There is one paid plan, so there is nothing to exchange it for. Moving between free and paid is done in Billing and takes effect immediately.' },
      ],
    },
    {
      heading: 'If a customer of yours wants to return something',
      blocks: [
        { p: 'That is between you and them. A shop you build with Lumen should publish its own returns policy — your customers will look for it, and it is one of the first things a buyer checks.' },
      ],
    },
    {
      heading: 'Contact',
      blocks: [{ p: `${COMPANY.email}.` }],
    },
  ],
};
