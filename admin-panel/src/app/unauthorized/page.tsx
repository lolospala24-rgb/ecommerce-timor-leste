'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Shield, ArrowLeft, Home, AlertCircle, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // If user becomes authenticated and is admin, redirect to dashboard
    if (!isLoading && isAuthenticated && user?.role === 'ADMIN') {
      router.push('/dashboard');
    }

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, user, router, isLoading]);

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-background to-red-50/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-red-200">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
              <Shield className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-red-600">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Unauthorized Access</p>
              <p className="text-sm text-red-600 mt-1">
                This area is restricted to administrators only.
                Please contact your administrator if you believe this is an error.
              </p>
              {user && (
                <p className="text-sm text-red-600 mt-2">
                  Current role: <span className="font-semibold">{user.role}</span>
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Redirecting to dashboard in {countdown} seconds...
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {!isAuthenticated ? (
            <Button className="w-full" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Go to Login
              </Link>
            </Button>
          ) : (
            <Button className="w-full" asChild>
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}