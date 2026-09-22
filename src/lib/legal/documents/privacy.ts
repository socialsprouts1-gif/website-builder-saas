import { COMPANY, detail } from '../company';
import type { LegalDocument } from '../types';

const UPDATED = '2026-09-22';
const contact = COMPANY.privacyEmail;

/**
 * Written from what the code actually does.
 *
 * Every claim here was checked against the schema and the request paths: what
 * is stored, where, for how long, and who it is sent to. A privacy policy
 * copied from a template is worse than none, because it describes a product
 * nobody built and is wrong in the exact places somebody would check.
 */
export const PRIVACY: LegalDocument = {
  slug: 'privacy-policy',
  title: 'Privacy Policy',
  summary: 'What Lumen collects, why, who it goes to, and how to get it back or deleted.',
  updated: UPDATED,
  group: 'Policies',
  intro: [
    `This policy covers ${COMPANY.name} at ${COMPANY.domain} — the tool you sign into to build websites. It is operated by ${detail(COMPANY.legalName, 'registered entity name')}, ${detail(COMPANY.address, 'registered office address')}.`,
    'It does not cover the websites people build with Lumen. Those belong to the businesses that made them, and each of them is responsible for its own visitors. Where Lumen stores something on their behalf — an enquiry, an order — we act on their instructions, and the Data Processing Agreement sets that out.',
  ],
  sections: [
    {
      heading: 'What we collect',
      blocks: [
        { p: 'Only what the product needs to work. In practice that is four things.' },
        {
          ul: [
            'Your account: the email address you sign up with, your name if you give one, and a password that is stored hashed by our authentication provider and never seen by us. If you sign in with Google, we receive your email address, name and profile picture from Google.',
            'What you build: the prompts you write, the screenshots and images you upload, the sites Lumen generates for you, every saved version of them, and the conversation in the editor.',
            'Your settings: a model preference, an OpenAI key if you choose to add your own, and any connector you authorise. Keys and connector tokens are encrypted before they are stored.',
            'Billing: if you subscribe, our payment provider handles the payment and tells us your subscription status, its period, and an invoice record. We never see or store your card details.',
          ],
        },
      ],
    },
    {
      heading: 'What we do not collect',
      blocks: [
        {
          ul: [
            'We do not use advertising cookies or trackers, and we do not sell or share anything for advertising.',
            'We do not build profiles of the visitors to the sites you publish. Visits are counted using a one-way hash of the visitor’s address, browser and the day, salted with a secret. The hash cannot be reversed, it changes daily, and no cookie is set to do it.',
            'We do not read your generated sites to train anything of our own.',
          ],
        },
      ],
    },
    {
      heading: 'Why we are allowed to hold it',
      blocks: [
        {
          ul: [
            'To provide the service you asked for — this covers your account, your projects and your generated sites.',
            'To take payment, where you have subscribed.',
            'Our legitimate interest in keeping the service working and secure: rate limiting, abuse prevention, and error logs that have credentials stripped out of them before they are written.',
            'Your consent, where you gave it — for example by connecting a third-party account.',
          ],
        },
      ],
    },
    {
      heading: 'Who else sees it',
      blocks: [
        { p: 'Lumen is built on other people’s infrastructure, and the following receive data because the product cannot run without them. Each is bound by its own terms and processes data on our instructions.' },
        {
          ul: [
            'Supabase — the database, file storage and authentication.',
            'Vercel — hosting for the application and for published sites.',
            'OpenAI — receives the text of your prompt, the screenshot you uploaded if you used one, and the content of the site being edited, in order to generate or change it. If you supply your own key, the request goes under your key and your agreement with them.',
            'Razorpay — payments and subscription management, where you subscribe.',
            'Google — where you sign in with Google, or import a business from a Google listing.',
          ],
        },
        { p: 'Nobody else. We do not sell personal data, and we do not disclose it except where the law requires it of us, and then only what is required.' },
      ],
    },
    {
      heading: 'Where it is held',
      blocks: [
        { p: 'On infrastructure operated by the providers above, which may process and store data outside your country. Where that happens, we rely on the providers’ own transfer safeguards and contractual terms.' },
      ],
    },
    {
      heading: 'How long we keep it',
      blocks: [
        {
          ul: [
            'Your account and projects: until you delete them, or until you close your account.',
            'Deleted projects: removed from the application immediately; backups age out on our provider’s cycle.',
            'Enquiries and orders captured on a site you published: held for you until you delete them, because they are your customers’ records, not ours.',
            'Page-view counts: kept as daily totals with no identifier attached.',
            'Error logs: kept for troubleshooting and pruned; credentials and tokens are removed before an error is written down.',
            'Billing records: kept as long as tax and accounting law requires.',
          ],
        },
      ],
    },
    {
      heading: 'What you can ask for',
      blocks: [
        { p: `Write to ${contact} and we will act on any of the following. We will confirm receipt and respond within 30 days.` },
        {
          ul: [
            'A copy of what we hold about you.',
            'A correction, where something is wrong.',
            'Deletion of your account and everything in it.',
            'A copy of your generated sites — you can also export these yourself at any time, without asking us.',
            'Withdrawal of a consent you gave, such as a connected account.',
            'An objection to how we are using something, or a restriction on it.',
          ],
        },
        { p: 'You never need our permission to leave. Every site you build can be exported as plain HTML and CSS and hosted anywhere.' },
      ],
    },
    {
      heading: 'Children',
      blocks: [
        { p: 'Lumen is for businesses and is not directed at children. We do not knowingly collect data from anyone under 18. If you believe a child has an account, write to us and we will remove it.' },
      ],
    },
    {
      heading: 'If something goes wrong',
      blocks: [
        { p: `If personal data is exposed in a way that is likely to harm you, we will tell you and the relevant authority without undue delay, describe what happened, and say what we have done about it.` },
        { p: `Complaints go to our Grievance Officer, ${detail(COMPANY.grievanceOfficer, 'name')}, at ${COMPANY.grievanceEmail}. If you are not satisfied, you may complain to your national data protection authority.` },
      ],
    },
    {
      heading: 'Changes',
      blocks: [
        { p: 'When this policy changes in a way that matters, we will say so in the product before the change takes effect. The date at the top is always the date of the current version.' },
      ],
    },
  ],
};

