import { fullLegalSthalCatalog } from './fullServiceCatalog.js';

export const initialMockData = {
  clients: [
    {
      id: "CL001",
      companyName: "ABC Technologies Pvt Ltd",
      contactPerson: "Rahul Mehta",
      email: "abc@gmail.com",
      mobile: "+91 98765 43210",
      state: "Gujarat",
      address: "102 Tech Park, SG Highway, Ahmedabad, Gujarat - 380054",
      gstin: "24AAACA123411Z5",
      password: "password123",
      createdAt: "2026-09-25",
      status: "Active"
    },
    {
      id: "CL002",
      companyName: "Zenith Logistics LLP",
      contactPerson: "Anita Desai",
      email: "contact@zenithlogistics.in",
      mobile: "+91 98123 45678",
      state: "Maharashtra",
      address: "405 Commercial Center, BKC, Mumbai, Maharashtra - 400051",
      gstin: "27BBBCL987612Z1",
      password: "password123",
      createdAt: "2026-09-20",
      status: "Active"
    },
    {
      id: "CL003",
      companyName: "Apex Retail Solutions",
      contactPerson: "Vikram Patel",
      email: "apexretail@gmail.com",
      mobile: "+91 97234 56789",
      state: "Karnataka",
      address: "88 MG Road, Indiranagar, Bengaluru, Karnataka - 560038",
      gstin: "29CCCAR456711Z9",
      password: "password123",
      createdAt: "2026-09-18",
      status: "Active"
    },
    {
      id: "CL004",
      companyName: "GreenField Organics Pvt Ltd",
      contactPerson: "Suresh Nair",
      email: "info@greenfieldorganics.com",
      mobile: "+91 96345 67890",
      state: "Kerala",
      address: "12 Marine Drive, Kochi, Kerala - 682031",
      gstin: "32DDDFG341211Z4",
      password: "password123",
      createdAt: "2026-09-10",
      status: "Active"
    },
    {
      id: "CL005",
      companyName: "Nova BioTech Solutions",
      contactPerson: "Dr. Kavita Rao",
      email: "support@novabiotech.io",
      mobile: "+91 95456 78901",
      state: "Telangana",
      address: "502 Genome Valley, HITEC City, Hyderabad, Telangana - 500081",
      gstin: "36EEENB876511Z2",
      password: "password123",
      createdAt: "2026-09-05",
      status: "Active"
    }
  ],

  spocs: [
    {
      id: "SPOC001",
      name: "Priya Shah",
      title: "Senior Incorporation Expert",
      mobile: "+91 98980 11223",
      email: "priya@legalsthal.com",
      assignedClientsCount: 18,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "SPOC002",
      name: "Rahul Sharma",
      title: "Client Relationship Executive",
      mobile: "+91 98765 11111",
      email: "rahul@legalsthal.com",
      assignedClientsCount: 24,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "SPOC003",
      name: "Amit Verma",
      title: "Tax & Compliance Specialist",
      mobile: "+91 97111 22233",
      email: "amit@legalsthal.com",
      assignedClientsCount: 15,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"
    }
  ],

  services: [
    {
      id: "SRV001",
      clientId: "CL001",
      serviceCode: "INC-2026-001",
      serviceType: "Company Incorporation",
      companyType: "Private Limited",
      state: "Gujarat",
      status: "In Progress",
      currentStageIndex: 2,
      progressPercentage: 40,
      spocId: "SPOC001",
      totalAmount: 9999,
      paidAmount: 499,
      remainingAmount: 9500,
      createdAt: "2026-09-25",
      stages: [
        { name: "RUN (Name Approval)", status: "COMPLETED", completedOn: "28 Sep 2026", description: "Name reservation approved by MCA." },
        { name: "Document Verification", status: "COMPLETED", completedOn: "30 Sep 2026", description: "KYC and subscriber documents verified." },
        { name: "DSC Creation", status: "CURRENT", description: "Digital Signature Certificate token generation in progress." },
        { name: "MCA Form Preparation", status: "PENDING", description: "SPICe+ Part B & AOA/MOA drafting." },
        { name: "MCA Form Upload", status: "PENDING", description: "Submission to ROC Portal." },
        { name: "Waiting for Approval", status: "PENDING", description: "ROC review and Certificate of Incorporation issuance." }
      ],
      documents: [
        { id: "DOC001", name: "PAN Card of Directors", status: "Verified", submittedOn: "28 Sep 2026", required: true, rejectionReason: "" },
        { id: "DOC002", name: "Aadhaar Card of Directors", status: "Verified", submittedOn: "28 Sep 2026", required: true, rejectionReason: "" },
        { id: "DOC003", name: "Address Proof (Bank Statement / Utility Bill)", status: "Rejected", submittedOn: "30 Sep 2026", required: true, rejectionReason: "Address proof image is not clear and page 2 is missing. Please re-upload a clear scanned PDF." },
        { id: "DOC004", name: "Passport Size Photograph", status: "Pending", submittedOn: null, required: true, rejectionReason: "" },
        { id: "DOC005", name: "DIR-2 Consent Form & Utility NOC", status: "Under Review", submittedOn: "01 Oct 2026", required: false, rejectionReason: "" }
      ],
      payments: [
        { id: "PAY001", date: "28 Sep 2026", description: "Initial Booking Fee", amount: 499, status: "Paid", transactionId: "TXN8912301", mode: "UPI / Razorpay" }
      ]
    },
    {
      id: "SRV002",
      clientId: "CL001",
      serviceCode: "GST-2026-042",
      serviceType: "GST Registration",
      companyType: "Private Limited",
      state: "Gujarat",
      status: "Under Review",
      currentStageIndex: 1,
      progressPercentage: 60,
      spocId: "SPOC002",
      totalAmount: 3000,
      paidAmount: 3000,
      remainingAmount: 0,
      createdAt: "2026-09-28",
      stages: [
        { name: "Document Collection", status: "COMPLETED", completedOn: "29 Sep 2026", description: "PAN, premises proof & bank details collected." },
        { name: "Application Drafting & Filing", status: "CURRENT", description: "REG-01 form filed on GST Portal." },
        { name: "Department Verification", status: "PENDING", description: "Aadhaar authentication & tax officer verification." },
        { name: "GSTIN Generation", status: "PENDING", description: "Final GST Registration Certificate issued." }
      ],
      documents: [
        { id: "DOC006", name: "PAN & Aadhaar of Directors", status: "Verified", submittedOn: "29 Sep 2026", required: true, rejectionReason: "" },
        { id: "DOC007", name: "Electricity Bill of Registered Office", status: "Verified", submittedOn: "29 Sep 2026", required: true, rejectionReason: "" },
        { id: "DOC008", name: "NOC from Premises Owner", status: "Under Review", submittedOn: "01 Oct 2026", required: true, rejectionReason: "" }
      ],
      payments: [
        { id: "PAY002", date: "29 Sep 2026", description: "Full Payment", amount: 3000, status: "Paid", transactionId: "TXN8912450", mode: "NetBanking" }
      ]
    },
    {
      id: "SRV003",
      clientId: "CL001",
      serviceCode: "MSME-2026-089",
      serviceType: "MSME Registration",
      companyType: "Private Limited",
      state: "Gujarat",
      status: "Completed",
      currentStageIndex: 2,
      progressPercentage: 100,
      spocId: "SPOC002",
      totalAmount: 1500,
      paidAmount: 1500,
      remainingAmount: 0,
      createdAt: "2026-09-24",
      certificateUrl: "sample_msme_certificate.pdf",
      completedOn: "27 Sep 2026",
      stages: [
        { name: "Data Verification", status: "COMPLETED", completedOn: "25 Sep 2026", description: "PAN & GST details cross-checked." },
        { name: "Portal Application Submission", status: "COMPLETED", completedOn: "26 Sep 2026", description: "Filed on Udyam Registration Portal." },
        { name: "Certificate Issuance", status: "COMPLETED", completedOn: "27 Sep 2026", description: "Udyam Registration Certificate downloaded." }
      ],
      documents: [
        { id: "DOC009", name: "Udyam Declaration & Aadhaar", status: "Verified", submittedOn: "25 Sep 2026", required: true, rejectionReason: "" }
      ],
      payments: [
        { id: "PAY003", date: "25 Sep 2026", description: "Full Registration Fee", amount: 1500, status: "Paid", transactionId: "TXN8911002", mode: "Credit Card" }
      ]
    },
    {
      id: "SRV004",
      clientId: "CL002",
      serviceCode: "INC-2026-009",
      serviceType: "Company Incorporation",
      companyType: "LLP",
      state: "Maharashtra",
      status: "In Progress",
      currentStageIndex: 1,
      progressPercentage: 30,
      spocId: "SPOC001",
      totalAmount: 12000,
      paidAmount: 5000,
      remainingAmount: 7000,
      createdAt: "2026-09-20",
      stages: [
        { name: "RUN (Name Reservation)", status: "COMPLETED", completedOn: "22 Sep 2026", description: "RUN-LLP form submitted and approved." },
        { name: "DSC & DPIN Processing", status: "CURRENT", description: "Partner Digital Signature generation." },
        { name: "FiLLiP Form Submission", status: "PENDING", description: "Incorporation form filing." },
        { name: "LLP Agreement Filing", status: "PENDING", description: "Form 3 filing on MCA." }
      ],
      documents: [
        { id: "DOC010", name: "Partner Identity & Address Proof", status: "Verified", submittedOn: "21 Sep 2026", required: true, rejectionReason: "" },
        { id: "DOC011", name: "Registered Office Proof", status: "Under Review", submittedOn: "29 Sep 2026", required: true, rejectionReason: "" }
      ],
      payments: [
        { id: "PAY004", date: "20 Sep 2026", description: "Advance Payment", amount: 5000, status: "Paid", transactionId: "TXN8829100", mode: "UPI" }
      ]
    },
    {
      id: "SRV005",
      clientId: "CL003",
      serviceCode: "GST-2026-011",
      serviceType: "GST Registration",
      companyType: "Proprietorship",
      state: "Karnataka",
      status: "Completed",
      currentStageIndex: 3,
      progressPercentage: 100,
      spocId: "SPOC003",
      totalAmount: 3000,
      paidAmount: 3000,
      remainingAmount: 0,
      createdAt: "2026-09-18",
      certificateUrl: "sample_gst_certificate.pdf",
      completedOn: "24 Sep 2026",
      stages: [
        { name: "Document Collection", status: "COMPLETED", completedOn: "19 Sep 2026", description: "Documents verified." },
        { name: "Application Filing", status: "COMPLETED", completedOn: "21 Sep 2026", description: "Filing done." },
        { name: "Department Approval", status: "COMPLETED", completedOn: "23 Sep 2026", description: "Approved." },
        { name: "GSTIN Certificate Issuance", status: "COMPLETED", completedOn: "24 Sep 2026", description: "Certificate delivered." }
      ],
      documents: [
        { id: "DOC012", name: "Proprietor PAN & Photo", status: "Verified", submittedOn: "18 Sep 2026", required: true, rejectionReason: "" }
      ],
      payments: [
        { id: "PAY005", date: "18 Sep 2026", description: "Full Payment", amount: 3000, status: "Paid", transactionId: "TXN8761234", mode: "NetBanking" }
      ]
    }
  ],

  catalogServices: fullLegalSthalCatalog,

  quoteRequests: [
    {
      id: "QR001",
      clientId: "CL001",
      clientName: "ABC Technologies Pvt Ltd",
      serviceName: "Startup India Recognition",
      companyType: "Private Limited",
      state: "Gujarat",
      mobile: "+91 98765 43210",
      email: "abc@gmail.com",
      requestedOn: "30 Sep 2026",
      status: "Quote Sent",
      quoteAmount: "₹12,500",
      remarks: "Includes pitch deck formatting and DPIIT portal submission.",
      timeline: [
        { stage: "Requested", date: "30 Sep 2026" },
        { stage: "Quote Sent", date: "01 Oct 2026" }
      ]
    },
    {
      id: "QR002",
      clientId: "CL002",
      clientName: "Zenith Logistics LLP",
      serviceName: "Trademark Registration",
      companyType: "LLP",
      state: "Maharashtra",
      mobile: "+91 98123 45678",
      email: "contact@zenithlogistics.in",
      requestedOn: "01 Oct 2026",
      status: "Requested",
      quoteAmount: null,
      remarks: "Need brand protection for name and logo mark in Class 39.",
      timeline: [
        { stage: "Requested", date: "01 Oct 2026" }
      ]
    },
    {
      id: "QR003",
      clientId: "CL003",
      clientName: "Apex Retail Solutions",
      serviceName: "Annual Corporate Compliance",
      companyType: "Proprietorship",
      state: "Karnataka",
      mobile: "+91 97234 56789",
      email: "apexretail@gmail.com",
      requestedOn: "28 Sep 2026",
      status: "Accepted",
      quoteAmount: "₹18,000",
      remarks: "Client accepted proposal. Service onboarding in progress.",
      timeline: [
        { stage: "Requested", date: "28 Sep 2026" },
        { stage: "Quote Sent", date: "29 Sep 2026" },
        { stage: "Accepted", date: "30 Sep 2026" }
      ]
    }
  ],

  notifications: [
    {
      id: "NTF001",
      clientId: "CL001",
      clientName: "ABC Technologies Pvt Ltd",
      eventType: "Stage Updated",
      details: "Company Incorporation (INC-2026-001) stage updated to 'DSC Creation'",
      channel: "WhatsApp & Email",
      date: "01 Oct 2026, 11:30 AM",
      status: "Delivered"
    },
    {
      id: "NTF002",
      clientId: "CL001",
      clientName: "ABC Technologies Pvt Ltd",
      eventType: "Document Rejected",
      details: "Address Proof rejected with reason: Image unclear",
      channel: "SMS & Email",
      date: "30 Sep 2026, 04:15 PM",
      status: "Delivered"
    },
    {
      id: "NTF003",
      clientId: "CL002",
      clientName: "Zenith Logistics LLP",
      eventType: "Payment Received",
      details: "Payment of ₹5,000 received for SRV004",
      channel: "WhatsApp",
      date: "29 Sep 2026, 02:20 PM",
      status: "Delivered"
    },
    {
      id: "NTF004",
      clientId: "CL001",
      clientName: "ABC Technologies Pvt Ltd",
      eventType: "Login Created",
      details: "Welcome credentials sent to abc@gmail.com",
      channel: "Email",
      date: "25 Sep 2026, 10:00 AM",
      status: "Delivered"
    }
  ],

  crmSync: {
    lastSyncTime: "01 Oct 2026, 10:42 AM",
    status: "Healthy",
    successfulRecords: 124,
    failedRecords: 2,
    records: [
      {
        id: "SYNC001",
        recordName: "ABC Technologies Pvt Ltd",
        crmId: "ZC-890123",
        recordType: "Account & Lead",
        status: "Synced",
        lastAttempt: "01 Oct 2026, 10:42 AM",
        actionMsg: "Account successfully mapped to Zoho CRM Leads."
      },
      {
        id: "SYNC002",
        recordName: "INC-2026-001 - Incorporation",
        crmId: "ZC-890124",
        recordType: "Deal / Stage",
        status: "Synced",
        lastAttempt: "01 Oct 2026, 10:42 AM",
        actionMsg: "Deal stage updated in Zoho Pipeline."
      },
      {
        id: "SYNC003",
        recordName: "Address Proof Doc Attachment",
        crmId: "ZC-991201",
        recordType: "Document Attachment",
        status: "Failed",
        lastAttempt: "01 Oct 2026, 10:42 AM",
        actionMsg: "API Rate limit exceeded on Zoho File Attachment endpoint (Code 429).",
        retryable: true
      },
      {
        id: "SYNC004",
        recordName: "Quote QR002 - Trademark",
        crmId: "ZC-991205",
        recordType: "Quote Lead",
        status: "Failed",
        lastAttempt: "01 Oct 2026, 09:15 AM",
        actionMsg: "Missing mandatory field: Contact_Person_Mobile.",
        retryable: true
      }
    ]
  }
};
