/**
 * Legal Sthal - NotificationService (notificationService.js)
 * Version: 2.1.0 (Step 8 Notifications & Automation Core)
 * 
 * API abstraction layer for in-app notification state, unread alerts,
 * operational logs, and delivery health monitoring connecting Netlify SPA with Apps Script.
 */

import { apiClient } from './apiClient.js';
import { authState } from '../state/authState.js';
import { dataStore } from './dataStore.js';
import { CONFIG } from '../config.js';

function normalizeNotification(n) {
  if (!n) return null;
  const isRead = n.isRead !== undefined ? n.isRead : (String(n.status || '').toLowerCase() === 'read');
  return {
    id: n.notificationId || n.id || '',
    notificationId: n.notificationId || n.id || '',
    recipientType: n.recipientType || 'CLIENT',
    recipientId: n.recipientId || n.clientId || '',
    clientId: n.clientId || '',
    clientName: n.clientName || '',
    eventType: n.eventType || 'SYSTEM',
    title: n.title || 'System Notification',
    message: n.message || n.details || '',
    details: n.message || n.details || '',
    relatedEntityType: n.relatedEntityType || '',
    relatedEntityId: n.relatedEntityId || '',
    channel: n.channel || 'PORTAL',
    date: n.date || n.createdAt || 'Recently',
    createdAt: n.createdAt || n.date || '',
    status: isRead ? 'Read' : 'Unread',
    isRead: isRead,
    emailStatus: n.emailStatus || 'SENT'
  };
}

export const notificationService = {
  /**
   * Retrieves all notifications for current context (admin logs or client in-app list).
   */
  async getNotifications(options = {}) {
    const isAdmin = authState.isAdmin();
    const endpoint = isAdmin ? 'adminGetNotifications' : 'getClientNotifications';

    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post(endpoint, options);
      if (res.success && Array.isArray(res.data)) {
        return res.data.map(normalizeNotification);
      }
      throw new Error(res.error?.message || 'Failed to load notifications from server.');
    }

    return (dataStore.getNotifications() || []).map(normalizeNotification);
  },

  /**
   * Retrieves client notifications specifically.
   */
  async getClientNotifications() {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('getClientNotifications');
      if (res.success && Array.isArray(res.data)) {
        return {
          notifications: res.data.map(normalizeNotification),
          unreadCount: res.unreadCount !== undefined ? res.unreadCount : res.data.filter(n => !n.isRead).length
        };
      }
      throw new Error(res.error?.message || 'Failed to load client notifications from server.');
    }

    const local = (dataStore.getNotifications() || []).map(normalizeNotification);
    return {
      notifications: local,
      unreadCount: local.filter(n => !n.isRead).length
    };
  },

  /**
   * Marks a specific notification as read.
   */
  async markNotificationRead(notificationId) {
    if (!notificationId) return { success: false };

    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('markNotificationRead', {
        notification_id: notificationId,
        notificationId: notificationId
      });
      if (res.success) {
        return { success: true, message: res.message };
      }
      throw new Error(res.error?.message || 'Failed to mark notification as read on server.');
    }

    const notifs = dataStore.getNotifications();
    const found = notifs.find(n => n.id === notificationId);
    if (found) {
      found.status = 'Read';
      found.isRead = true;
    }
    return { success: true };
  },

  /**
   * Marks all client notifications as read.
   */
  async markAllNotificationsRead() {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('markAllNotificationsRead');
      if (res.success) {
        return { success: true, count: res.count };
      }
      throw new Error(res.error?.message || 'Failed to mark all notifications as read on server.');
    }

    const notifs = dataStore.getNotifications();
    notifs.forEach(n => {
      n.status = 'Read';
      n.isRead = true;
    });
    return { success: true, count: notifs.length };
  },

  /**
   * Retrieves administrative notification delivery health & automation metrics.
   */
  async getNotificationHealth() {
    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('adminGetNotificationHealth');
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.error?.message || 'Failed to load notification health from server.');
    }

    return {
      pendingEmails: 0,
      failedEmails: 0,
      sentEmails: 12,
      lastSuccessfulNotification: 'Just now',
      lastFailure: 'None',
      healthStatus: 'Healthy'
    };
  }
};
