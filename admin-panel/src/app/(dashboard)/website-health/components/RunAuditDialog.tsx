'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import {
  useTargetTemplates,
  useStartAudit,
  useAuditDetail,
  useAuditProgress,
  type AuditProgressEvent,
} from '@/hooks/useWebsiteHealth';

interface RunAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultScope: string[];
  onCompleted: (auditId: number) => void;
}

export function RunAuditDialog({ open, onOpenChange, defaultScope, onCompleted }: RunAuditDialogProps) {
  const { data: templates } = useTargetTemplates();
  const startAudit = useStartAudit();
  const [scope, setScope] = useState<string[]>(defaultScope);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [runningAuditId, setRunningAuditId] = useState<number | null>(null);
  const [progress, setProgress] = useState<AuditProgressEvent | null>(null);

  const { data: audit } = useAuditDetail(runningAuditId);
  useAuditProgress(runningAuditId, (event) => {
    setProgress(event);
    if (event.phase === 'completed') {
      onCompleted(event.auditId);
    }
  });

  const toggleScope = (id: string) => {
    setScope((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleStart = async () => {
    const result = await startAudit.mutateAsync({ scope, device });
    setRunningAuditId(result.id);
  };

  const handleClose = () => {
    setRunningAuditId(null);
    setProgress(null);
    onOpenChange(false);
  };

  const isRunning = !!runningAuditId && audit?.status !== 'COMPLETED' && audit?.status !== 'FAILED';
  const percent = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-lg">
        {!runningAuditId ? (
          <>
            <DialogHeader>
              <DialogTitle>Run Website Health Audit</DialogTitle>
              <DialogDescription>
                Choose which pages to audit. Each real Lighthouse score comes from Google's PageSpeed
                Insights API — this can take a minute or two per page.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Label className="text-sm font-medium">Audit Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                {templates?.map((template) => (
                  <label
                    key={template.id}
                    className="flex items-center gap-2 rounded-lg border p-2.5 text-sm hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox checked={scope.includes(template.id)} onCheckedChange={() => toggleScope(template.id)} />
                    {template.label}
                  </label>
                ))}
              </div>

              <Label className="text-sm font-medium">Device</Label>
              <div className="flex gap-2">
                {(['mobile', 'desktop'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDevice(d)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                      device === d ? 'border-primary bg-primary/5 text-primary font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleStart} disabled={scope.length === 0 || startAudit.isPending}>
                {startAudit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run Audit
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {audit?.status === 'COMPLETED'
                  ? 'Audit completed successfully'
                  : audit?.status === 'FAILED'
                    ? 'Audit failed'
                    : 'Running audit...'}
              </DialogTitle>
              <DialogDescription>
                {audit?.status === 'FAILED' ? audit.errorMessage : progress?.message ?? 'Preparing audit...'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {audit?.status === 'COMPLETED' ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <p className="text-2xl font-bold">{Math.round(audit.overallScore ?? 0)}/100</p>
                </div>
              ) : audit?.status === 'FAILED' ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Progress value={percent} />
                  <p className="text-xs text-muted-foreground">
                    {progress ? `${progress.completed} / ${progress.total} pages analyzed` : 'Preparing audit...'}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              {audit?.status === 'FAILED' && (
                <Button variant="outline" onClick={() => setRunningAuditId(null)}>
                  Try Again
                </Button>
              )}
              <Button
                onClick={() => {
                  if (audit?.status === 'COMPLETED' && runningAuditId) onCompleted(runningAuditId);
                  handleClose();
                }}
                disabled={isRunning}
              >
                {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isRunning ? 'Running...' : 'Close'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
