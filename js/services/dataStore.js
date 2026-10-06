/**
 * Legal Sthal - DataStore
 * Reactive State Management & LocalStorage Persistence
 */

import { initialMockData } from '../mock/mockData.js';
import { fullLegalSthalCatalog } from '../mock/fullServiceCatalog.js';

const STORAGE_KEY = 'legalsthal_app_data_v2';
const LISTENERS = new Set();

class DataStore {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      // Automatically purge legacy mock data from prototype
      localStorage.removeItem('legalsthal_app_data_v1');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse localStorage data, resetting to clean data.', e);
    }
    this.saveData(initialMockData);
    return JSON.parse(JSON.stringify(initialMockData));
  }

  saveData(data = this.data) {
    this.data = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
    this.notify();
  }

  subscribe(listener) {
    LISTENERS.add(listener);
    return () => LISTENERS.delete(listener);
  }

  notify() {
    LISTENERS.forEach(fn => {
      try { fn(this.data); } catch (e) { console.error('DataStore listener error:', e); }
    });
  }

  resetStore() {
    const fresh = JSON.parse(JSON.stringify(initialMockData));
    this.saveData(fresh);
    return fresh;
  }

  // --- CLIENTS ---
  getClients() {
    return this.data.clients || [];
  }

  getClientById(id) {
    return (this.data.clients || []).find(c => c.id === id) || null;
  }

  getClientByEmail(email) {
    if (!email) return null;
    return (this.data.clients || []).find(c => (c.email || '').toLowerCase().trim() === email.toLowerCase().trim()) || null;
  }

  addClient(clientInfo) {
    return this.createClient(clientInfo);
  }

  createClient(clientInfo) {
    const existing = this.getClientByEmail(clientInfo.email);
    if (existing) {
      return { success: false, isExisting: true, client: existing, message: "Existing client found with this email!" };
    }

    const nextNum = (this.data.clients.length + 1).toString().padStart(3, '0');
    const newClient = {
      id: `CL${nextNum}`,
      companyName: clientInfo.companyName,
      contactPerson: clientInfo.contactPerson || clientInfo.companyName,
      email: clientInfo.email,
      mobile: clientInfo.mobile,
      state: clientInfo.state || "Gujarat",
      address: clientInfo.address || "Office Address pending",
      gstin: clientInfo.gstin || "Pending",
      password: clientInfo.password || "password123",
      createdAt: new Date().toISOString().split('T')[0],
      status: "Active"
    };

    this.data.clients.unshift(newClient);

    // Add notification
    this.addNotification({
      clientId: newClient.id,
      clientName: newClient.companyName,
      eventType: "Login Created",
      details: `Account created. Access credentials generated for ${newClient.email}`,
      channel: "Email & SMS",
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: "Delivered"
    });

    this.saveData();
    return { success: true, isExisting: false, client: newClient };
  }

  // --- SERVICES ---
  getServices() {
    return this.data.services || [];
  }

  getServicesByClientId(clientId) {
    return (this.data.services || []).filter(s => s.clientId === clientId);
  }

  getServiceById(id) {
    return (this.data.services || []).find(s => s.id === id) || null;
  }

  addServiceToClient(clientId, serviceInfo) {
    const client = this.getClientById(clientId);
    if (!client) return { success: false, message: "Client not found" };

    const totalCount = (this.data.services.length + 1).toString().padStart(3, '0');
    const codePrefix = serviceInfo.serviceType.toLowerCase().includes('gst') ? 'GST' :
                       serviceInfo.serviceType.toLowerCase().includes('msme') ? 'MSME' :
                       serviceInfo.serviceType.toLowerCase().includes('trademark') ? 'TM' : 'INC';
    
    const serviceCode = `${codePrefix}-2026-${totalCount}`;
    const newServiceId = `SRV${totalCount}`;

    // Default stage sets
    let defaultStages = [
      { name: "Initiation & Verification", status: "COMPLETED", completedOn: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), description: "Service request onboarded." },
      { name: "Document Verification", status: "CURRENT", description: "Verifying required business and identity proofs." },
      { name: "Filing & Processing", status: "PENDING", description: "Government portal application drafting and submission." },
      { name: "Approval & Delivery", status: "PENDING", description: "Final registration certificate generation." }
    ];

    if (serviceInfo.serviceType.includes("Company Incorporation")) {
      defaultStages = [
        { name: "RUN (Name Approval)", status: "COMPLETED", completedOn: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), description: "Name reservation approved by MCA." },
        { name: "Document Verification", status: "CURRENT", description: "KYC and subscriber documents verification." },
        { name: "DSC Creation", status: "PENDING", description: "Digital Signature Certificate token generation." },
        { name: "MCA Form Preparation", status: "PENDING", description: "SPICe+ Part B & AOA/MOA drafting." },
        { name: "MCA Form Upload", status: "PENDING", description: "Submission to ROC Portal." },
        { name: "Waiting for Approval", status: "PENDING", description: "ROC review and Certificate of Incorporation issuance." }
      ];
    }

    const newService = {
      id: newServiceId,
      clientId: clientId,
      serviceCode: serviceCode,
      serviceType: serviceInfo.serviceType,
      companyType: serviceInfo.companyType || client.companyName.includes('LLP') ? 'LLP' : 'Private Limited',
      state: serviceInfo.state || client.state,
      status: "In Progress",
      currentStageIndex: 1,
      progressPercentage: Math.round((1 / defaultStages.length) * 100),
      spocId: serviceInfo.spocId || "SPOC001",
      totalAmount: Number(serviceInfo.totalAmount) || 9999,
      paidAmount: Number(serviceInfo.paidAmount) || 0,
      remainingAmount: (Number(serviceInfo.totalAmount) || 9999) - (Number(serviceInfo.paidAmount) || 0),
      createdAt: new Date().toISOString().split('T')[0],
      stages: defaultStages,
      documents: [
        { id: `DOC_${Date.now()}_1`, name: "Identity Proof (PAN Card)", status: "Verified", submittedOn: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), required: true, rejectionReason: "" },
        { id: `DOC_${Date.now()}_2`, name: "Address Proof (Aadhaar / Passport)", status: "Under Review", submittedOn: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), required: true, rejectionReason: "" },
        { id: `DOC_${Date.now()}_3`, name: "Registered Office Proof (Utility Bill / NOC)", status: "Pending", submittedOn: null, required: true, rejectionReason: "" }
      ],
      payments: Number(serviceInfo.paidAmount) > 0 ? [
        {
          id: `PAY_${Date.now()}`,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          description: "Advance Booking Fee",
          amount: Number(serviceInfo.paidAmount),
          status: "Paid",
          transactionId: `TXN${Math.floor(1000000 + Math.random() * 9000000)}`,
          mode: "Online Portal"
        }
      ] : []
    };

    this.data.services.unshift(newService);

    this.addNotification({
      clientId: client.id,
      clientName: client.companyName,
      eventType: "Service Added",
      details: `New service ${newService.serviceType} (${newService.serviceCode}) assigned to account.`,
      channel: "Email & WhatsApp",
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: "Delivered"
    });

    this.saveData();
    return { success: true, service: newService };
  }

  updateServiceStage(serviceId, stageIndex) {
    const service = this.getServiceById(serviceId);
    if (!service) return { success: false, message: "Service not found" };

    if (stageIndex < 0 || stageIndex >= service.stages.length) {
      return { success: false, message: "Invalid stage index" };
    }

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    service.currentStageIndex = stageIndex;
    
    // Update stage statuses
    service.stages.forEach((st, idx) => {
      if (idx < stageIndex) {
        st.status = "COMPLETED";
        if (!st.completedOn) st.completedOn = dateStr;
      } else if (idx === stageIndex) {
        st.status = "CURRENT";
      } else {
        st.status = "PENDING";
      }
    });

    // Check completion
    if (stageIndex === service.stages.length - 1) {
      const allDone = service.stages.every(s => s.status === "COMPLETED" || s.name === service.stages[stageIndex].name);
      if (allDone) {
        service.stages[stageIndex].status = "COMPLETED";
        service.stages[stageIndex].completedOn = dateStr;
        service.status = "Completed";
        service.progressPercentage = 100;
        service.completedOn = dateStr;
        service.certificateUrl = service.certificateUrl || "sample_certificate.pdf";
      }
    } else {
      service.status = "In Progress";
      service.progressPercentage = Math.round(((stageIndex + 1) / service.stages.length) * 100);
    }

    const client = this.getClientById(service.clientId);
    this.addNotification({
      clientId: service.clientId,
      clientName: client ? client.companyName : "Client",
      eventType: service.status === "Completed" ? "Service Completed" : "Stage Updated",
      details: `${service.serviceType} (${service.serviceCode}) stage moved to '${service.stages[stageIndex].name}'`,
      channel: "WhatsApp & Email",
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: "Delivered"
    });

    this.saveData();
    return { success: true, service };
  }

  // --- DOCUMENTS ---
  getDocumentsByService(serviceId) {
    const s = this.getServiceById(serviceId);
    return s ? s.documents : [];
  }

  getAllDocuments() {
    const docs = [];
    (this.data.services || []).forEach(srv => {
      const client = this.getClientById(srv.clientId);
      (srv.documents || []).forEach(doc => {
        docs.push({
          ...doc,
          serviceId: srv.id,
          serviceCode: srv.serviceCode,
          serviceType: srv.serviceType,
          clientId: srv.clientId,
          clientName: client ? client.companyName : "Unknown Client"
        });
      });
    });
    return docs;
  }

  verifyDocument(serviceId, docId) {
    const service = this.getServiceById(serviceId);
    if (!service) return { success: false, message: "Service not found" };

    const doc = service.documents.find(d => d.id === docId);
    if (!doc) return { success: false, message: "Document not found" };

    doc.status = "Verified";
    doc.rejectionReason = "";
    doc.submittedOn = doc.submittedOn || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const client = this.getClientById(service.clientId);
    this.addNotification({
      clientId: service.clientId,
      clientName: client ? client.companyName : "Client",
      eventType: "Document Verified",
      details: `Document '${doc.name}' for ${service.serviceType} verified successfully.`,
      channel: "Email",
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: "Delivered"
    });

    this.saveData();
    return { success: true, doc };
  }

  rejectDocument(serviceId, docId, reason) {
    const service = this.getServiceById(serviceId);
    if (!service) return { success: false, message: "Service not found" };

    const doc = service.documents.find(d => d.id === docId);
    if (!doc) return { success: false, message: "Document not found" };

    doc.status = "Rejected";
    doc.rejectionReason = reason || "Document copy is invalid or unreadable. Please re-upload.";

    const client = this.getClientById(service.clientId);
    this.addNotification({
      clientId: service.clientId,
      clientName: client ? client.companyName : "Client",
      eventType: "Document Rejected",
      details: `Document '${doc.name}' rejected. Reason: ${doc.rejectionReason}`,
      channel: "SMS & Email",
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: "Delivered"
    });

    this.saveData();
    return { success: true, doc };
  }

  submitDocument(serviceId, docName) {
    const service = this.getServiceById(serviceId);
    if (!service) return { success: false, message: "Service not found" };

    let doc = service.documents.find(d => d.name.toLowerCase() === docName.toLowerCase());
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    if (doc) {
      doc.status = "Under Review";
      doc.submittedOn = dateStr;
      doc.rejectionReason = "";
    } else {
      doc = {
        id: `DOC_${Date.now()}`,
        name: docName,
        status: "Under Review",
        submittedOn: dateStr,
        required: true,
        rejectionReason: ""
      };
      service.documents.push(doc);
    }

    const client = this.getClientById(service.clientId);
    this.addNotification({
      clientId: service.clientId,
      clientName: client ? client.companyName : "Client",
      eventType: "Document Submitted",
      details: `Client submitted new document '${doc.name}' via Google Form.`,
      channel: "Portal Notification",
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: "Delivered"
    });

    this.saveData();
    return { success: true, doc };
  }

  // --- SPOCS ---
  getSpocs() {
    return this.data.spocs || [];
  }

  getSpocById(id) {
    return (this.data.spocs || []).find(s => s.id === id) || null;
  }

  assignSpoc(serviceId, spocId) {
    const service = this.getServiceById(serviceId);
    if (!service) return { success: false, message: "Service not found" };

    const spoc = this.getSpocById(spocId);
    if (!spoc) return { success: false, message: "SPOC not found" };

    service.spocId = spocId;
    this.saveData();
    return { success: true, service, spoc };
  }

  // --- CATALOG SERVICES ---
  getCatalogServices() {
    if (!this.data.catalogServices || this.data.catalogServices.length < 31) {
      this.data.catalogServices = fullLegalSthalCatalog;
      this.saveData();
    }
    return this.data.catalogServices;
  }

  updateCatalogService(id, updates) {
    const cat = (this.data.catalogServices || []).find(c => c.id === id);
    if (!cat) return { success: false };
    Object.assign(cat, updates);
    this.saveData();
    return { success: true, catalogService: cat };
  }

  // --- QUOTE REQUESTS ---
  getQuoteRequests() {
    return this.data.quoteRequests || [];
  }

  getQuoteRequestsByClientId(clientId) {
    return (this.data.quoteRequests || []).filter(q => q.clientId === clientId);
  }

  createQuoteRequest(requestInfo) {
    const nextNum = (this.data.quoteRequests.length + 1).toString().padStart(3, '0');
    const newQuote = {
      id: `QR${nextNum}`,
      clientId: requestInfo.clientId,
      clientName: requestInfo.clientName,
      serviceName: requestInfo.serviceName,
      companyType: requestInfo.companyType || "Private Limited",
      state: requestInfo.state || "Gujarat",
      mobile: requestInfo.mobile,
      email: requestInfo.email,
      requestedOn: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: "Requested",
      quoteAmount: null,
      remarks: requestInfo.remarks || "Standard inquiry for new service.",
      timeline: [
        { stage: "Requested", date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
      ]
    };

    this.data.quoteRequests.unshift(newQuote);

    this.addNotification({
      clientId: requestInfo.clientId,
      clientName: requestInfo.clientName,
      eventType: "Quote Requested",
      details: `New quote requested for '${requestInfo.serviceName}'`,
      channel: "Admin Dashboard",
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: "Delivered"
    });

    this.saveData();
    return { success: true, quote: newQuote };
  }

  updateQuoteStatus(quoteId, status, amount = null, remarks = null) {
    const quote = (this.data.quoteRequests || []).find(q => q.id === quoteId);
    if (!quote) return { success: false, message: "Quote request not found" };

    quote.status = status;
    if (amount) quote.quoteAmount = amount;
    if (remarks) quote.remarks = remarks;

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const exists = quote.timeline.some(t => t.stage === status);
    if (!exists) {
      quote.timeline.push({ stage: status, date: dateStr });
    }

    this.addNotification({
      clientId: quote.clientId,
      clientName: quote.clientName,
      eventType: `Quote ${status}`,
      details: `Quote for ${quote.serviceName} marked as ${status}${amount ? ' (' + amount + ')' : ''}`,
      channel: "Email & Portal",
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: "Delivered"
    });

    this.saveData();
    return { success: true, quote };
  }

  // --- NOTIFICATIONS ---
  getNotifications() {
    return this.data.notifications || [];
  }

  addNotification(ntf) {
    const nextId = `NTF${(this.data.notifications.length + 1).toString().padStart(3, '0')}`;
    const newNtf = { id: nextId, ...ntf };
    this.data.notifications.unshift(newNtf);
  }

  // --- CRM SYNC ---
  getCrmSync() {
    return this.data.crmSync || { status: "Healthy", successfulRecords: 0, failedRecords: 0, records: [] };
  }

  retryCrmSyncRecord(syncId) {
    const syncObj = this.data.crmSync;
    const rec = syncObj.records.find(r => r.id === syncId);
    if (!rec) return { success: false };

    rec.status = "Synced";
    rec.actionMsg = "Manual retry successful. Record synced with Zoho CRM.";
    rec.lastAttempt = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    syncObj.successfulRecords += 1;
    syncObj.failedRecords = Math.max(0, syncObj.failedRecords - 1);
    if (syncObj.failedRecords === 0) {
      syncObj.status = "Healthy";
    }

    this.saveData();
    return { success: true, record: rec };
  }
}

export const dataStore = new DataStore();
