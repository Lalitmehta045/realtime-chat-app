import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from '@lib/axios';
import { initSocket, disconnectSocket } from '@lib/socket';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      authUser: null,
      accessToken: null,
      isCheckingAuth: true,

      // Actions
      setAccessToken: (token) => set({ accessToken: token }),
      setAuthUser: (user) => set({ authUser: user }),

      checkAuth: async () => {
        set({ isCheckingAuth: true });
        try {
          const response = await axios.get('/auth/me');
          const user = response.data.user;
          set({ authUser: user });
          
          // Initialize socket if we have a token
          const { accessToken } = get();
          if (accessToken) {
            initSocket(accessToken);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          set({ authUser: null, accessToken: null });
        } finally {
          set({ isCheckingAuth: false });
        }
      },

      login: async (credentials) => {
        try {
          const response = await axios.post('/auth/login', credentials);
          const { user, accessToken } = response.data;
          
          set({ authUser: user, accessToken });
          initSocket(accessToken);
          
          return { success: true };
        } catch (error) {
          console.error('Login failed:', error);
          return { 
            success: false, 
            error: error.response?.data?.message || 'Login failed' 
          };
        }
      },

      register: async (data) => {
        try {
          const response = await axios.post('/auth/register', data);
          const { user, accessToken } = response.data;
          
          set({ authUser: user, accessToken });
          initSocket(accessToken);
          
          return { success: true };
        } catch (error) {
          console.error('Registration failed:', error);
          return { 
            success: false, 
            error: error.response?.data?.message || 'Registration failed' 
          };
        }
      },

      logout: async () => {
        try {
          await axios.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          disconnectSocket();
          set({ authUser: null, accessToken: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
);
