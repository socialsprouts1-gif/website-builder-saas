import { COMPANY, detail } from '../company';
import type { LegalDocument } from '../types';

const UPDATED = '2026-09-22';

export const TERMS: LegalDocument = {
  slug: 'terms-of-service',
  title: 'Terms of Service',
  summary: 'The agreement between you and Lumen: what we owe you, what you owe us, and who owns what.',
  updated: UPDATED,
  group: 'Policies',
  intro: [
    `These terms are between you and ${detail(COMPANY.legalName, 'registered entity name')} (“${COMPANY.name}”, “we”), of ${detail(COMPANY.address, 'registered office address')}. Using Lumen means accepting them.`,
  ],
  sections: [
    {
      heading: 'The service',
      blocks: [
        { p: 'Lumen turns a description, a screenshot or a Google business listing into a website, and lets you keep changing it. You can preview it, publish it at an address we provide, put it on your own domain, or export the code and host it anywhere.' },
      ],
    },
    {
      heading: 'Your account',
      blocks: [
        {
          ul: [
            'You need an account, and the details on it must be true.',
            'You are responsible for what happens under your account, including keeping your password to yourself.',
            'One person, one account. Sharing a login is how people lose work.',
            'You must be 18 or over, or have the authority to accept these terms for a business.',
          ],
        },
      ],
    },
    {
      heading: 'Who owns what',
      blocks: [
        { p: 'You own what you put in and what comes out: your prompts, your uploads, and the websites Lumen generates for you. We claim no rights over them and we will not use your sites to promote Lumen without asking you first.' },
        { p: 'We own Lumen itself — the application, the editor, the component library the sites are assembled from, and the brand. You are licensed to use it while your account is open; you may not copy or resell the tool itself.' },
        { p: 'You grant us only the permission needed to run the service: to store your content, to send it to the providers listed in the Privacy Policy so a site can be generated, and to serve your published site to the people you give the link to.' },
      ],
    },
    {
      heading: 'What you put in',
      blocks: [
        { p: 'You are responsible for having the right to use everything you upload — photographs, logos, text, a brand name. Lumen cannot tell whether a picture is yours, and a generated site is published in your name, not ours.' },
        { p: 'The Acceptable Use Policy sets out what may not be built or published. Breaking it can cost you your account.' },
      ],
    },
    {
      heading: 'What the AI produces',
      blocks: [
        { p: 'Generated text and images are produced by a model and are not checked by a person. They can be wrong, generic, or unsuitable for your trade. Read your site before you publish it, and check anything that matters — prices, claims, qualifications, opening hours, anything a regulator would care about.' },
        { p: 'Two people describing similar businesses may get similar results. We do not promise a generated site is unique.' },
      ],
    },
    {
      heading: 'Paying',
      blocks: [
        {
          ul: [
            'Free accounts get a daily allowance of credits, which resets each day.',
            'A paid plan is billed monthly in advance, in Indian rupees, through our payment provider.',
            'Prices are as shown on the pricing page at the time you subscribe. If we change them, existing subscribers are told before the change applies to them.',
            'Taxes are added where they apply.',
            'A failed payment suspends the paid features, not your data. Your sites stay where they are.',
          ],
        },
        { p: 'Cancellation and refunds are covered by their own policies, and nothing here overrides your statutory rights.' },
      ],
    },
    {
      heading: 'Availability',
      blocks: [
        { p: 'We work to keep Lumen up but do not promise it will never be down. Maintenance, a provider outage, or a model that is slow or unavailable can all interrupt it. We do not offer a service level guarantee on any plan.' },
      ],
    },
    {
      heading: 'Ending it',
      blocks: [
        { p: 'You can close your account whenever you like, from Account settings. Export anything you want to keep first — closing it deletes your projects.' },
        { p: 'We may suspend or close an account that breaks these terms or the Acceptable Use Policy, that is being used to harm someone, or that we are legally required to stop serving. Where we can give notice first, we will.' },
      ],
    },
    {
      heading: 'Liability',
      blocks: [
        { p: 'Lumen is provided as it is. To the extent the law allows, we are not liable for lost profits, lost business, or the consequences of something a model wrote; and our total liability in any twelve-month period is limited to what you paid us in that period.' },
        { p: 'Nothing here limits liability for fraud, for death or personal injury caused by negligence, or for anything else that cannot be limited by law.' },
      ],
    },
    {
      heading: 'Law',
      blocks: [
        { p: `These terms are governed by the laws of ${COMPANY.country}, and the courts of ${detail(COMPANY.jurisdiction, 'jurisdiction')} have exclusive jurisdiction.` },
      ],
    },
    {
      heading: 'Changes',
      blocks: [
        { p: 'We will tell you in the product before a material change takes effect. Continuing to use Lumen afterwards means accepting the new version.' },
      ],
    },
    {
      heading: 'Contact',
      blocks: [{ p: `${COMPANY.email}.` }],
    },
  ],
};

