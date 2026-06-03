import { sb } from './supabase.js';

// Guard — call on every protected page
export async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/index.html'; return null; }
  return session;
}

// Sign in
export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  await sb.auth.signOut();
  window.location.href = '/index.html';
}

// Get current user
export async function getUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}
