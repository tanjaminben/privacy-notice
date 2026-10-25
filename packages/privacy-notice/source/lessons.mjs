// Teaching guidance is separate from the fictional company's processing facts.
// Legal examples were checked against the linked primary sources on 2026-10-20.
const gdpr = 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679';
const ico = 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/';
const informed = ico + 'individual-rights/the-right-to-be-informed/';
export const lessonSources = Object.freeze({
  gdpr,
  disclosure: informed + 'what-privacy-information-should-we-provide/',
  drafting: informed + 'how-should-we-draft-our-privacy-information/',
  retention: ico + 'data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/',
  cookies: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-storage-and-access-technologies/',
  marketing: 'https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/plan-direct-marketing/',
  california: 'https://oag.ca.gov/privacy/ccpa',
  children: 'https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions'
});
const S = lessonSources;
const law = (label, url = gdpr) => [label, url];
export const lessons = {
  who: {
    question: 'Why name the organization behind the notice?',
    why: 'People need to know who is accountable before they can act on anything else in the notice.',
    includeTitle: 'Name the responsible entity',
    include: 'Use the actual organization name, a working privacy contact, and the services covered. Add a representative or data protection officer contact when required.',
    avoidTitle: 'A brand name is not always enough',
    avoid: 'Check which legal entity makes the decisions. A product, parent company, and payment provider can have different responsibilities.',
    driver: 'EU GDPR Article 13(1)(a)–(b) addresses identity and relevant contact details.',
    refs: [law('EU GDPR · Article 13'), law('ICO · Privacy information to provide', S.disclosure)]
  },
  never: {
    question: 'Why explain advertising, sale, and profiling?',
    why: 'A reassuring promise is useful only when readers can tell exactly which practices it rules out.',
    includeTitle: 'Check the actual data flows',
    include: 'Review advertising tags, measurement vendors, and contracts before saying “we never sell.” Explain any significant automated decisions separately.',
    avoidTitle: 'Every kind of measurement is not the same',
    avoid: 'Page totals, subscriber-linked opens, and cross-site advertising need distinct explanations. Do not hide all three behind “analytics.”',
    driver: 'Covered California businesses must explain sale/sharing practices and applicable choices. EU GDPR Article 13(2)(f) covers relevant automated decisions.',
    refs: [law('California DOJ · CCPA disclosures and opt-out rights', S.california), law('EU GDPR · Article 13(2)(f)')]
  },
  reading: {
    question: 'Why describe a simple page visit?',
    why: 'A page can generate personal information even when the reader never fills in a form.',
    includeTitle: 'Follow one request',
    include: 'Connect connection records to delivery, security, the hosting recipient, and retention. Explain account access separately from ordinary reading.',
    avoidTitle: '“No signup” does not mean “no data”',
    avoid: 'Check host and CDN logs. If relying on legitimate interests, identify the actual interest and assess whether that basis fits.',
    driver: 'EU GDPR Article 13(1)(c)–(f) covers purposes, legal basis, recipients, and relevant interests or transfers.',
    refs: [law('EU GDPR · Article 13'), law('ICO · Legitimate interests', ico + 'lawful-basis/a-guide-to-lawful-basis/legitimate-interests/')]
  },
  tools: {
    question: 'Why separate local work from server requests?',
    why: '“Runs in your browser” answers where the work happens, but not every question about the page.',
    includeTitle: 'Draw both paths',
    include: 'Trace the file or text input, then trace the requests that deliver the tool. Check telemetry, error reports, saved browser work, and downloaded copies.',
    avoidTitle: 'Do not promise more than the implementation does',
    avoid: 'Explain which copies a reset can remove. An account deletion normally cannot reach a file already downloaded to someone’s device.',
    driver: 'EU GDPR Articles 12–14 require understandable, accurate information about the relevant processing.',
    refs: [law('EU GDPR · Articles 12–14'), law('ICO · Start with a data map', S.drafting)]
  },
  analytics: {
    question: 'Why give analytics its own explanation?',
    why: 'The useful question is what the measurement does, not whether its product name sounds private.',
    includeTitle: 'Trace input to result',
    include: 'List the connection or event information used, any identifier, the recipient, and what is retained. Distinguish an aggregate result from the inputs used to produce it.',
    avoidTitle: 'Cookie-free is not a legal conclusion',
    avoid: 'Transient IP use can still involve personal information. Assess device-access rules separately; legitimate interests cannot replace consent where consent is required.',
    driver: 'EU GDPR Articles 5, 6, and 13 address this use; device-access rules can apply independently.',
    refs: [law('EU GDPR · Articles 5, 6, and 13'), law('ICO · Storage and access technologies', S.cookies)]
  },
  subscribe: {
    question: 'Why separate newsletter signup from tracking?',
    why: 'Asking for email does not automatically answer whether the reader also agreed to be measured.',
    includeTitle: 'Explain each choice',
    include: 'Describe delivery, any engagement tracking, and how to stop each. Explain whether unsubscribe removes an account or only stops future messages.',
    avoidTitle: 'Notice text is not a consent control',
    avoid: 'The fictional example uses a separate tracking choice. A real service needs an applicable legal basis and working controls, not just a sentence saying “consent.”',
    driver: 'EU GDPR Articles 7 and 13 address consent information; electronic-marketing and device-access rules also matter.',
    refs: [law('EU GDPR · Articles 7 and 13'), law('ICO · Plan direct marketing', S.marketing), law('ICO · Tracking technologies', S.cookies)]
  },
  shop: {
    question: 'Why follow an order through checkout and delivery?',
    why: 'One purchase involves several recipients, purposes, and reasons for keeping records.',
    includeTitle: 'Map the handoffs',
    include: 'Distinguish payment details, order status, shipping information, support, and accounting. State which fields are required and what happens if they are not supplied.',
    avoidTitle: 'Do not use “contract” for everything',
    avoid: 'Fulfilling an order and meeting accounting obligations are different activities. Optional marketing needs its own assessment.',
    driver: 'EU GDPR Article 13 covers purposes, legal basis, recipients, and required-data consequences.',
    refs: [law('EU GDPR · Article 13(1)(c), (e) and 13(2)(e)'), law('ICO · Disclosure checklist', S.disclosure)]
  },
  'shop-cookies': {
    question: 'Why explain cookies by purpose?',
    why: 'Readers need to understand what a choice changes before they make it.',
    includeTitle: 'Separate necessary and optional uses',
    include: 'Explain each purpose, provider, duration, and the control that changes the choice. Confirm what starts before the person acts.',
    avoidTitle: '“Essential” is not a vendor label',
    avoid: 'Assess the function the person requested. The fictional shop waits for optional analytics consent; a real implementation must match its own applicable rules and choices.',
    driver: 'Device storage/access rules can apply even without personal data; applicable exceptions and consent requirements must be assessed.',
    refs: [law('ICO · Storage and access technologies', S.cookies)]
  },
  others: {
    question: 'Why say who receives the information?',
    why: '“Trusted partners” does not help someone understand where their information goes.',
    includeTitle: 'Link recipient to job and data',
    include: 'Describe recipients or useful, specific categories. Separate a provider following your instructions from one using some records for its own purposes.',
    avoidTitle: 'A company name does not settle its role',
    avoid: 'Check the activity and the contract. The same payment provider may perform different roles for payment processing, fraud prevention, and regulatory duties.',
    driver: 'EU GDPR Articles 13(1)(e) and 14(1)(e) cover recipients or recipient categories.',
    refs: [law('EU GDPR · Articles 13–14')]
  },
  specifics: {
    question: 'Why give records different retention periods?',
    why: 'A retention section should tell the reader when a particular record stops being needed.',
    includeTitle: 'Start with the retention schedule',
    include: 'For each record, state a duration or a meaningful decision criterion. Include when the clock starts, recovery backups, and a specific reason for any extension.',
    avoidTitle: 'Do not copy these example numbers',
    avoid: 'Thirty days and seven years are fictional choices here. Verify real operational needs and applicable recordkeeping law; “as long as necessary” alone tells the reader little.',
    driver: 'EU GDPR Article 13(2)(a) requires a period or criteria; Article 5(1)(e) limits storage.',
    refs: [law('EU GDPR · Articles 5 and 13'), law('ICO · Storage limitation', S.retention)]
  },
  transfers: {
    question: 'Why explain international access?',
    why: 'A server’s region does not necessarily tell you every country from which records can be accessed.',
    includeTitle: 'Map storage and remote access',
    include: 'Identify relevant transfers, the applicable mechanism, and how a person can obtain information about the safeguards. Verify support and subprocessor access too.',
    avoidTitle: 'Do not list safeguards you have not established',
    avoid: '“We use contractual clauses” is not a substitute for checking the actual transfer, recipient, and any additional measures needed.',
    driver: 'EU GDPR Article 13(1)(f) and Chapter V address transfer information and safeguards.',
    refs: [law('EU GDPR · Article 13 and Chapter V')]
  },
  rights: {
    question: 'Why make rights usable rather than just list them?',
    why: 'A right is hard to exercise when the notice does not explain where a request goes.',
    includeTitle: 'Give a practical route',
    include: 'Explain relevant rights, a working request channel, consent withdrawal, and complaints. Match conditions and response steps to the applicable jurisdiction.',
    avoidTitle: 'Avoid blanket promises or blanket exceptions',
    avoid: 'Do not promise that every record can be erased immediately. Equally, “legal obligations” is not a reason to refuse every request.',
    driver: 'EU GDPR Article 13(2)(b)–(d) covers rights, consent withdrawal, and complaints.',
    refs: [law('EU GDPR · Article 13'), law('ICO · Individual rights', ico + 'individual-rights/')]
  },
  security: {
    question: 'Why describe safeguards without a security guarantee?',
    why: 'A useful security explanation is specific enough to inform, without pretending that incidents are impossible.',
    includeTitle: 'Describe verified categories of protection',
    include: 'Check claims about access, encryption, procedures, and provider oversight against actual practice. Keep sensitive implementation details out of the public notice.',
    avoidTitle: 'A heading is not a safeguard',
    avoid: 'This is helpful context, not a universally required standalone privacy-notice section. Avoid “100% secure” or a checklist the organization cannot substantiate.',
    driver: 'EU GDPR Article 32 requires risk-appropriate safeguards; it does not prescribe this heading.',
    refs: [law('EU GDPR · Article 32'), law('ICO · Information security', ico + 'security/')]
  },
  children: {
    question: 'Why check the audience before writing an age statement?',
    why: 'An “adults only” sentence cannot change who a service is actually designed for or what its operator knows.',
    includeTitle: 'Assess the real audience and collection',
    include: 'Check the intended and actual users, relevant ages, and what happens when children’s information arrives. Explain parent or guardian routes when relevant.',
    avoidTitle: 'Eighteen is this example’s audience choice',
    avoid: 'It is not a universal privacy-law threshold. US COPPA addresses certain under-13 collection; other jurisdictions and children’s rules require separate analysis.',
    driver: 'US COPPA can require notice and parental consent for covered child-directed services or known under-13 collection.',
    refs: [law('FTC · COPPA scope and notice requirements', S.children)]
  },
  changes: {
    question: 'Why explain how the notice changes?',
    why: 'The notice needs to keep pace with the practices it describes, and people need to hear about relevant new uses.',
    includeTitle: 'Plan the update before the new use',
    include: 'Keep a version date, an owner, and a way to communicate material changes. Review the data map when adding a vendor, purpose, field, or retention rule.',
    avoidTitle: 'An updated page is not fresh consent',
    avoid: 'Decide whether the new use is lawful and whether a new choice is needed. Do not treat continued browsing as permission for every future change.',
    driver: 'EU GDPR Articles 13(3) and 14(4) address information before further processing for another purpose.',
    refs: [law('EU GDPR · Articles 13–14'), law('ICO · Keep privacy information under review', S.drafting)]
  }
};