export const ACCEPTABLE_USE: LegalDocument = {
  slug: 'acceptable-use-policy',
  title: 'Acceptable Use Policy',
  summary: 'What may not be built, published or sent with Lumen.',
  updated: UPDATED,
  group: 'Using Lumen',
  intro: [
    'Lumen publishes websites on our domain and sends email and messages on behalf of the people who build them. That makes what you publish our problem as well as yours. This is the short list of what is not allowed.',
  ],
  sections: [
    {
      heading: 'Do not use Lumen to',
      blocks: [
        {
          ul: [
            'Impersonate a business, person or public body you do not represent, or pass a site off as one that already exists.',
            'Sell what you may not sell: counterfeits, stolen goods, prescription medicines without authorisation, weapons, controlled substances, or anything else illegal where you or your customers are.',
            'Defraud people — fake shops, fake charities, investment schemes, fake reviews, invented qualifications or certifications.',
            'Publish sexual content involving children, content that sexualises minors in any way, or non-consensual intimate imagery. This ends an account immediately and is reported.',
            'Harass, threaten, or incite violence against anyone, or publish material that attacks people for who they are.',
            'Publish someone’s private information without their consent.',
            'Break into, overload or probe our systems or anyone else’s; send spam; or use a published site to distribute malware.',
            'Infringe copyright or trade marks — including uploading photographs, logos or copy that belong to someone else.',
            'Work around the credit allowance, rate limits or billing.',
          ],
        },
      ],
    },
    {
      heading: 'Automated generation does not change this',
      blocks: [
        { p: 'A site written by a model is still published under your name and is still your responsibility. Asking Lumen to produce something on this list is itself a breach, whether or not it succeeds.' },
      ],
    },
    {
      heading: 'What happens',
      blocks: [
        { p: 'Depending on what it is, we may remove the content, unpublish the site, suspend the account, or close it. Serious cases are reported to the relevant authority. Where the situation allows, we will tell you what we have done and why, and you may reply to us at the contact below.' },
      ],
    },
    {
      heading: 'Reporting something',
      blocks: [
        { p: `If a site published on ${COMPANY.domain} breaks this policy, write to ${COMPANY.grievanceEmail} with the address of the page and what is wrong with it. Security problems have their own route — see Responsible Disclosure.` },
      ],
    },
  ],
};

export const COMMUNITY: LegalDocument = {
  slug: 'community-guidelines',
  title: 'Community Guidelines',
  summary: 'How we expect people to behave in shared spaces — support, showcase, templates.',
  updated: UPDATED,
  group: 'Using Lumen',
  intro: [
    'These cover the places where Lumen users meet each other or meet us: support conversations, anything you submit to the showcase, and templates you publish for other people to use.',
  ],
  sections: [
    {
      heading: 'In support',
      blocks: [
        { p: 'Be straight with us and we will be straight with you. Describe what happened, what you expected, and what you saw. Abuse towards the people answering ends the conversation.' },
        { p: 'Do not paste API keys, passwords or customer records into a support message. If we need them, we will tell you a safer way.' },
      ],
    },
    {
      heading: 'In the showcase and templates',
      blocks: [
        {
          ul: [
            'Submit work that is yours, for a business that exists or is honestly described as a demonstration.',
            'Do not submit someone else’s site, or a site trading on a brand you do not own.',
            'A template you publish may be used by anyone, changed by them, and published by them. Do not publish one containing your real customer data, your contact details or your photographs unless you mean to give them away.',
          ],
        },
      ],
    },
    {
      heading: 'If you see something',
      blocks: [
        { p: `Tell us at ${COMPANY.grievanceEmail}. We would rather hear about it early.` },
      ],
    },
  ],
};

export const DISCLAIMER: LegalDocument = {
  slug: 'disclaimer',
  title: 'Disclaimer',
  summary: 'The limits of what Lumen and its generated content can be relied on for.',
  updated: UPDATED,
  group: 'Policies',
  intro: [
    'Plainly, so there is no surprise later.',
  ],
  sections: [
    {
      heading: 'Generated content is a draft',
      blocks: [
        { p: 'Lumen writes websites with a language model. The words, prices, opening hours, statistics and claims it produces are generated, not researched, and no person checks them before you see them. Read your site before publishing it. Anything a customer or a regulator would rely on — a price, a qualification, a medical or legal statement, an ingredient list, a safety instruction — is yours to verify.' },
      ],
    },
    {
      heading: 'Not professional advice',
      blocks: [
        { p: 'Nothing produced by Lumen, and nothing on this site, is legal, financial, medical or tax advice. The legal pages here describe how we run the service; they are not advice to you about your own business, and your own site needs its own policies written for what it actually does.' },
      ],
    },
    {
      heading: 'Third parties',
      blocks: [
        { p: 'Lumen connects to services we do not control — payment providers, hosting, analytics, Google listings, model providers. We are not responsible for their availability, their content, or their terms.' },
        { p: 'Where Lumen reads a public business listing, it reports what the listing says. If the listing is wrong, the site will be too.' },
      ],
    },
    {
      heading: 'Imagery',
      blocks: [
        { p: 'Generated photographs are synthetic. They do not depict your premises, your staff or your products, and should be replaced with real photographs before a site is used seriously. Photographs taken from a business listing belong to whoever contributed them, and it is your responsibility to have the right to publish them.' },
      ],
    },
    {
      heading: 'Telling us something is wrong',
      blocks: [
        { p: `If Lumen has written something about your business that is untrue, or published a photograph you own, write to ${COMPANY.email} with the address of the page and we will correct or remove it.` },
      ],
    },
  ],
};
