'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

interface LogoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutSheet({ open, onOpenChange }: LogoutSheetProps) {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      onOpenChange(false);
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex flex-col items-center gap-3 px-6 pb-8 pt-2 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <LogOut className="h-8 w-8" />
          </span>
          <DrawerTitle className="text-lg font-extrabold">Sai husi konta?</DrawerTitle>
          <DrawerDescription>
            Ita presiza tama fali ho email no password atu haree order no karreta.
          </DrawerDescription>
          <div className="mt-2 flex w-full flex-col gap-2">
            <Button variant="destructive" className="w-full" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? 'Sai hela...' : 'Sim, sai'}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)} disabled={isLoggingOut}>
              Kansela
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
