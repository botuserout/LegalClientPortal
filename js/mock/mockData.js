import { fullLegalSthalCatalog } from './fullServiceCatalog.js';

export const initialMockData = {
  // Clean Initial State: Zero dummy clients
  clients: [],

  // Dedicated Internal Operational SPOCs available for manual assignment
  spocs: [
    {
      id: "SPOC001",
      name: "Harshit Srivastav",
      title: "Incorporation Expert",
      mobile: "+91 9546273093",
      email: "legalsthal@gmail.com",
      assignedClientsCount: 2,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "SPOC002",
      name: "Mary Jaiswal",
      title: "Client Relationship Executive",
      mobile: "+91 77620 62093",
      email: "legalsthal@gmail.com",
      assignedClientsCount: 1,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "SPOC003",
      name: "Saurabh Srivastav",
      title: "Senior Incorporation Specialist",
      mobile: "+91 62042 70990",
      email: "legalsthal@gmail.com",
      assignedClientsCount: 1,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "SPOC004",
      name: "Ayush Raj",
      title: "Incorporation Specialist",
      mobile: "+91 91227 37416",
      email: "legalsthal@gmail.com",
      assignedClientsCount: 0,
      status: "Active",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
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
