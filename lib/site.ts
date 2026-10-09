// Business details shown on the legal pages, in the site footer and in
// emails. UK company law requires a company's website to show its
// registered name, number, place of registration and registered office.
export const SITE = {
  name: 'MarginCanary',
  url: 'https://margincanary.com',
  supportEmail: 'support@margincanary.com',
  legalUpdated: '8 October 2026',
  company: {
    name: 'Upwren Ltd',
    number: '17507839',
    registeredIn: 'England and Wales',
    registeredOffice: '66 Paul Street, London, EC2A 4NA, United Kingdom',
    // Set once the ICO data protection fee is paid (ico.org.uk).
    icoNumber: null as string | null,
  },
};

// "Upwren Ltd, a company registered in England and Wales (company number 17507839)"
export function companyDescription(): string {
  const c = SITE.company;
  return `${c.name}, a company registered in ${c.registeredIn} (company number ${c.number})`;
}

// One line for footers: name, number, place of registration and registered office.
export function companyFooterLine(): string {
  const c = SITE.company;
  return `${SITE.name} is a trading name of ${c.name}. Registered in ${c.registeredIn}, company number ${c.number}. Registered office: ${c.registeredOffice}.`;
}
