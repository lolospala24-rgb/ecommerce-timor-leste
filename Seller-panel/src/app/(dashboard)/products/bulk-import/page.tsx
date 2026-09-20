'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBulkImportProducts, type BulkImportResult } from '@/hooks/useSellerProducts';

const TEMPLATE_HEADERS = [
  'name',
  'description',
  'category',
  'price',
  'stock',
  'sku',
  'brand',
  'comparePrice',
  'weight',
  'tags',
];

const TEMPLATE_EXAMPLE_ROW = [
  'Handwoven Tais Scarf',
  'A traditional handwoven Tais scarf made by local artisans in Timor-Leste, using natural dyes and cotton thread.',
  'Fashion',
  '15.00',
  '20',
  'TAIS-001',
  '',
  '',
  '0.3',
  'handmade,textile',
];

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(','), TEMPLATE_EXAMPLE_ROW.map((v) => `"${v}"`).join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'product-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImportProducts();

  const handleSubmit = async () => {
    if (!file) return;
    const data = await bulkImport.mutateAsync(file);
    setResult(data);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <PageHeader
        title="Bulk Product Import"
        description="Upload a CSV or Excel file to create many products at once."
        action={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" />
            Download Template
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-medium">Required columns</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1 py-0.5 text-xs">name</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">description</code> (20+ characters),{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">category</code> (must match one of your
              store&apos;s categories by name),{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">price</code>, and{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">stock</code>. Optional columns:{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">sku</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">brand</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">comparePrice</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">weight</code>, and{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">tags</code> (comma-separated).
              Images aren&apos;t supported in bulk import — add photos afterward from each product&apos;s edit page.
            </p>
          </div>

          <label
            htmlFor="bulk-import-file"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground transition-colors hover:border-primary/50"
          >
            <input
              id="bulk-import-file"
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                setResult(null);
                setFile(e.target.files?.[0] ?? null);
              }}
            />
            {file ? (
              <>
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs">Click to choose a different file</p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6" />
                <p className="text-sm">
                  <span className="font-medium text-foreground">Click to upload</span> a .csv or .xlsx file
                </p>
              </>
            )}
          </label>

          <div className="flex justify-end gap-2">
            {file && (
              <Button variant="ghost" size="sm" onClick={reset} disabled={bulkImport.isPending}>
                Cancel
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={handleSubmit} disabled={!file || bulkImport.isPending}>
              {bulkImport.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Import Products
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <Badge className="gap-1 border-0 bg-success/15 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {result.successCount} created
            </Badge>
            {result.errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3.5 w-3.5" />
                {result.errorCount} failed
              </Badge>
            )}
            {result.successCount > 0 && (
              <Link href="/products" className="text-xs font-medium text-primary hover:underline">
                View products →
              </Link>
            )}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Product / Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.results.map((r) => (
                  <TableRow key={r.row}>
                    <TableCell className="text-muted-foreground">{r.row}</TableCell>
                    <TableCell>
                      {r.success ? (
                        <Badge className="gap-1 border-0 bg-success/15 text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Created
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={r.success ? '' : 'text-destructive'}>
                      {r.success ? r.productName : r.error}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
