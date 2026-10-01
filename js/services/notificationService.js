/**
 * Legal Sthal - NotificationService
 * API Abstraction layer for system notifications
 */

import { dataStore } from './dataStore.js';

export const notificationService = {
  getNotifications() {
    return Promise.resolve(dataStore.getNotifications());
  }
};
