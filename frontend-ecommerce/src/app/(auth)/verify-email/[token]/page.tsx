'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';

export default function VerifyEmailPage() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);
  // POST /auth/verify-email has no GET equivalent, so the only way to act on
  // the emailed link is to fire the request as soon as this page loads.
  // React 18 Strict Mode double-invokes effects in dev, which would consume
  // the (single-use) token on the first call and surface a confusing
  // "invalid token" error on the second — this ref makes the request fire
  // exactly once regardless.
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err: any) => {
        setError(err.response?.data?.message || 'This verification link is invalid or has expired.');
        setStatus('error');
      });
  }, [token]);

  if (!token) {
    return null;
  }

  if (status === 'verifying') {
    return (
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="space-y-1.5 pb-2 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Verifying Email</CardTitle>
          <CardDescription>Please wait a moment...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="space-y-1.5 pb-2 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Email Verified</CardTitle>
          <CardDescription>Your account is now active</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-600 animate-in" />
            </div>
            <Alert>
              <AlertDescription>You can now sign in to your account</AlertDescription>
            </Alert>
            <Button className="w-full" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="space-y-1.5 pb-2 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Verification Failed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-destructive animate-in" />
          </div>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">Back to Login</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
