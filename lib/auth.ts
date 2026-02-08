'use server';

import { cookies } from 'next/headers';

export async function login(formData: FormData) {
  const username = formData.get('username');
  const password = formData.get('password');

  // Hardcoded as per user request, but handled on server
  if (username === 'HAYT' && password === 'teddy') {
    const cookieStore = await cookies();
    cookieStore.set('hyat_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    return { success: true };
  }

  return { success: false, error: 'Invalid credentials' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('hyat_auth');
}
