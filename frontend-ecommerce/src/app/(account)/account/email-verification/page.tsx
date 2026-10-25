'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, Mail, Loader2 } from 'lucide-react';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEmailOtpStatus,
  useRequestEmailOtpCode,
  useVerifyEmailOtpCode,
} from '@/hooks/useEmailOtp';

export default function EmailVerificationPage() {
  const { data: status, isLoading: isStatusLoading } = useEmailOtpStatus();
  const requestCode = useRequestEmailOtpCode();
  const verifyCode = useVerifyEmailOtpCode();

  const [codeRequested, setCodeRequested] = useState(false);
  const [code, setCode] = useState('');

  const handleRequestCode = async () => {
    try {
      await requestCode.mutateAsync();
      toast.success('Kódigu haruka ona ba ita-nia email.');
      setCodeRequested(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'La konsege haruka kódigu.');
    }
  };

  const handleVerifyCode = async () => {
    try {
      await verifyCode.mutateAsync(code);
      toast.success('Email verifika ona!');
      setCode('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kódigu sala.');
    }
  };

  return (
    <div className="space-y-5">
      <AccountAppBar title="Verifika Email" backHref="/account/settings" />

      {isStatusLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : status?.verified ? (
        <div className="space-y-3 rounded-2xl border bg-card p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <p className="font-bold text-foreground">Email verifika ona</p>
          <p className="text-sm text-muted-foreground">{status.email}</p>
        </div>
      ) : !codeRequested ? (
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-foreground">Verifika ita-nia email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ami sei haruka kódigu ba email {status?.email ?? 'ita-nia konta'}.
            </p>
          </div>
          <Button className="w-full" onClick={handleRequestCode} disabled={requestCode.isPending}>
            {requestCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Haruka kódigu
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <p className="font-bold text-foreground">Tau kódigu verifikasaun</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ami haruka kódigu 6-dígitu ba {status?.email ?? 'ita-nia email'}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Kódigu</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-lg tracking-[0.5em]"
            />
          </div>
          <Button className="w-full" onClick={handleVerifyCode} disabled={verifyCode.isPending || code.length !== 6}>
            {verifyCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verifika
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleRequestCode}
            disabled={requestCode.isPending}
          >
            Haruka fali kódigu
          </Button>
        </div>
      )}
    </div>
  );
}
