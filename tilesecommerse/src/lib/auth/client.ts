import { useState, useEffect } from 'react';

/**
 * Auth Client for Backend Integration
 * Handles authentication with the tiles e-commerce backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

interface AuthResponse {
  success: boolean;
  user?: any;
  token?: string;
  message?: string;
}

interface SignInParams {
  email: string;
  password: string;
  callbackURL?: string;
}

interface SignUpParams {
  name: string;
  email: string;
  password: string;
  gender?: string;
  callbackURL?: string;
}

export const authClient = {
  signIn: {
    email: async (params: SignInParams) => {
      try {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important: Include cookies
          body: JSON.stringify({
            email: params.email,
            password: params.password,
          }),
        });

        const data: AuthResponse = await response.json();

        if (!response.ok || !data.success) {
          return {
            data: null,
            error: { message: data.message || 'Invalid email or password' },
          };
        }

        // Store token in localStorage and set cookie
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          // Also set cookies for server-side access
          document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          document.cookie = `user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        }

        return { data: data.user, error: null };
      } catch (error) {
        console.error('Sign in error:', error);
        return {
          data: null,
          error: { message: 'Network error. Please try again.' },
        };
      }
    },

    social: async (params?: any) => {
      // Social auth not implemented yet
      return {
        data: null,
        error: { message: 'Social authentication not implemented' },
      };
    },
  },

  signUp: {
    email: async (params: SignUpParams) => {
      try {
        const response = await fetch(`${API_BASE_URL}/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: params.name,
            email: params.email,
            password: params.password,
            gender: params.gender || 'other',
          }),
        });

        const data: AuthResponse = await response.json();

        if (!response.ok || !data.success) {
          return {
            data: null,
            error: { message: data.message || 'Error creating account' },
          };
        }

        // Store token in localStorage and cookies
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          // Also set cookies for server-side access
          document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          document.cookie = `user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        }

        return { data: data.user, error: null };
      } catch (error) {
        console.error('Sign up error:', error);
        return {
          data: null,
          error: { message: 'Network error. Please try again.' },
        };
      }
    },
  },

  signOut: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: 'GET',
        credentials: 'include',
      });

      // Clear local storage and cookies
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      // Clear cookies
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      return { data: { success: true }, error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local storage and cookies even if request fails
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      return { data: { success: true }, error: null };
    }
  },

};

// useSession hook to get current user from localStorage
export function useSession() {
  const [session, setSession] = useState<{ data: { session: { token: string } | null, user: any | null }, isPending: boolean, error: any | null }>({
    data: { session: null, user: null },
    isPending: true,
    error: null,
  });

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('auth_token');
      const user = userStr ? JSON.parse(userStr) : null;

      setSession({
        data: {
          session: token ? { token } : null,
          user: user,
        },
        isPending: false,
        error: null,
      });
    } catch (error) {
      setSession({
        data: { session: null, user: null },
        isPending: false,
        error: error,
      });
    }
  }, []);

  return session;
}

// signOut function
export async function signOut() {
  return await authClient.signOut();
}

// signIn function
export async function signIn(provider: string) {
  console.log("Sign in with:", provider);
  return { data: null, error: { message: 'Not implemented' } };
}
