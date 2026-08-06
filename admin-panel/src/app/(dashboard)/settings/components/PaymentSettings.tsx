'use client';

import { useState } from 'react';
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
import { CreditCard, Building, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface PaymentSettingsProps {
  settings: any;
}

export function PaymentSettings({ settings }: PaymentSettingsProps) {
  const [formData, setFormData] = useState({
    enableCOD: settings?.enableCOD ?? true,
    enableBankTransfer: settings?.enableBankTransfer ?? true,
    bankName: settings?.bankName || 'Banco Nacional Ultramarino (BNU)',
    bankAccountName: settings?.bankAccountName || 'E-commerce Timor-Leste',
    bankAccountNumber: settings?.bankAccountNumber || '',
    bankIBAN: settings?.bankIBAN || '',
    bankSWIFT: settings?.bankSWIFT || 'BNUTLTLD',
    bankTransferInstructions: settings?.bankTransferInstructions || 'Please transfer the exact amount and upload the payment proof.',
    autoConfirmBankTransfer: settings?.autoConfirmBankTransfer ?? false,
    minCODOrderAmount: settings?.minCODOrderAmount || 0,
    maxCODOrderAmount: settings?.maxCODOrderAmount || 1000,
  });

  const [showBankAccount, setShowBankAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await api.put('/settings/payment', formData);
      toast.success('Payment settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Settings</CardTitle>
        <CardDescription>
          Configure payment methods and bank details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* COD Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">Cash on Delivery (COD)</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to pay when they receive their order
                </p>
              </div>
            </div>
            <Switch
              checked={formData.enableCOD}
              onCheckedChange={(checked) => handleChange('enableCOD', checked)}
            />
          </div>

          {formData.enableCOD && (
            <div className="grid gap-4 md:grid-cols-2 pl-8">
              <div className="space-y-2">
                <Label>Minimum Order Amount for COD</Label>
                <Input
                  type="number"
                  value={formData.minCODOrderAmount}
                  onChange={(e) => handleChange('minCODOrderAmount', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Set to 0 for no minimum</p>
              </div>
              <div className="space-y-2">
                <Label>Maximum Order Amount for COD</Label>
                <Input
                  type="number"
                  value={formData.maxCODOrderAmount}
                  onChange={(e) => handleChange('maxCODOrderAmount', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Set to 0 for no maximum</p>
              </div>
            </div>
          )}
        </div>

        {/* Bank Transfer Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-base">Bank Transfer</Label>
                <p className="text-sm text-muted-foreground">
                  Allow customers to pay via bank transfer
                </p>
              </div>
            </div>
            <Switch
              checked={formData.enableBankTransfer}
              onCheckedChange={(checked) => handleChange('enableBankTransfer', checked)}
            />
          </div>

          {formData.enableBankTransfer && (
            <div className="space-y-4 pl-8">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={formData.bankAccountName}
                    onChange={(e) => handleChange('bankAccountName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <div className="relative">
                    <Input
                      type={showBankAccount ? 'text' : 'password'}
                      value={formData.bankAccountNumber}
                      onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowBankAccount(!showBankAccount)}
                    >
                      {showBankAccount ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={formData.bankIBAN}
                    onChange={(e) => handleChange('bankIBAN', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SWIFT/BIC Code</Label>
                  <Input
                    value={formData.bankSWIFT}
                    onChange={(e) => handleChange('bankSWIFT', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bank Transfer Instructions</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.bankTransferInstructions}
                  onChange={(e) => handleChange('bankTransferInstructions', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-confirm Bank Transfers</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically confirm payments (requires admin approval)
                  </p>
                </div>
                <Switch
                  checked={formData.autoConfirmBankTransfer}
                  onCheckedChange={(checked) => handleChange('autoConfirmBankTransfer', checked)}
                />
              </div>
            </div>
          )}
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Payment settings affect how customers can pay for their orders. Ensure bank details are correct.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Payment Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}