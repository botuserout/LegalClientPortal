import { fullLegalSthalCatalog } from './fullServiceCatalog.js';

export const initialMockData = {
  // Clean Initial State: Zero dummy clients
  clients: [],

  // Dedicated Internal Operational SPOCs available for manual assignment
  spocs: [
    {
      id: "SPOC001",
      name: "Priya Shah",
      title: "Senior Incorporation Expert",
      mobile: "+91 98980 11223",
      email: "priya@legalsthal.com",
      assignedClientsCount: 0,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "SPOC002",
      name: "Rahul Sharma",
      title: "Client Relationship Executive",
      mobile: "+91 98765 11111",
      email: "rahul@legalsthal.com",
      assignedClientsCount: 0,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "SPOC003",
      name: "Amit Verma",
      title: "Tax & Compliance Specialist",
      mobile: "+91 97111 22233",
      email: "amit@legalsthal.com",
      assignedClientsCount: 0,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"
    }
  ],

  // Clean Initial State: Zero dummy services/orders
  services: [],

  // Comprehensive 31 Service Offerings Catalog
  catalogServices: fullLegalSthalCatalog,

  // Clean Initial State: Zero dummy quote requests
  quoteRequests: [],

  // Clean Initial State: Zero dummy notifications
  notifications: [],

  // Clean Initial State: Zero dummy CRM logs
  crmSync: {
    lastSyncTime: "Never",
    status: "Healthy",
    successfulRecords: 0,
    failedRecords: 0,
    records: []
  }
};
