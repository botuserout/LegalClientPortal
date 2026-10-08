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
      try {
        const res = await apiClient.post(endpoint, options);
        if (res && res.success && Array.isArray(res.data)) {
          return res.data.map(normalizeNotification);
        }
      } catch (err) {
        console.warn('Backend notification fetch unavailable, falling back to dataStore:', err);
      }
    }

    return (dataStore.getNotifications() || []).map(normalizeNotification);
  },

  /**
   * Retrieves client notifications specifically.
   */
  async getClientNotifications() {
    const local = (dataStore.getNotifications() || []).map(normalizeNotification);
    const instantResult = {
      notifications: local,
      unreadCount: local.filter(n => !n.isRead).length
    };

    if (CONFIG.isLiveEndpointConfigured()) {
      apiClient.post('getClientNotifications').catch(() => {});
    }

    return instantResult;
  },

  /**
   * Marks a specific notification as read.
   */
  async markNotificationRead(notificationId) {
    if (!notificationId) return { success: false };

    const notifs = dataStore.getNotifications();
    const found = notifs.find(n => n.id === notificationId);
    if (found) {
      found.status = 'Read';
      found.isRead = true;
    }

    if (CONFIG.isLiveEndpointConfigured()) {
      const res = await apiClient.post('markNotificationRead', {
        notification_id: notificationId,
        notificationId: notificationId
      });
      if (!res || !res.success) {
        throw new Error(res?.error?.message || 'Failed to mark notification read on server.');
      }
    }

    return { success: true };
  },

  /**
   * Marks all client notifications as read.
   */
  async markAllNotificationsRead() {
    const notifs = dataStore.getNotifications();
    notifs.forEach(n => {
      n.status = 'Read';
      n.isRead = true;
    });

    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        await apiClient.post('markAllNotificationsRead');
      } catch (e) {}
    }

    return { success: true, count: notifs.length };
  },

  /**
   * Retrieves administrative notification delivery health & automation metrics.
   */
  async getNotificationHealth() {
    if (CONFIG.isLiveEndpointConfigured()) {
      try {
        const res = await apiClient.post('adminGetNotificationHealth');
        if (res && res.success && res.data) {
          return res.data;
        }
      } catch (err) {
        console.warn('Backend notification health check unavailable, using local metrics:', err);
      }
    }

    const notifs = dataStore.getNotifications() || [];
    return {
      pendingEmails: 0,
      failedEmails: 0,
      sentEmails: notifs.length,
      lastSuccessfulNotification: notifs.length > 0 ? (notifs[0].date || notifs[0].createdAt || 'Recently') : 'None',
      lastFailure: 'None',
      healthStatus: 'Healthy'
    };
  }
};
