/**
 * Legal Sthal - PaymentService
 * API Abstraction layer for payments and transactions
 */

import { dataStore } from './dataStore.js';

export const paymentService = {
  getPaymentsByClientId(clientId) {
    const services = dataStore.getServicesByClientId(clientId);
    const payments = [];
    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    services.forEach(srv => {
      totalBilled += (srv.totalAmount || 0);
      totalPaid += (srv.paidAmount || 0);
      totalOutstanding += (srv.remainingAmount || 0);

      (srv.payments || []).forEach(p => {
        payments.push({
          ...p,
          serviceId: srv.id,
          serviceCode: srv.serviceCode,
          serviceType: srv.serviceType
        });
      });
    });

    return Promise.resolve({
      payments,
      summary: {
        totalBilled,
        totalPaid,
        totalOutstanding
      }
    });
  },

  getAllPayments() {
    const services = dataStore.getServices();
    const payments = [];
    services.forEach(srv => {
      const client = dataStore.getClientById(srv.clientId);
      (srv.payments || []).forEach(p => {
        payments.push({
          ...p,
          serviceId: srv.id,
          serviceCode: srv.serviceCode,
          serviceType: srv.serviceType,
          clientId: srv.clientId,
          clientName: client ? client.companyName : "Unknown Client"
        });
      });
    });
    return Promise.resolve(payments);
  }
};
