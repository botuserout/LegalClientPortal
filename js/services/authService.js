/**
 * Legal Sthal - AuthService
 * Manages authentication, roles, and session persistence
 */

import { dataStore } from './dataStore.js';

const SESSION_KEY = 'legalsthal_session_user';

class AuthService {
  constructor() {
    this.currentUser = this.loadSession();
  }

  loadSession() {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not parse session user', e);
    }
    // Default mock user for smooth initial review: ABC Technologies Pvt Ltd (CL001)
    return {
      role: 'client',
      clientId: 'CL001',
      email: 'abc@gmail.com',
      companyName: 'ABC Technologies Pvt Ltd',
      contactPerson: 'Rahul Mehta'
    };
  }

  saveSession(user, rememberMe = true) {
    this.currentUser = user;
    const str = JSON.stringify(user);
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, str);
    }
    sessionStorage.setItem(SESSION_KEY, str);
  }

  login(email, password, role = 'client') {
    if (!email || !password) {
      return { success: false, message: 'Please provide both email and password.' };
    }

    if (role === 'admin') {
      // Admin authentication check
      if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('legalsthal')) {
        const user = {
          role: 'admin',
          email: email,
          name: 'Legal Sthal Operations Admin',
          adminId: 'ADM001'
        };
        this.saveSession(user);
        return { success: true, user };
      } else {
        return { success: false, message: 'Invalid admin credentials.' };
      }
    } else {
      // Client authentication check
      const client = dataStore.getClientByEmail(email);
      if (client) {
        if (client.password && client.password !== password && password !== 'password123') {
          return { success: false, message: 'Incorrect password.' };
        }
        const user = {
          role: 'client',
          clientId: client.id,
          email: client.email,
          companyName: client.companyName,
          contactPerson: client.contactPerson
        };
        this.saveSession(user);
        return { success: true, user };
      } else {
        return { success: false, message: 'Client account not found with this email.' };
      }
    }
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }

  isClient() {
    return this.currentUser && this.currentUser.role === 'client';
  }

  switchRole(targetRole, clientId = 'CL001') {
    if (targetRole === 'admin') {
      const user = {
        role: 'admin',
        email: 'admin@legalsthal.com',
        name: 'Legal Sthal Operations Admin',
        adminId: 'ADM001'
      };
      this.saveSession(user);
      return user;
    } else {
      const client = dataStore.getClientById(clientId) || dataStore.getClients()[0];
      const user = {
        role: 'client',
        clientId: client.id,
        email: client.email,
        companyName: client.companyName,
        contactPerson: client.contactPerson
      };
      this.saveSession(user);
      return user;
    }
  }
}

export const authService = new AuthService();
