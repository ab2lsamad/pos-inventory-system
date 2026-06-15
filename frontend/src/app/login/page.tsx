'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { canAccessPath, getDefaultRouteForRole } from '@/lib/route-access';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      toast.error('Email and password are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await login({ email: normalizedEmail, password: normalizedPassword });
      toast.success('Welcome back');
      const redirectPath = searchParams.get('redirect');
      const { user } = useAuthStore.getState();
      const fallbackPath = getDefaultRouteForRole(user?.role);
      // Only honor the requested redirect if this role may actually access it
      // (e.g. a cashier must never land on /dashboard).
      const target =
        redirectPath && canAccessPath(user?.role, redirectPath)
          ? redirectPath
          : fallbackPath;
      router.push(target);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Unable to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="login-email"
        type="email"
        label="Email"
        placeholder="admin@pos.com"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        icon={<Mail size={18} />}
      />
      <Input
        id="login-password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        icon={<Lock size={18} />}
      />
      <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
        Sign In
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="gradient-bg relative flex h-screen items-center justify-center overflow-hidden px-4 py-4">
      <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-[var(--accent)]/12 blur-3xl" />
      <div className="absolute bottom-[-8%] right-[-8%] h-80 w-80 rounded-full bg-[var(--navy)]/10 blur-3xl" />

      <div className="grid max-h-full w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--border-glass)] bg-[rgba(255,251,244,0.76)] shadow-2xl shadow-slate-900/10 backdrop-blur-xl lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden h-full flex-col justify-between bg-[var(--navy)] p-10 text-white lg:flex">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-white/12">
              <ShoppingBag size={28} />
            </div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-white/60">
              Pulse POS
            </p>
            <h1 className="mt-4 max-w-md text-4xl font-black leading-tight tracking-tight">
              Retail ops that feel under control.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/72">
              Inventory, checkout, orders, and team workflows in one streamlined interface for daily retail operations.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['Track sales', 'Run checkout', 'Monitor stock'].map((item) => (
              <div key={item} className="rounded-[1.3rem] border border-white/10 bg-white/8 px-4 py-4 text-sm font-semibold">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[var(--text-muted)]">
                Sign In
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)]">
                Welcome to Pulse POS
              </h2>
            </div>

            <div className="rounded-[1.6rem] border border-[var(--border-glass)] bg-white/72 p-6 shadow-xl shadow-slate-900/5">
              <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">Loading login...</div>}>
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
