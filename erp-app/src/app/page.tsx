import AppShell from '@/components/AppShell';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect('/login');
  }

  const session = await verifyToken(token);
  if (!session) {
    redirect('/login');
  }

  return <AppShell />;
}
