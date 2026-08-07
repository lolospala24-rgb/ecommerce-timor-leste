'use client';

import { useEffect, useState } from 'react';
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
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettings, type Settings } from '@/hooks/useSettings';
import toast from 'react-hot-toast';

interface EmailSettingsProps {
  settings: Settings | undefined;
  onSettingsUpdated?: () => Promise<void> | void;
}

// Mirrors SettingsService.PASSWORD_MASK on the backend — sending this value
// back unchanged tells the server "leave the stored password alone".
const PASSWORD_MASK = '••••••••';

const buildFormData = (settings?: Settings) => ({
  smtpHost: settings?.smtpHost || '',
  smtpPort: settings?.smtpPort ?? 587,
  smtpUser: settings?.smtpUser || '',
  smtpPassword: settings?.smtpPassword || '',
  smtpSecure: settings?.smtpSecure ?? false,
  fromEmail: settings?.fromEmail || 'noreply@ecommercetimor.com',
  fromName: settings?.fromName || 'E-commerce Timor-Leste',
  sendOrderConfirmation: settings?.sendOrderConfirmation ?? true,
  sendPaymentConfirmation: settings?.sendPaymentConfirmation ?? true,
  sendShippingUpdate: settings?.sendShippingUpdate ?? true,
  sendWelcomeEmail: settings?.sendWelcomeEmail ?? true,
});

export function EmailSettings({ settings, onSettingsUpdated }: EmailSettingsProps) {
  const { updateSettings, sendTestEmail } = useSettings();
  const [formData, setFormData] = useState(() => buildFormData(settings));

  useEffect(() => {
    setFormData(buildFormData(settings));
  }, [settings]);

  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      await onSettingsUpdated?.();
      toast.success('Email settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setIsSending(true);
    setTestResult(null);
    try {
      await sendTestEmail(testEmail);
      setTestResult({ success: true, message: 'Test email sent successfully!' });
      toast.success('Test email sent');
    } catch (error: any) {
      setTestResult({ success: false, message: error.response?.data?.message || 'Failed to send test email' });
      toast.error('Failed to send test email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Settings</CardTitle>
        <CardDescription>
          Configure SMTP server and email notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure your SMTP settings to enable email notifications for customers.
            Leave empty to use the server&apos;s default mail configuration.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>SMTP Host</Label>
            <Input
              placeholder="smtp.gmail.com"
              value={formData.smtpHost}
              onChange={(e) => handleChange('smtpHost', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>SMTP Port</Label>
            <Input
              type="number"
              placeholder="587"
              value={formData.smtpPort}
              onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>SMTP Username</Label>
            <Input
              placeholder="your-email@gmail.com"
              value={formData.smtpUser}
              onChange={(e) => handleChange('smtpUser', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>SMTP Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={formData.smtpPassword}
              onFocus={() => {
                if (formData.smtpPassword === PASSWORD_MASK) handleChange('smtpPassword', '');
              }}
              onChange={(e) => handleChange('smtpPassword', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave the masked value in place to keep the currently saved password.
            </p>
          </div>

          <div className="space-y-2">
            <Label>From Email</Label>
            <Input
              type="email"
              placeholder="noreply@yourstore.com"
              value={formData.fromEmail}
              onChange={(e) => handleChange('fromEmail', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>From Name</Label>
            <Input
              placeholder="Your Store Name"
              value={formData.fromName}
              onChange={(e) => handleChange('fromName', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Use Secure Connection (SSL/TLS)</Label>
          <Switch
            checked={formData.smtpSecure}
            onCheckedChange={(checked) => handleChange('smtpSecure', checked)}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <Label className="text-base">Email Notifications</Label>

          <div className="flex items-center justify-between">
            <div>
              <Label>Order Confirmation</Label>
              <p className="text-sm text-muted-foreground">Send email when order is placed</p>
            </div>
            <Switch
              checked={formData.sendOrderConfirmation}
              onCheckedChange={(checked) => handleChange('sendOrderConfirmation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Payment Confirmation</Label>
              <p className="text-sm text-muted-foreground">Send email when payment is confirmed</p>
            </div>
            <Switch
              checked={formData.sendPaymentConfirmation}
              onCheckedChange={(checked) => handleChange('sendPaymentConfirmation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Shipping Update</Label>
              <p className="text-sm text-muted-foreground">Send email when an order's status changes</p>
            </div>
            <Switch
              checked={formData.sendShippingUpdate}
              onCheckedChange={(checked) => handleChange('sendShippingUpdate', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Welcome Email</Label>
              <p className="text-sm text-muted-foreground">Send welcome email to new customers</p>
            </div>
            <Switch
              checked={formData.sendWelcomeEmail}
              onCheckedChange={(checked) => handleChange('sendWelcomeEmail', checked)}
            />
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <Label className="text-base">Test Email Configuration</Label>

          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button onClick={handleSendTestEmail} disabled={isSending}>
              <Send className="mr-2 h-4 w-4" />
              Send Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sends using whatever SMTP settings are currently saved — save your changes above first.
          </p>

          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Email Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
