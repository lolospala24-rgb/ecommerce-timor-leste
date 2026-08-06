'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralSettings } from './components/GeneralSettings';
import { PaymentSettings } from './components/PaymentSettings';
import { ShippingSettings } from './components/ShippingSettings';
import { EmailSettings } from './components/EmailSettings';
import { SystemSettings } from './components/SystemSettings';
import {
  Settings,
  CreditCard,
  Truck,
  Mail,
  Shield,
  Save,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { settings, isLoading, refetch, updateSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  const handleSettingsRefresh = async () => {
    await refetch();
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await updateSettings(settings);
      await handleSettingsRefresh();
      toast.success('All settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your store configuration and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="general" className="flex gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex gap-2">
            <Truck className="h-4 w-4" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="email" className="flex gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="system" className="flex gap-2">
            <Shield className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <GeneralSettings settings={settings} onSettingsUpdated={handleSettingsRefresh} />
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <PaymentSettings settings={settings} />
        </TabsContent>

        <TabsContent value="shipping" className="space-y-4">
          <ShippingSettings settings={settings} onSettingsUpdated={handleSettingsRefresh} />
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <EmailSettings settings={settings} />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <SystemSettings settings={settings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}