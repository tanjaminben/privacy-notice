// Educational guidance is distinct from the fictional processing facts.
// Primary sources checked October 27, 2026; requirements are jurisdiction-specific.
export const teaching = {
  "who": {
    "heading": "Who is responsible for your information?",
    "classification": "Required when GDPR applies",
    "requirement": "GDPR Article 13(1)(a)–(b): identify the controller and give contact details; add representative and data protection officer details where applicable.",
    "practice": "Use a recognizable legal name alongside a trading name. A short scope statement helps readers recognize whether this notice covers their activity.",
    "example": "Example Studio decides how article, tool, newsletter, and shop information is used. privacy@example.com is a fictional, unmonitored example address.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "ICO · Privacy information to provide",
        "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/"
      ]
    ]
  },
  "never": {
    "heading": "Advertising, sale, and profiling",
    "classification": "Conditional requirements",
    "requirement": "Covered California businesses disclose relevant sale/sharing practices and rights. GDPR Article 13(2)(f) requires information about relevant automated decisions, including meaningful logic and consequences when applicable.",
    "practice": "A clear statement that a practice does not occur can answer a real reader concern. It is not a universal requirement to add a “we never sell” section.",
    "example": "Example Studio counts page visits but does not use advertising profiles across unrelated websites.",
    "refs": [
      [
        "California · CCPA, effective January 1, 2026",
        "https://cppa.ca.gov/pdf/20260101_ccpa_statute.pdf"
      ],
      [
        "California · CCPA regulations, effective January 1, 2026",
        "https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf"
      ],
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ]
    ]
  },
  "reading": {
    "heading": "Information used to load a page",
    "classification": "Required when GDPR applies",
    "requirement": "Explain relevant purposes, lawful basis, legitimate interests where relied on, recipients, and retention under GDPR Articles 13(1)(c)–(e), 13(2)(a).",
    "practice": "Use a small page-request example. Explain the host or content delivery network before using the abbreviation CDN.",
    "example": "Page request → host → article. Account sign-in is a separate activity; cookie expiry does not delete an account.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "ICO · Privacy information to provide",
        "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/"
      ]
    ]
  },
  "tools": {
    "heading": "What stays on your device",
    "classification": "Required disclosure; useful explanation",
    "requirement": "GDPR transparency covers personal-information processing that actually occurs; it does not require a specific “browser processing” heading.",
    "practice": "Show two labeled paths. Explain which copy a reset clears and which files the reader must remove themselves.",
    "example": "Your text → browser processing. Page request → host. Deleting the account does not remove a downloaded file.",
    "refs": [
      [
        "European Commission · Informing individuals",
        "https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en"
      ],
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ]
    ]
  },
  "analytics": {
    "heading": "How readership statistics are produced",
    "classification": "Required disclosure; conditional consent",
    "requirement": "Describe applicable purposes, lawful basis, recipients, and retention. Assess storage/access law separately. Current UK guidance includes a conditional statistical-purpose exception with information and objection requirements; it is not a blanket analytics exemption.",
    "practice": "Keep the recipe format: ingredients are visit details, the method uses a short-lived identifier, and the result is a page total.",
    "example": "The fictional example retains event records for 30 days and page totals for 12 months; those are scenario choices, not statutory periods.",
    "refs": [
      [
        "European Commission · Informing individuals",
        "https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en"
      ],
      [
        "ICO · Current storage and access exceptions",
        "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/"
      ]
    ]
  },
  "subscribe": {
    "heading": "Newsletter delivery and engagement tracking",
    "classification": "Conditional requirements and example policy",
    "requirement": "Where consent is used, explain withdrawal and provide a working choice. Electronic marketing and device-access rules must be assessed for the actual channel and jurisdiction.",
    "practice": "Separate delivery, measurement, unsubscribe, deletion, and the minimal record kept to honor an opt-out. Separate consent is the example’s policy, not a universal consent rule for every email.",
    "example": "The coupon offers the fictional newsletter for $0. It is not a consent checkbox, signup form, or reward for accepting tracking.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "ICO · Current storage and access exceptions",
        "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/"
      ]
    ]
  },
  "shop": {
    "heading": "Who receives your order information",
    "classification": "Required when GDPR applies",
    "requirement": "GDPR Article 13 covers purposes, lawful basis, recipients, and whether supplying information is required and the consequences of not providing it. That last disclosure is conditional on the actual collection.",
    "practice": "Keep contract, fraud prevention, and accounting separate. “Payment status” means whether the payment succeeded; it is not a full card number.",
    "example": "Payment provider: full card details. Publisher: items, amount, delivery details, transaction reference and payment status. Carrier: delivery information. A delivery form should also explain that a name and shipping address are needed to send the order, and that it cannot be shipped without them.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "ICO · Privacy information to provide",
        "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/"
      ]
    ]
  },
  "shop-cookies": {
    "heading": "What each cookie choice changes",
    "classification": "Conditional requirements",
    "requirement": "UK PECR has several purpose-specific exceptions. If no exception applies, obtain consent before storage/access. Personal-information processing may also need a GDPR lawful basis.",
    "practice": "Replace the prescription aside with a bakery recipe/label. Keep the scenario’s stricter opt-in choice, and distinguish it from the minimum law.",
    "example": "Cart cookies support the requested checkout. The fictional shop stores a privacy preference for 6 months; that duration is a scenario setting.",
    "refs": [
      [
        "ICO · Current storage and access exceptions",
        "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/"
      ],
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ]
    ]
  },
  "others": {
    "heading": "Which providers receive which information",
    "classification": "Required when GDPR applies",
    "requirement": "GDPR Articles 13(1)(e) and 14(1)(e) require recipients or recipient categories. Categories should be specific enough to be useful.",
    "practice": "Explain processor as a provider following the publisher’s instructions; explain independent controller as a provider deciding a particular purpose itself. A provider may perform both roles in different activities.",
    "example": "The payment provider may decide how to meet its own legal or fraud-prevention duties; that does not make every provider use independent.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "ICO · Privacy information to provide",
        "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/"
      ]
    ]
  },
  "specifics": {
    "heading": "When each type of record is deleted",
    "classification": "Required when GDPR applies",
    "requirement": "GDPR Article 13(2)(a) requires a period or criteria; Article 5 limits storage. Covered California businesses also disclose retention periods or criteria at collection.",
    "practice": "Explain active systems, restricted recovery backups, and local device copies separately. Confirm the actual clock start rather than inventing one for a tidier table.",
    "example": "Support correspondence: normally 2 years after closure. Restricted recovery copies: up to 30 days after active deletion. Seven-year accounting retention is an assumption in this scenario.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "ICO · Privacy information to provide",
        "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/"
      ],
      [
        "California · CCPA, effective January 1, 2026",
        "https://cppa.ca.gov/pdf/20260101_ccpa_statute.pdf"
      ]
    ]
  },
  "transfers": {
    "heading": "Where information is stored and accessed",
    "classification": "Conditional requirements",
    "requirement": "GDPR Article 13(1)(f) and Chapter V apply to relevant international transfers. The notice does not itself create a valid safeguard.",
    "practice": "Define standard contractual clauses before using SCCs. Check the specific recipient, transfer, and any supplementary measures instead of listing every mechanism.",
    "example": "Example Studio is US-based and uses US and European providers. This scenario does not claim that any particular real provider has an approved transfer mechanism.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "ICO · Privacy information to provide",
        "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/"
      ]
    ]
  },
  "rights": {
    "heading": "How to make a privacy request",
    "classification": "Required rights information; conditional rights",
    "requirement": "EU GDPR Articles 12–14 cover relevant rights, withdrawal and complaints; Article 21 gives the right to object special prominence. UK Article 13(2)(ca), effective June 19, 2026, additionally identifies the right to complain to the controller. Apply each rule only to its jurisdiction.",
    "practice": "Use a rebate-style request guide without a real submission form, payment, or redemption promise. Give a specific deadline only for a clearly labeled jurisdiction.",
    "example": "Ask for deletion of a shopping account. Required tax records may remain while the organization explains the legal reason; that does not justify keeping the entire profile.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "UK GDPR · Current Article 13, including 2026 amendments",
        "https://www.legislation.gov.uk/eur/2016/679/article/13"
      ],
      [
        "California · CCPA, effective January 1, 2026",
        "https://cppa.ca.gov/pdf/20260101_ccpa_statute.pdf"
      ]
    ]
  },
  "security": {
    "heading": "What the safeguards protect",
    "classification": "Good practice section; legal security duty",
    "requirement": "GDPR Article 32 requires risk-appropriate measures. Articles 13–14 do not prescribe a standalone “Security” section.",
    "practice": "Include concise, substantiated context where helpful. A security statement must match actual practice; it is not evidence that the measures were tested.",
    "example": "Only staff who need order details can access them. A secure connection protects information while it is sent.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "European Commission · Informing individuals",
        "https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en"
      ]
    ]
  },
  "children": {
    "heading": "How the service handles children’s information",
    "classification": "Conditional requirements; audience policy",
    "requirement": "COPPA covers certain commercial child-directed services and actual-knowledge collection from children under 13. GDPR rules for children require their own context; an 18+ label does not settle applicability.",
    "practice": "Provide a practical parent or guardian contact route where relevant. Check current COPPA requirements rather than relying only on older FAQ text.",
    "example": "Example Studio investigates a report that a child provided information and takes appropriate deletion steps.",
    "refs": [
      [
        "eCFR · Current COPPA notice rule, 16 CFR 312.4",
        "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.4"
      ],
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ]
    ]
  },
  "changes": {
    "heading": "How readers learn about a new use",
    "classification": "Conditional notice duty; good practice versioning",
    "requirement": "GDPR Articles 13(3) and 14(4) require information before further processing for another purpose. Covered California privacy policies have additional updating rules.",
    "practice": "Version date, owner, and change summary support maintenance. A visible “Changes” heading is not a universal statutory format.",
    "example": "Before starting a new subscriber-tracking purpose, reassess the legal basis and provide the relevant information and choice.",
    "refs": [
      [
        "EU GDPR · Articles 3–7, 12–14, 17, 21, 32 and 44–49",
        "https://www.legislation.gov.uk/eur/2016/679/pdfs/eur_20160679_2016-05-04_en.pdf"
      ],
      [
        "European Commission · Informing individuals",
        "https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en"
      ],
      [
        "California · CCPA regulations, effective January 1, 2026",
        "https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf"
      ]
    ]
  }
};
