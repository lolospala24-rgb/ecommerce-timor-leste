'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { useSettings, type Settings } from '@/hooks/useSettings';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface SystemSettingsProps {
  settings: Settings | undefined;
  onSettingsUpdated?: () => Promise<void> | void;
}

const buildFormData = (settings?: Settings) => ({
  maintenanceMode: settings?.maintenanceMode ?? false,
  maintenanceMessage: settings?.maintenanceMessage || 'We are currently under maintenance. Please check back later.',
  registrationOpen: settings?.registrationOpen ?? true,
  sellerVerificationRequired: settings?.sellerVerificationRequired ?? true,
  maxProductImages: settings?.maxProductImages ?? 5,
  enableReviews: settings?.enableReviews ?? true,
  requireReviewApproval: settings?.requireReviewApproval ?? true,
});

export function SystemSettings({ settings, onSettingsUpdated }: SystemSettingsProps) {
  const { updateSettings, clearCache, clearLogs } = useSettings();
  const [formData, setFormData] = useState(() => buildFormData(settings));

  useEffect(() => {
    setFormData(buildFormData(settings));
  }, [settings]);

  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showClearLogsDialog, setShowClearLogsDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      await onSettingsUpdated?.();
      toast.success('System settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const result = await clearCache();
      toast.success(result?.message || 'Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    } finally {
      setIsClearing(false);
      setShowClearCacheDialog(false);
    }
  };

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const result = await clearLogs();
      toast.success(result?.message || 'Logs cleared successfully');
    } catch (error) {
      toast.error('Failed to clear logs');
    } finally {
      setIsClearing(false);
      setShowClearLogsDialog(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>
          Configure system-wide settings and maintenance options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Maintenance Mode */}
        <div className="space-y-4 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Blocks the storefront and API for everyone except admins.
              </p>
            </div>
            <Switch
              checked={formData.maintenanceMode}
              onCheckedChange={(checked: boolean) => handleChange('maintenanceMode', checked)}
            />
          </div>

          {formData.maintenanceMode && (
            <div className="space-y-2 pl-8">
              <Label>Maintenance Message</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.maintenanceMessage}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('maintenanceMessage', e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Registration Settings */}
        <div className="space-y-4 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Allow New Registrations</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to register on the platform
              </p>
            </div>
            <Switch
              checked={formData.registrationOpen}
              onCheckedChange={(checked: boolean) => handleChange('registrationOpen', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Seller Verification Required</Label>
              <p className="text-sm text-muted-foreground">
                Require admin approval for new seller accounts
              </p>
            </div>
            <Switch
              checked={formData.sellerVerificationRequired}
              onCheckedChange={(checked: boolean) => handleChange('sellerVerificationRequired', checked)}
            />
          </div>
        </div>

        {/* Review Settings */}
        <div className="space-y-4 border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable Product Reviews</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to leave product reviews
              </p>
            </div>
            <Switch
              checked={formData.enableReviews}
              onCheckedChange={(checked: boolean) => handleChange('enableReviews', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Require Review Approval</Label>
              <p className="text-sm text-muted-foreground">
                Require admin approval before reviews are published
              </p>
            </div>
            <Switch
              checked={formData.requireReviewApproval}
              onCheckedChange={(checked: boolean) => handleChange('requireReviewApproval', checked)}
            />
          </div>
        </div>

        {/* File Upload Settings */}
        <div className="space-y-4 border-b pb-4">
          <Label className="text-base">File Upload Settings</Label>

          <div className="space-y-2 max-w-xs">
            <Label>Max Product Images per Product</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={formData.maxProductImages}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('maxProductImages', parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* System Maintenance */}
        <div className="space-y-4">
          <Label className="text-base">System Maintenance</Label>

          <div className="grid gap-4 md:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => setShowClearCacheDialog(true)}
              disabled={isClearing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Clear Cache
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowClearLogsDialog(true)}
              disabled={isClearing}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Logs
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Clearing cache may temporarily slow down the site while it rebuilds.
              Clearing logs will remove all activity records permanently.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save System Settings'}
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={showClearCacheDialog}
        onOpenChange={setShowClearCacheDialog}
        title="Clear Cache"
        description="Are you sure you want to clear the system cache? This may temporarily affect site performance."
        confirmText="Clear Cache"
        onConfirm={handleClearCache}
        isLoading={isClearing}
      />

      <ConfirmDialog
        open={showClearLogsDialog}
        onOpenChange={setShowClearLogsDialog}
        title="Clear Logs"
        description="Are you sure you want to clear all system logs? This action cannot be undone."
        confirmText="Clear Logs"
        onConfirm={handleClearLogs}
        isLoading={isClearing}
      />
    </Card>
  );
}