export const COOKIES: LegalDocument = {
  slug: 'cookie-policy',
  title: 'Cookie Policy',
  summary: 'Lumen sets the cookies it needs to keep you signed in, and no others.',
  updated: UPDATED,
  group: 'Policies',
  intro: [
    'Short, because there is not much to say. Lumen sets no advertising cookies and no analytics cookies.',
  ],
  sections: [
    {
      heading: 'What is set',
      blocks: [
        { p: 'Signing in sets session cookies from our authentication provider. They identify your browser to your account, and without them you would be signed out on every page. They are strictly necessary, and there is no version of the product that works without them.' },
        { p: 'Your browser may also keep a few preferences locally — the last language you used for voice input, whether you dismissed a tip. Those never leave your device and are not readable by us.' },
      ],
    },
    {
      heading: 'What is not set',
      blocks: [
        {
          ul: [
            'No advertising or retargeting cookies.',
            'No third-party analytics cookies.',
            'No cross-site tracking of any kind.',
          ],
        },
        { p: 'Page views on published sites are counted without a cookie at all, using a daily one-way hash that cannot be traced back to a person.' },
      ],
    },
    {
      heading: 'Your choices',
      blocks: [
        { p: 'Because everything set is strictly necessary, there is nothing to switch off that would leave you with a working product — which is why Cookie Preferences offers no toggles rather than offering fake ones. Blocking cookies in your browser will sign you out and keep you signed out.' },
        { p: 'Sites built with Lumen may set their own cookies if their owner adds something that does. That is between that site and its visitors.' },
      ],
    },
    {
      heading: 'Questions',
      blocks: [{ p: `Write to ${contact}.` }],
    },
  ],
};

export const DPA: LegalDocument = {
  slug: 'data-processing-agreement',
  title: 'Data Processing Agreement',
  summary: 'For when Lumen holds your customers’ data on your behalf — enquiries, orders, chat.',
  updated: UPDATED,
  group: 'Policies',
  intro: [
    'This applies when you publish a site with Lumen and your site collects information from your own customers: an enquiry form, a shop order, a conversation with the assistant.',
    'For that data you are the controller — it is your customers’ information and you decide what happens to it — and Lumen is your processor, acting on your instructions. This sets out what that means. It forms part of the Terms of Service and applies automatically; you do not need to sign anything.',
  ],
  sections: [
    {
      heading: 'What is covered',
      blocks: [
        {
          ul: [
            'Enquiries submitted through a form on a site you published: the name, contact details and message your visitor typed.',
            'Shop orders: the customer’s name, phone number, email, delivery address and what they ordered.',
            'Conversations with a site assistant you set up.',
            'Page-view counts for your site, which carry no identifier.',
          ],
        },
      ],
    },
    {
      heading: 'What we will do',
      blocks: [
        {
          ul: [
            'Process this data only to provide the service, and only on your instructions. Using it for anything of our own would require your agreement, and we do not ask.',
            'Keep it confidential, and make sure anyone with access is under the same obligation.',
            'Apply the measures described in the Security Policy.',
            'Help you respond if one of your customers asks for their data, and help you meet your own obligations if something goes wrong.',
            'Tell you without undue delay if we become aware of a breach affecting your data.',
            'Delete it when you delete it, or when you close your account.',
          ],
        },
      ],
    },
    {
      heading: 'Sub-processors',
      blocks: [
        { p: 'We use the providers listed in the Privacy Policy — Supabase, Vercel, OpenAI, Razorpay and Google — and each is bound to terms no weaker than these. If we add or change one in a way that affects your data, we will say so in the product, and you may object by closing your account and exporting your site.' },
      ],
    },
    {
      heading: 'Your responsibilities',
      blocks: [
        {
          ul: [
            'Having a lawful basis for collecting what your site collects, and telling your visitors what you do with it — your own site needs its own privacy notice.',
            'Not putting special category data, payment card numbers or government identifiers into a Lumen form. The forms are not built for them and we do not want them.',
            'Responding to your own customers’ requests. We will help; we cannot answer for you.',
          ],
        },
      ],
    },
    {
      heading: 'Audits and duration',
      blocks: [
        { p: 'On reasonable written notice we will provide the information needed to show we are meeting these obligations. This agreement lasts as long as we hold data on your behalf and ends when that data is deleted.' },
      ],
    },
    {
      heading: 'Contact',
      blocks: [{ p: `${contact}.` }],
    },
  ],
};
