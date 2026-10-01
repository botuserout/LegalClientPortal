/**
 * Legal Sthal - Master Service Catalog Dataset (31 Services)
 * Structured Data Model separating Public Service Listings from BRD-Tracked Portal Workflows
 */

export const fullLegalSthalCatalog = [
  // --- CATEGORY 1: TAXATION & GST ---
  {
    id: "gst-registration",
    name: "GST Registration",
    category: "Taxation & GST",
    shortDescription: "Get your official GSTIN through a completely online, expert-assisted registration process.",
    price: 3000,
    icon: "receipt",
    status: "active",
    featured: true,
    portalTracking: true,
    brdServiceType: "GST",
    benefits: [
      "GSTIN registration",
      "Online application assistance",
      "Expert review",
      "Registration documentation support"
    ],
    details: {
      overview: "End-to-end GST registration for your business with seamless portal application, document verification, and certificate delivery.",
      requiredDocuments: ["PAN Card of Business / Proprietor", "Aadhaar Card of Authorized Signatory", "Electricity Bill of Premises", "NOC / Rent Agreement"],
      process: ["Document Collection & Verification", "REG-01 Form Drafting", "Aadhaar Authentication", "GSTIN Allotment"],
      faqs: [{ q: "How long does GST registration take?", a: "Target completion is 3 working days subject to department review." }]
    }
  },
  {
    id: "gst-return-filing",
    name: "GST Return Filing",
    category: "Taxation & GST",
    shortDescription: "Keep your GST compliance on track with professionally managed monthly and quarterly GSTR filings.",
    price: 1500,
    icon: "file-text",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Monthly GSTR filing",
      "Quarterly filing support",
      "Tax expert assistance",
      "Compliance tracking",
      "Reduced risk of missed filing deadlines"
    ],
    details: {
      overview: "Timely filing of GSTR-1, GSTR-3B, and GSTR-9 annual returns by certified tax experts.",
      requiredDocuments: ["Sales Invoices", "Purchase Invoices", "GSTR-2B Recon", "Bank Statements"],
      process: ["Data Reconciliation", "Tax Computation", "Client Sign-off", "Portal Filing"],
      faqs: [{ q: "Which returns are covered?", a: "GSTR-1, GSTR-3B, GSTR-4 (CMP-08), and annual GSTR-9." }]
    }
  },
  {
    id: "income-tax-filing",
    name: "Income Tax Filing (ITR)",
    category: "Taxation & GST",
    shortDescription: "File personal or corporate income tax returns accurately with professional tax assistance.",
    price: 2499,
    icon: "calculator",
    status: "active",
    featured: true,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Individual ITR filing",
      "Corporate ITR filing",
      "Tax calculation assistance",
      "Deduction review",
      "Filing support"
    ],
    details: {
      overview: "Maximize tax savings with expert review of Form 16, AIS/TIS, 26AS, and eligible deductions under old & new regimes.",
      requiredDocuments: ["Form 16 / 16A", "Bank Statements", "26AS & AIS Report", "Investment Proofs"],
      process: ["Tax Computation", "Deduction Optimization", "Draft Sharing", "ITR Submission"],
      faqs: [{ q: "Can I revise my filed return?", a: "Yes, revised ITRs can be filed before the prescribed statutory deadline." }]
    }
  },
  {
    id: "accounting-bookkeeping",
    name: "Accounting & Bookkeeping",
    category: "Taxation & GST",
    shortDescription: "Maintain accurate business financial records with continuous bookkeeping and financial reporting support.",
    price: 4999,
    icon: "book-open",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Cloud bookkeeping",
      "Monthly financial statements",
      "P&L statements",
      "Ledger checks",
      "Ongoing accounting support"
    ],
    details: {
      overview: "Dedicated cloud accounting support on Tally / Zoho Books / QuickBooks with monthly P&L and Balance Sheet reports.",
      requiredDocuments: ["Bank Statements", "Invoices & Receipts", "Expense Bills", "Payroll Register"],
      process: ["Entry Journaling", "Bank Recon", "Monthly Reporting", "Auditor Coordination"],
      faqs: [{ q: "Is software subscription included?", a: "We work with your existing accounting software or configure cloud setup." }]
    }
  },

  // --- CATEGORY 2: BUSINESS INCORPORATION ---
  {
    id: "company-incorporation-pvt-ltd",
    name: "Company Registration — Private Limited",
    category: "Business Incorporation",
    shortDescription: "Incorporate your business as a Private Limited Company with CA/CS-assisted registration support.",
    price: 9999,
    icon: "briefcase",
    status: "active",
    featured: true,
    portalTracking: true,
    brdServiceType: "Company Incorporation",
    benefits: [
      "Company name assistance (RUN)",
      "2 Digital Signature Certificates (DSC)",
      "Director Identification Numbers (DIN)",
      "SPICe+ filing",
      "MOA & AOA drafting",
      "PAN/TAN allotment",
      "Certificate of Incorporation"
    ],
    details: {
      overview: "The most popular corporate structure for startups & growing enterprises seeking limited liability and equity funding.",
      requiredDocuments: ["PAN Card of 2 Directors", "Identity & Address Proofs", "Registered Office Utility Bill", "Owner NOC"],
      process: ["Name Reservation", "DSC Generation", "SPICe+ Form Upload", "COI & PAN/TAN Delivery"],
      faqs: [{ q: "What is the minimum director requirement?", a: "Minimum 2 directors and 2 shareholders are required (directors can be shareholders)." }]
    }
  },
  {
    id: "llp-registration",
    name: "LLP Registration",
    category: "Business Incorporation",
    shortDescription: "Register a Limited Liability Partnership with professional assistance for incorporation and documentation.",
    price: 8999,
    icon: "users",
    status: "active",
    featured: true,
    portalTracking: true,
    brdServiceType: "Company Incorporation",
    benefits: [
      "LLP incorporation",
      "RUN-LLP name approval",
      "FiLLiP filing",
      "LLP Agreement drafting & Form 3",
      "Partnership guidance"
    ],
    details: {
      overview: "Ideal for professional firms, consultancies, and partnerships wanting limited liability with lower compliance overhead.",
      requiredDocuments: ["PAN & Aadhaar of Partners", "Bank Statement / Address Proof", "Registered Office Proof", "Utility Bill"],
      process: ["Name Approval", "FiLLiP Filing", "COI Issuance", "LLP Agreement Form 3 Filing"],
      faqs: [{ q: "When must the LLP agreement be filed?", a: "Within 30 days of receiving the Certificate of Incorporation." }]
    }
  },
  {
    id: "opc-registration",
    name: "One Person Company (OPC)",
    category: "Business Incorporation",
    shortDescription: "Establish a One Person Company with single-owner control and limited liability protection.",
    price: 7999,
    icon: "user",
    status: "active",
    featured: false,
    portalTracking: true,
    brdServiceType: "Company Incorporation",
    benefits: [
      "Single-owner structure",
      "Limited liability protection",
      "Corporate legal identity",
      "Registration assistance"
    ],
    details: {
      overview: "Perfect for solo entrepreneurs wanting corporate identity and limited liability without requiring co-founders.",
      requiredDocuments: ["PAN & Aadhaar of Solo Founder", "Nominee Identity & Address Proof", "Office Utility Bill", "NOC"],
      process: ["Name Reservation", "Nominee Consent (INC-3)", "SPICe+ Filing", "COI Issuance"],
      faqs: [{ q: "Is a nominee mandatory for an OPC?", a: "Yes, a nominee must be appointed in Form INC-3." }]
    }
  },
  {
    id: "partnership-firm",
    name: "Partnership Firm",
    category: "Business Incorporation",
    shortDescription: "Set up your partnership business with partnership deed preparation and registration support.",
    price: 3999,
    icon: "git-pull-request",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Partnership deed drafting",
      "Firm registration with Registrar of Firms",
      "PAN & Bank Account setup assistance",
      "Documentation support"
    ],
    details: {
      overview: "Custom partnership deed drafting on stamp paper with optional Registrar of Firms (RoF) registration.",
      requiredDocuments: ["PAN Cards of Partners", "Address Proofs", "Office Address Proof", "Partnership Terms"],
      process: ["Deed Drafting", "Stamp Duty Execution", "RoF Registration", "Firm PAN Allotment"],
      faqs: [{ q: "Is registration with RoF compulsory?", a: "Registration is optional but recommended for enforcing legal rights in court." }]
    }
  },
  {
    id: "sole-proprietorship",
    name: "Sole Proprietorship",
    category: "Business Incorporation",
    shortDescription: "Start your sole proprietorship with support for GST, MSME and business setup requirements.",
    price: 2499,
    icon: "user-check",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Proprietorship setup",
      "GST registration assistance",
      "MSME Udyam registration",
      "Business documentation",
      "Current bank-account setup assistance"
    ],
    details: {
      overview: "Simplest business entity setup for individual traders, freelancers, and small shop owners.",
      requiredDocuments: ["Proprietor PAN & Aadhaar", "Photo", "Business Address Proof", "Rent Agreement / Utility Bill"],
      process: ["KYC Collection", "GST/MSME Application", "Certificate Delivery", "Bank Account Setup"],
      faqs: [{ q: "What serves as proof of proprietorship?", a: "GST registration certificate or Udyam registration certificate." }]
    }
  },
  {
    id: "section-8-company",
    name: "Section 8 Company (NGO)",
    category: "Business Incorporation",
    shortDescription: "Establish a non-profit organisation under Section 8 with support for incorporation and related registrations.",
    price: 14999,
    icon: "heart",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Section 8 incorporation",
      "12A tax exemption guidance",
      "80G donation deduction guidance",
      "NGO documentation",
      "CSR-related eligibility support"
    ],
    details: {
      overview: "Non-profit corporate structure registered under MCA for charitable, educational, environmental, or social objectives.",
      requiredDocuments: ["PAN & Aadhaar of 2 Directors", "Projected 3-Year Income/Expense Estimate", "Office Proof", "NOC"],
      process: ["Name Approval", "License Application (INC-12)", "SPICe+ Submission", "Section 8 COI Allotment"],
      faqs: [{ q: "Can profits be distributed to members in Section 8?", a: "No, all profits must be reinvested into the charitable purpose." }]
    }
  },

  // --- CATEGORY 3: INTELLECTUAL PROPERTY & BUSINESS PROTECTION ---
  {
    id: "trademark-protection",
    name: "Trademark Protection",
    category: "Intellectual Property",
    shortDescription: "Protect your business name, logo and brand identity through trademark registration.",
    price: 6999,
    icon: "shield",
    status: "active",
    featured: true,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Trademark search report",
      "Class identification (45 classes)",
      "Form TM-A preparation",
      "TM application filing",
      "Right to use ™ symbol immediately",
      "Registration tracking support"
    ],
    details: {
      overview: "Comprehensive IP search and filing to secure exclusive brand rights and prevent unauthorized brand cloning.",
      requiredDocuments: ["Brand Logo / Word Mark", "Applicant Identity Proof", "User Affidavit (if prior use)", "MSME Certificate (50% fee discount)"],
      process: ["Public Search", "Class Mapping", "TM-A Application", "TM Allotment Number in 24 Hours"],
      faqs: [{ q: "How long is a trademark valid?", a: "A trademark is valid for 10 years and can be renewed indefinitely." }]
    }
  },
  {
    id: "iso-certification",
    name: "ISO Certification",
    category: "Intellectual Property",
    shortDescription: "Obtain ISO certification to strengthen business credibility, customer trust and corporate opportunities.",
    price: 5999,
    icon: "award",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "ISO 9001 (Quality Management)",
      "ISO 27001 (Information Security)",
      "ISO 14001 (Environmental)",
      "Audit assistance & Certificate"
    ],
    details: {
      overview: "International quality & safety certifications for tenders, enterprise vendor onboarding, and global trust.",
      requiredDocuments: ["Company Registration Copy", "Business Profile & Scope", "Invoices / Process Flow"],
      process: ["Gap Analysis", "Documentation Review", "Audit Clearance", "ISO Certificate Issuance"],
      faqs: [{ q: "Which ISO standard is best for IT companies?", a: "ISO 27001 for Information Security & ISO 9001 for Quality Management." }]
    }
  },

  // --- CATEGORY 4: CORPORATE COMPLIANCE & AUDIT ---
  {
    id: "roc-compliance",
    name: "ROC Annual Compliance",
    category: "Corporate Compliance",
    shortDescription: "Manage annual ROC filings, corporate records, board documentation and director compliance requirements.",
    price: 9999,
    icon: "file-check",
    status: "active",
    featured: true,
    portalTracking: true,
    brdServiceType: "Compliances",
    benefits: [
      "Annual ROC filings",
      "Board resolutions & minutes",
      "Director DIR-3 KYC",
      "Statutory registers upkeep",
      "MCA portal compliance"
    ],
    details: {
      overview: "Mandatory annual statutory compliance filing for private limited companies and LLPs on the MCA portal.",
      requiredDocuments: ["Audited Balance Sheet & P&L", "Auditor Report", "Director KYC Proofs"],
      process: ["Financial Review", "ADT-1 & DIR-3 KYC", "Form AOC-4 Drafting", "Form MGT-7 Upload"],
      faqs: [{ q: "What is the penalty for late ROC filing?", a: "₹100 per day of delay without any upper cap." }]
    }
  },
  {
    id: "pvt-ltd-compliance",
    name: "Pvt Ltd Compliance Package",
    category: "Corporate Compliance",
    shortDescription: "Manage recurring statutory and tax compliance requirements for Private Limited Companies.",
    price: 19999,
    icon: "lock",
    status: "active",
    featured: true,
    portalTracking: true,
    brdServiceType: "Compliances",
    benefits: [
      "Form AOC-4 (Financial Statements)",
      "Form MGT-7 (Annual Return)",
      "Corporate Income Tax Return (ITR-6)",
      "TDS Return Filing",
      "Director DIR-3 KYC",
      "Annual compliance retainer"
    ],
    details: {
      overview: "All-in-one compliance package covering statutory MCA annual filings, corporate tax returns, and TDS compliance.",
      requiredDocuments: ["Financial Statements", "Tax Audit Report (if applicable)", "Bank Statements"],
      process: ["Book Closure", "Tax Audit Support", "ROC Filing", "Corporate ITR Submission"],
      faqs: [{ q: "Is tax audit mandatory for all Pvt Ltd companies?", a: "Tax audit is mandatory if turnover exceeds ₹1 Cr (or ₹10 Cr under digital transaction threshold)." }]
    }
  },
  {
    id: "llp-annual-compliance",
    name: "LLP Annual Compliance",
    category: "Corporate Compliance",
    shortDescription: "Keep your LLP compliant with annual filings, financial statements and income-tax compliance.",
    price: 7999,
    icon: "file-text",
    status: "active",
    featured: false,
    portalTracking: true,
    brdServiceType: "Compliances",
    benefits: [
      "Form 8 (Statement of Accounts)",
      "Form 11 (Annual Return)",
      "Statement of accounts drafting",
      "Income-tax return (ITR-5)",
      "Annual compliance retainer"
    ],
    details: {
      overview: "Mandatory annual filing for LLPs irrespective of turnover or active business operations.",
      requiredDocuments: ["Partner Financial Statements", "Bank Statements", "LLP Agreement"],
      process: ["Form 11 Filing (Due 30 May)", "Form 8 Filing (Due 30 Oct)", "ITR-5 Submission"],
      faqs: [{ q: "Do nil turnover LLPs need to file Form 11?", a: "Yes, Form 11 and Form 8 are compulsory even with zero business operations." }]
    }
  },
  {
    id: "opc-annual-compliance",
    name: "OPC Annual Compliance",
    category: "Corporate Compliance",
    shortDescription: "Manage annual compliance requirements for One Person Companies.",
    price: 6999,
    icon: "user-check",
    status: "active",
    featured: false,
    portalTracking: true,
    brdServiceType: "Compliances",
    benefits: [
      "Form AOC-4",
      "Form MGT-7A",
      "Director DIR-3 KYC",
      "Income-tax return",
      "Annual compliance"
    ],
    details: {
      overview: "Streamlined single-director MCA compliance package for One Person Companies.",
      requiredDocuments: ["Audited Accounts", "Director Consent & KYC"],
      process: ["Financial Finalization", "MGT-7A & AOC-4 Submission", "ITR Filing"],
      faqs: [{ q: "Does an OPC require board meetings?", a: "At least 1 board meeting in each half of a calendar year is required." }]
    }
  },
  {
    id: "statutory-tax-audit",
    name: "Statutory & Tax Audit",
    category: "Corporate Compliance",
    shortDescription: "Get professional statutory and tax audit support through certified Chartered Accountant partners.",
    price: 14999,
    icon: "check-circle",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Financial review & balance sheet audit",
      "Statutory audit under Companies Act",
      "Tax audit under Section 44AB",
      "Compliance verification",
      "Audit documentation & Form 3CD"
    ],
    details: {
      overview: "Certified audit reports by independent Chartered Accountants for companies exceeding statutory turnover limits.",
      requiredDocuments: ["Ledgers", "Invoices", "Bank Statements", "Asset Register"],
      process: ["Sample Verification", "Query Resolution", "Form 3CD Filing", "Audit Report Signing"],
      faqs: [{ q: "What is Form 3CD?", a: "Form 3CD is the detailed tax audit statement filed online on the Income Tax portal." }]
    }
  },
  {
    id: "corporate-tax-planning",
    name: "Corporate Tax Planning",
    category: "Corporate Compliance",
    shortDescription: "Develop tax-efficient business structures designed around your company's financial and operational requirements.",
    price: 11999,
    icon: "trending-up",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Tax structuring",
      "Business tax planning",
      "Cash-flow optimization",
      "Export-related tax planning",
      "Compliance-oriented advisory"
    ],
    details: {
      overview: "Custom advisory to structure business transactions legally under IT Act rules and claim maximum tax benefits.",
      requiredDocuments: ["P&L Projection", "Capital Structure Details", "Operating Model"],
      process: ["Financial Evaluation", "Tax Risk Assessment", "Structure Blueprint", "Implementation Advisory"],
      faqs: [{ q: "Is tax planning legal?", a: "Yes, tax planning utilizes legal tax exemptions and incentives provided under Indian tax law." }]
    }
  },

  // --- CATEGORY 5: PAYROLL & EMPLOYMENT COMPLIANCE ---
  {
    id: "tds-return-filing",
    name: "TDS Return Filing",
    category: "Payroll & Employment",
    shortDescription: "Manage TDS return filing accurately and on schedule with professional assistance.",
    price: 2000,
    icon: "pie-chart",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Form 24Q (Salary TDS)",
      "Form 26Q (Non-Salary TDS)",
      "Form 27Q (Non-Resident TDS)",
      "Form 27EQ (TCS)",
      "TDS Certificate Form 16 / 16A generation"
    ],
    details: {
      overview: "Quarterly TDS return preparation, challan reconciliation, and Form 16/16A generation on TRACES.",
      requiredDocuments: ["Challan 281 Copies", "Deductee PAN Register", "Payment Breakup"],
      process: ["Data Validation", "Form FVU File Generation", "TDS Return Upload", "TRACES Download"],
      faqs: [{ q: "What is the penalty for late TDS filing?", a: "Late filing fee is ₹200 per day under Section 234E." }]
    }
  },
  {
    id: "professional-tax",
    name: "Professional Tax (PT)",
    category: "Payroll & Employment",
    shortDescription: "Handle state-level professional tax registration and recurring return filing requirements.",
    price: 2999,
    icon: "layers",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "PTRC (Employer) Registration",
      "PTECO (Establishment) Registration",
      "Monthly & annual returns",
      "Employer compliance"
    ],
    details: {
      overview: "State-specific PT registration and return management for employers deducting tax from employee salaries.",
      requiredDocuments: ["Company Registration", "Employee Salary Register", "Proprietor/Director Identity"],
      process: ["State Portal Registration", "Deduction Mapping", "Monthly Challan Payment", "Annual Return"],
      faqs: [{ q: "Is PT applicable in all states?", a: "PT rules vary by state (e.g., Maharashtra, Karnataka, Gujarat, West Bengal enforce PT)." }]
    }
  },
  {
    id: "esic-epf-filing",
    name: "ESIC & EPF Filing",
    category: "Payroll & Employment",
    shortDescription: "Manage recurring ESIC and EPF filing requirements with professional compliance support.",
    price: 3499,
    icon: "shield-check",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "EPF registration & ECR filing",
      "ESIC registration & monthly contribution",
      "Monthly compliance",
      "Employee statutory compliance"
    ],
    details: {
      overview: "Monthly ECR challan generation, EPFO & ESIC portal returns, and new employee UAN generation.",
      requiredDocuments: ["Employee Wages Register", "UAN Numbers", "Attendance Sheet"],
      process: ["ECR Text File Generation", "Challan Payment", "EPFO Upload", "Payment Receipt Share"],
      faqs: [{ q: "When is EPF mandatory?", a: "EPF registration is mandatory for establishments with 20 or more employees." }]
    }
  },

  // --- CATEGORY 6: GOVERNMENT LICENSES & REGISTRATIONS ---
  {
    id: "fssai-license",
    name: "FSSAI Food License",
    category: "Licenses & Registrations",
    shortDescription: "Obtain the appropriate FSSAI food-safety registration or license for your food business.",
    price: 2999,
    icon: "coffee",
    status: "active",
    featured: true,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Basic FSSAI Registration (Turnover < 12 Lakhs)",
      "State FSSAI License (Turnover 12 Lakhs - 20 Cr)",
      "Central FSSAI License (Exporters / Turnover > 20 Cr)",
      "FoSCoS portal filing assistance"
    ],
    details: {
      overview: "Mandatory 14-digit food safety registration for restaurants, cloud kitchens, food manufacturers & traders.",
      requiredDocuments: ["Photo of Applicant", "Identity Proof", "Premises Address Proof", "Water Test Report (if manufacturing)"],
      process: ["Category Selection", "FoSCoS Filing", "Inspection (if state/central)", "License Download"],
      faqs: [{ q: "Can I sell food online without FSSAI?", a: "No, platforms like Swiggy and Zomato require a valid FSSAI license." }]
    }
  },
  {
    id: "apeda-registration",
    name: "APEDA Registration",
    category: "Licenses & Registrations",
    shortDescription: "Obtain APEDA registration for eligible agricultural and processed-food exporters.",
    price: 6999,
    icon: "globe",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "RCMC Certificate from APEDA",
      "Agricultural export clearance",
      "Scheduled product eligibility",
      "Exporter financial incentives support"
    ],
    details: {
      overview: "Registration-cum-Membership Certificate (RCMC) for exporters of fruits, vegetables, meat, and processed foods.",
      requiredDocuments: ["IEC (Import Export Code)", "Bank Certificate", "Pan Card of Business"],
      process: ["Portal Registration", "IEC Verification", "RCMC Issuance"],
      faqs: [{ q: "Is Import Export Code (IEC) required first?", a: "Yes, IEC code is mandatory prior to APEDA registration." }]
    }
  },
  {
    id: "gem-registration",
    name: "GeM Registration",
    category: "Licenses & Registrations",
    shortDescription: "Register your business on Government e-Marketplace to access government procurement opportunities.",
    price: 3999,
    icon: "shopping-bag",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Government buyer access",
      "Seller registration on GeM portal",
      "Supplier profile setup & catalogue upload",
      "Government tender opportunities",
      "Startup/MSME preference support"
    ],
    details: {
      overview: "Vendor registration on Government e-Marketplace portal to sell products & services directly to government departments.",
      requiredDocuments: ["Aadhaar of Authorized Signatory", "PAN Card", "GSTIN & Bank Details", "MSME Certificate"],
      process: ["Primary Registration", "OEM / Seller Verification", "Catalog Creation", "Tender Bidding Readiness"],
      faqs: [{ q: "Can MSMEs get tender exemption on GeM?", a: "Yes, MSMEs enjoy EMD exemption and purchase preference on GeM." }]
    }
  },
  {
    id: "shop-establishment",
    name: "Shop & Establishment License",
    category: "Licenses & Registrations",
    shortDescription: "Obtain state-specific Shop & Establishment registration for eligible shops, offices and commercial establishments.",
    price: 2499,
    icon: "home",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "State-specific shop registration",
      "Online application on Labour portal",
      "Workplace compliance certificate",
      "Bank account opening proof",
      "Registration support"
    ],
    details: {
      overview: "Mandatory municipal license for opening commercial shops, IT offices, service centers, and warehouses.",
      requiredDocuments: ["Employer Photo & ID", "Shop Photo with Name Board", "Rent Agreement", "Electricity Bill"],
      process: ["Labour Portal Filing", "Fee Payment", "Inspector Review", "Registration Certificate"],
      faqs: [{ q: "How long is the license valid?", a: "Validity ranges from 1 year to lifetime depending on the state Labour department." }]
    }
  },
  {
    id: "trade-license",
    name: "Trade License",
    category: "Licenses & Registrations",
    shortDescription: "Obtain the required municipal trade license for eligible commercial businesses.",
    price: 4999,
    icon: "map-pin",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Municipal trade license",
      "Local body compliance",
      "NOC from fire/health department (if needed)",
      "Commercial establishment clearance"
    ],
    details: {
      overview: "Municipal corporation authorization permitting a business to operate in a specific trade or commercial location.",
      requiredDocuments: ["Property Tax Receipt", "Rent Agreement", "NOC", "Business Identity"],
      process: ["Municipal Filing", "Physical Inspection", "License Fee Payment", "Trade License Delivery"],
      faqs: [{ q: "Who issues the trade license?", a: "The local Municipal Corporation or Nagar Palika of your city." }]
    }
  },

  // --- CATEGORY 7: INTERNATIONAL BUSINESS ---
  {
    id: "uk-company-registration",
    name: "UK Company Registration",
    category: "International Business",
    shortDescription: "Register a UK Private Limited Company remotely with assistance for Companies House filing.",
    price: 19999,
    icon: "globe",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "UK Private Limited formation",
      "Companies House official registration",
      "UK registered office address (1 Year)",
      "Articles of Association & Share Certificate",
      "Remote non-resident registration"
    ],
    details: {
      overview: "Incorporate a UK Ltd company from India to access global customers, Stripe UK, and international payments.",
      requiredDocuments: ["Passport of Director", "International Utility Bill / Bank Statement"],
      process: ["Name Availability Search", "Companies House Filing", "COI in 24 Hours", "UK Address Setup"],
      faqs: [{ q: "Do I need to visit the UK to open the company?", a: "No, the entire process is 100% remote online." }]
    }
  },
  {
    id: "us-company-registration",
    name: "US Company Registration (LLC / C-Corp)",
    category: "International Business",
    shortDescription: "Establish a US business entity with LLC or C-Corp formation support in Delaware or Wyoming.",
    price: 24999,
    icon: "globe",
    status: "active",
    featured: true,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Delaware / Wyoming entity formation",
      "Registered Agent service (1 Year)",
      "EIN (Employer Identification Number) application",
      "Operating Agreement / Bylaws",
      "US Bank Account setup assistance"
    ],
    details: {
      overview: "Incorporate a US LLC or C-Corporation for global SaaS, e-commerce, US venture capital, and Stripe Payments.",
      requiredDocuments: ["Passport Copy of Owner", "Proof of Address (Utility Bill / Bank Statement)"],
      process: ["State Filing", "Registered Agent Allotment", "IRS EIN Application", "Mercury / Wise Bank Onboarding"],
      faqs: [{ q: "Delaware vs Wyoming: which is better?", a: "Delaware is best for startups seeking VC funding; Wyoming is ideal for solo online businesses needing low fees." }]
    }
  },

  // --- CATEGORY 8: STARTUP & GOVERNMENT RECOGNITION ---
  {
    id: "startup-india-registration",
    name: "Startup India Registration",
    category: "Startup & Government",
    shortDescription: "Obtain DPIIT recognition under the Startup India initiative and access eligible government benefits and support.",
    price: 14999,
    icon: "rocket",
    status: "active",
    featured: true,
    portalTracking: true,
    brdServiceType: "Startup India",
    benefits: [
      "DPIIT recognition certificate",
      "Section 80IAC 3-year Income Tax exemption eligibility",
      "Angel Tax exemption guidance",
      "80% discount on Patent & 50% on Trademark filing",
      "Self-certification under Labour & Environment laws",
      "Access to Government Seed Fund Scheme"
    ],
    details: {
      overview: "Official Department for Promotion of Industry and Internal Trade (DPIIT) startup recognition for tax exemptions & incentives.",
      requiredDocuments: ["Certificate of Incorporation", "Pitch Deck / Writeup on Innovation", "Website URL / Video Link", "PAN of Entity"],
      process: ["Pitch Deck Refinement", "DPIIT Portal Submission", "Government Review", "DPIIT Certificate Issuance"],
      faqs: [{ q: "Who is eligible for DPIIT Startup India?", a: "Private Limited, LLP, or Registered Partnership less than 10 years old with innovative business model." }]
    }
  },

  // --- CATEGORY 9: WEB & DIGITAL SERVICES ---
  {
    id: "web-solutions",
    name: "Web Solutions & Web Creation",
    category: "Web & Digital Services",
    shortDescription: "Build high-performance, conversion-focused and legally compliant websites for businesses and startups.",
    price: 14999,
    icon: "layout",
    status: "active",
    featured: false,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Custom corporate website creation",
      "Mobile responsive & fast loading design",
      "Integrated Privacy Policy, Terms & Disclaimers",
      "SEO-ready layout & SSL security",
      "Conversion-focused landing pages"
    ],
    details: {
      overview: "Professional web development paired with legal compliance pages (Privacy Policy, Terms of Use, Refund Policy).",
      requiredDocuments: ["Company Logo & Brand Assets", "Content Brief & Images", "Domain Access"],
      process: ["UI Mockup Design", "Frontend Coding & Integration", "Legal Policy Addition", "Live Deployment"],
      faqs: [{ q: "Are mandatory legal policies included?", a: "Yes, standard GDPR/DPDP compliant Privacy Policy and Terms are included." }]
    }
  },

  // --- CATEGORY 10: VIRTUAL OFFICE ---
  {
    id: "premium-virtual-office",
    name: "Premium Virtual Office Registration",
    category: "Virtual Office",
    shortDescription: "Get a professional business address for company registration, GST registration and business correspondence without maintaining a traditional physical office.",
    price: 11999,
    icon: "compass",
    status: "active",
    featured: true,
    portalTracking: false,
    brdServiceType: null,
    benefits: [
      "Prime commercial business address",
      "No Objection Certificate (NOC) & Electricity Bill for GST",
      "Commercial Lease Agreement for MCA incorporation",
      "Mail handling & courier forwarding",
      "Desk space for GST physical inspection"
    ],
    details: {
      overview: "Compliant virtual office addresses in major IT hubs (Gurgaon, Delhi, Bengaluru, Mumbai, Pune, Hyderabad) for ROC & GST.",
      requiredDocuments: ["Identity & Address Proof of Owner", "Company Name Proof"],
      process: ["City & Address Selection", "NOC & Lease Agreement Generation", "Physical Signage Setup", "GST Inspection Support"],
      faqs: [{ q: "Will this virtual office pass GST physical inspection?", a: "Yes, our locations include physical desk setups and signage boards for GST officer inspection." }]
    }
  }
];

export const SERVICE_CATEGORIES = [
  "All",
  "Taxation & GST",
  "Business Incorporation",
  "Intellectual Property",
  "Corporate Compliance",
  "Payroll & Employment",
  "Licenses & Registrations",
  "International Business",
  "Startup & Government",
  "Web & Digital Services",
  "Virtual Office"
];
