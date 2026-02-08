'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const username = formData.get('username');
  const password = formData.get('password');

  // Hardcoded as per user request
  if (username === 'HAYT' && password === 'teddy') {
    const cookieStore = await cookies();
    cookieStore.set('hyat_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    // Redirect on the server side
    redirect('/');
  }

  return { success: false, error: 'Invalid credentials' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('hyat_auth');
  redirect('/login');
}
