'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, Smartphone, Loader2 } from 'lucide-react';
import { AccountAppBar } from '@/components/account/AccountAppBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePhoneVerificationStatus,
  useRequestPhoneCode,
  useVerifyPhoneCode,
} from '@/hooks/usePhoneVerification';

type Step = 'enter-phone' | 'enter-code';

export default function PhoneVerificationPage() {
  const { data: status, isLoading: isStatusLoading } = usePhoneVerificationStatus();
  const requestCode = useRequestPhoneCode();
  const verifyCode = useVerifyPhoneCode();

  const [step, setStep] = useState<Step>('enter-phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const handleRequestCode = async () => {
    try {
      await requestCode.mutateAsync(phone);
      toast.success('Kódigu haruka ona ba ita-nia telefone.');
      setStep('enter-code');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'La konsege haruka kódigu.');
    }
  };

  const handleVerifyCode = async () => {
    try {
      await verifyCode.mutateAsync(code);
      toast.success('Numeru telefone verifika ona!');
      setCode('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kódigu sala.');
    }
  };

  return (
    <div className="space-y-5">
      <AccountAppBar title="Verifika Telefone" backHref="/account/settings" />

      {isStatusLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : status?.phoneVerifiedAt ? (
        <div className="space-y-3 rounded-2xl border bg-card p-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <p className="font-bold text-foreground">Numeru telefone verifika ona</p>
          <p className="text-sm text-muted-foreground">{status.verifiedPhone}</p>
        </div>
      ) : step === 'enter-phone' ? (
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Smartphone className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-foreground">Tau ita-nia numeru telefone</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ita sei simu kódigu SMS atu verifika numeru ida-ne&apos;e.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Numeru telefone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="77xxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleRequestCode} disabled={requestCode.isPending || !phone}>
            {requestCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Haruka kódigu
          </Button>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <p className="font-bold text-foreground">Tau kódigu verifikasaun</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ami haruka kódigu 6-dígitu ba {phone}.
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
