/**
 * Who Lumen legally is.
 *
 * Every legal document reads from here, so the business's name, address and
 * contact details are correct in fifteen places or wrong in none. Change them
 * once.
 *
 * The fields marked below are the ones a lawyer and a payment gateway will
 * both ask for, and they are the ones that cannot be guessed. Until they are
 * filled in, every legal page shows a visible notice saying so rather than
 * quietly publishing a placeholder as though it were a real registered
 * address — which is the sort of detail that invalidates the document it
 * appears in.
 */

export interface Company {
  /** Trading name, as customers know it. */
  name: string;
  /** Registered entity name. Different from the trading name in most cases. */
  legalName: string;
  /** Registered office. Required by the IT Rules and by payment gateways. */
  address: string;
  /** Where disputes are heard. */
  jurisdiction: string;
  country: string;
  /** General contact, and the one printed on invoices. */
  email: string;
  /** Privacy questions and data requests. */
  privacyEmail: string;
  /**
   * The Grievance Officer, named and reachable within the country.
   *
   * Required of an intermediary in India by the Information Technology
   * (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
   */
  grievanceOfficer: string;
  grievanceEmail: string;
  /** Where the site lives. */
  domain: string;
  /** GSTIN, when registered. Empty is honest for a business below threshold. */
  gstin: string;
}

/** The value that means "nobody has filled this in yet". */
export const UNSET = '';

export const COMPANY: Company = {
  name: 'Lumen',
  legalName: UNSET,
  address: UNSET,
  jurisdiction: UNSET,
  country: 'India',
  email: 'socialsprouts1@gmail.com',
  privacyEmail: 'socialsprouts1@gmail.com',
  grievanceOfficer: UNSET,
  grievanceEmail: 'socialsprouts1@gmail.com',
  domain: 'lumensite.in',
  gstin: UNSET,
};

/** The details that must be filled in before these documents mean anything. */
export const REQUIRED_FIELDS: (keyof Company)[] = [
  'legalName',
  'address',
  'jurisdiction',
  'grievanceOfficer',
];

export function missingCompanyDetails(company: Company = COMPANY): (keyof Company)[] {
  return REQUIRED_FIELDS.filter((field) => !String(company[field] ?? '').trim());
}

/**
 * A value, or a marker that reads as unfinished rather than as a fact.
 *
 * "[registered office address]" on a live page is embarrassing. An address
 * that is simply wrong is worse than embarrassing, so the placeholder is
 * deliberately conspicuous.
 */
export function detail(value: string, label: string): string {
  return value.trim() || `[${label} — not set]`;
}
