'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FieldNameListEditor } from '../../products/components/FieldNameListEditor';
import { buildFieldsPayload, fieldsToNameList } from '@/lib/productType';
import { useApproveTypeRequest, useRejectTypeRequest, type ProductTypeRequest } from '@/hooks/useProductTypeRequests';

interface ReviewTypeRequestDialogProps {
  request: ProductTypeRequest | null;
  onOpenChange: (open: boolean) => void;
}

export function ReviewTypeRequestDialog({ request, onOpenChange }: ReviewTypeRequestDialogProps) {
  const approve = useApproveTypeRequest();
  const reject = useRejectTypeRequest();
  const [mode, setMode] = useState<'review' | 'reject'>('review');
  const [name, setName] = useState('');
  const [nameTetum, setNameTetum] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<string[]>(['']);
  const [specFields, setSpecFields] = useState<string[]>(['']);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (request) {
      setMode('review');
      setName(request.name);
      setNameTetum(request.nameTetum || '');
      setDescription(request.description || '');
      const requestFields = fieldsToNameList(request.fields);
      const requestSpecFields = fieldsToNameList(request.specFields);
      setFields(requestFields.length > 0 ? requestFields : ['']);
      setSpecFields(requestSpecFields.length > 0 ? requestSpecFields : ['']);
      setRejectReason('');
    }
  }, [request]);

  if (!request) return null;
  const isPending = request.status === 'PENDING';

  const handleApprove = () => {
    approve.mutate(
      {
        id: request.id,
        name: name.trim(),
        nameTetum: nameTetum.trim() || undefined,
        description: description.trim() || undefined,
        fields: buildFieldsPayload(fields.filter((f) => f.trim())),
        specFields: buildFieldsPayload(specFields.filter((f) => f.trim())),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const handleReject = () => {
    reject.mutate({ id: request.id, reason: rejectReason.trim() }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Product Type Request</DialogTitle>
          <DialogDescription>
            Requested by <span className="font-medium">{request.seller.storeName}</span>
            {!isPending && (
              <>
                {' — '}
                <Badge variant={request.status === 'APPROVED' ? 'default' : 'destructive'}>{request.status}</Badge>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {request.description && !isPending && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{request.description}</p>
        )}

        {isPending && mode === 'review' && (
          <div className="space-y-4 py-2">
            {request.description && <p className="text-sm text-muted-foreground">&quot;{request.description}&quot;</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Name (Tetum)</Label>
                <Input value={nameTetum} onChange={(e) => setNameTetum(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <FieldNameListEditor
              fieldNames={fields}
              onChange={setFields}
              label="Variant Fields"
              description="Review/clean up before approving — these become real, shared fields."
              placeholder="Field name (e.g., Color)"
            />
            <FieldNameListEditor
              fieldNames={specFields}
              onChange={setSpecFields}
              label="Suggested Specification Fields"
              description=""
              placeholder="Field name (e.g., Warranty)"
            />
          </div>
        )}

        {isPending && mode === 'reject' && (
          <div className="space-y-2 py-2">
            <Label>Reason for rejection</Label>
            <Textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. A similar type 'Clothing' already covers this — please use that instead."
            />
          </div>
        )}

        {!isPending && (
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Variant fields: </span>
              {fields.filter(Boolean).join(', ') || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Spec fields: </span>
              {specFields.filter(Boolean).join(', ') || '—'}
            </p>
            {request.status === 'REJECTED' && request.rejectionReason && (
              <p className="text-destructive">Reason: {request.rejectionReason}</p>
            )}
            {request.status === 'APPROVED' && request.resultingType && (
              <p className="text-green-600">Created as: {request.resultingType.name}</p>
            )}
          </div>
        )}

        {isPending && (
          <DialogFooter className="gap-2 sm:justify-between">
            {mode === 'review' ? (
              <>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setMode('reject')}>
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={approve.isPending || !name.trim()}>
                  {approve.isPending ? 'Approving...' : 'Approve & Create Type'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setMode('review')}>
                  Back
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={reject.isPending || rejectReason.trim().length < 5}>
                  {reject.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
