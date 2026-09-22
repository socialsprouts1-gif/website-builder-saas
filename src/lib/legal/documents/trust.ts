import { COMPANY, detail } from '../company';
import type { LegalDocument } from '../types';

const UPDATED = '2026-09-22';

export const SECURITY: LegalDocument = {
  slug: 'security-policy',
  title: 'Security Policy',
  summary: 'How Lumen is built to keep one account’s work out of another’s.',
  updated: UPDATED,
  group: 'Trust',
  intro: [
    'What is actually in place, described as it is rather than as a list of certifications we do not hold.',
  ],
  sections: [
    {
      heading: 'Separating accounts',
      blocks: [
        { p: 'Every row that belongs to a person is protected at the database level by row-level security, so a query can only return that person’s data even if the code asking for it is wrong. Every request that changes something also checks ownership explicitly, so neither of those two things is the only thing standing between two accounts.' },
      ],
    },
    {
      heading: 'Generated code',
      blocks: [
        { p: 'A website written by a model is untrusted output. In the editor it runs inside a sandboxed frame with no access to Lumen’s cookies or page. Published, it runs under a strict content security policy: no scripts but its own, no framing by other sites, no form posting off to anywhere else. The visual editor never lets the browser author markup — it names a section and the server decides what that becomes.' },
      ],
    },
    {
      heading: 'Secrets',
      blocks: [
        {
          ul: [
            'API keys and connector tokens are encrypted before they are stored, and decrypted only to make the request they are for.',
            'Passwords are handled by our authentication provider and never reach us.',
            'Card details never reach us at all — payments are handled by the payment provider.',
            'Errors have keys, bearer tokens and JSON web tokens stripped out before they are written to a log.',
          ],
        },
      ],
    },
    {
      heading: 'Access',
      blocks: [
        { p: 'Administrative access is limited to the people who run Lumen and is used for operating the service — investigating a fault, answering a support request. We do not read customer projects for any other reason.' },
      ],
    },
    {
      heading: 'Abuse and load',
      blocks: [
        { p: 'Requests that cost money or send mail are rate limited per account and per address. Public forms carry a hidden field no person fills in, which stops most automated submissions without putting a puzzle in front of a real customer.' },
      ],
    },
    {
      heading: 'What we do not claim',
      blocks: [
        { p: 'Lumen is a young product. We do not hold ISO 27001 or SOC 2, we do not run a formal penetration testing programme yet, and we do not offer a service level guarantee. If you need those, say so before you build something important on it, and we will tell you honestly where we are.' },
      ],
    },
    {
      heading: 'If something happens',
      blocks: [
        { p: `If data is exposed, we will investigate, stop it, tell the people affected and the relevant authority without undue delay, and say what we found. To report a vulnerability, see Responsible Disclosure; for anything else security-related, write to ${COMPANY.email}.` },
      ],
    },
  ],
};

export const DISCLOSURE: LegalDocument = {
  slug: 'responsible-disclosure',
  title: 'Responsible Disclosure',
  summary: 'Found a security hole? Here is how to tell us, and what we promise in return.',
  updated: UPDATED,
  group: 'Trust',
  intro: [
    'If you have found a vulnerability in Lumen, we want to hear about it, and we would rather hear about it from you than from somebody using it.',
  ],
  sections: [
    {
      heading: 'How to report',
      blocks: [
        { p: `Email ${COMPANY.email} with “Security” in the subject. Tell us what you found, how to reproduce it, and what an attacker could do with it. A short proof of concept helps more than a scanner report.` },
        { p: 'Please give us a reasonable chance to fix it before telling anyone else.' },
      ],
    },
    {
      heading: 'What we promise',
      blocks: [
        {
          ul: [
            'We will acknowledge your report within 3 working days.',
            'We will tell you our assessment, and whether we are fixing it, within 10 working days.',
            'We will tell you when it is fixed.',
            'We will not take legal action against you for research carried out in good faith under the rules below, and we will credit you if you would like us to.',
          ],
        },
        { p: 'We do not currently run a paid bounty programme. We will say so plainly rather than leaving you hoping.' },
      ],
    },
    {
      heading: 'The rules',
      blocks: [
        {
          ul: [
            'Test only against your own account and your own projects.',
            'Do not access, change or delete anybody else’s data. If you stumble into someone else’s data, stop, and tell us what you saw and how.',
            'No denial of service, no load testing, no spam, no social engineering of our staff or our providers.',
            'Do not use an automated scanner against the published sites of our customers — they are somebody’s business, not a target.',
          ],
        },
      ],
    },
    {
      heading: 'Out of scope',
      blocks: [
        {
          ul: [
            'Findings that require a compromised device or a person to be tricked into pasting something into a console.',
            'Missing hardening headers with no demonstrated impact.',
            'Reports produced entirely by an automated tool with no analysis.',
            'Content on a site built by a customer — that is theirs. Report it under the Acceptable Use Policy instead.',
          ],
        },
      ],
    },
  ],
};

export const ACCESSIBILITY: LegalDocument = {
  slug: 'accessibility-statement',
  title: 'Accessibility Statement',
  summary: 'How accessible Lumen is, where it falls short, and how to tell us.',
  updated: UPDATED,
  group: 'Trust',
  intro: [
    `${COMPANY.name} is committed to being usable by as many people as possible, and we would rather describe where we currently are than claim a level we have not tested.`,
  ],
  sections: [
    {
      heading: 'What we aim for',
      blocks: [
        { p: 'WCAG 2.1 level AA. We are partially conformant: most of the application meets it, and the exceptions below do not.' },
      ],
    },
    {
      heading: 'What is in place',
      blocks: [
        {
          ul: [
            'Colour contrast is checked when a design is generated. Text on background, muted text, and text on the accent colour are each required to clear the AA ratio, and a generated palette that fails is corrected rather than published.',
            'Every page has a skip link, a single main landmark and a proper heading order.',
            'The application works from the keyboard, and focus is visible.',
            'Images carry alternative text, and the generator requires it rather than leaving it blank.',
            'The interface works down to a 390 pixel wide screen without horizontal scrolling.',
            'Forms have real labels, and errors are announced rather than only coloured.',
          ],
        },
      ],
    },
    {
      heading: 'Where we fall short',
      blocks: [
        {
          ul: [
            'The drag-to-reorder in the editor works with a mouse, a pen and a finger, but has no keyboard equivalent yet. The up and down controls next to each block do the same job and are reachable from the keyboard.',
            'The live preview is an embedded frame; a screen reader entering it is reading the generated website, which may itself have problems we did not introduce.',
            'We have not yet tested the whole application with every major screen reader.',
            'Voice input depends on your browser’s own speech support and is not available in all of them.',
          ],
        },
      ],
    },
    {
      heading: 'Sites built with Lumen',
      blocks: [
        { p: 'Generated sites inherit the accessible structure described above, because the markup comes from a fixed component library rather than from a model. What you add afterwards is yours: if you paste in an image without alternative text, or pick colours that do not contrast, the site will have that problem.' },
      ],
    },
    {
      heading: 'Tell us',
      blocks: [
        { p: `If something here is unusable for you, write to ${COMPANY.email} and tell us what you were trying to do and what got in the way. We will reply within 5 working days and tell you what we can do about it.` },
        { p: `Prepared by ${detail(COMPANY.legalName, 'registered entity name')} and based on our own assessment of the product.` },
      ],
    },
  ],
};
