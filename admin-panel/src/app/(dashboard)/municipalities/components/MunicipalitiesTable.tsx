'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useDeleteMunicipality, MunicipalityData } from '@/hooks/useMunicipalities';

interface MunicipalitiesTableProps {
  municipalities: MunicipalityData[];
  onEdit: (municipality: MunicipalityData) => void;
  onRefresh: () => void;
}

export function MunicipalitiesTable({ municipalities, onEdit, onRefresh }: MunicipalitiesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityData | null>(null);
  const { mutateAsync: deleteMunicipality, isPending: isDeleting } = useDeleteMunicipality();

  const handleDeleteMunicipality = async () => {
    if (!selectedMunicipality) return;
    try {
      await deleteMunicipality(selectedMunicipality.id);
      onRefresh();
    } catch {
      // The hook already shows the error toast.
    } finally {
      setDeleteDialogOpen(false);
      setSelectedMunicipality(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Province</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {municipalities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                No municipalities found
              </TableCell>
            </TableRow>
          ) : (
            municipalities.map((municipality) => (
              <TableRow key={municipality.id}>
                <TableCell className="font-medium">{municipality.name}</TableCell>
                <TableCell>{municipality.province?.name || '-'}</TableCell>
                <TableCell>{municipality.code || '-'}</TableCell>
                <TableCell>
                  <Badge variant={municipality.isActive ? 'secondary' : 'outline'}>
                    {municipality.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {municipality.createdAt ? new Date(municipality.createdAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(municipality)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedMunicipality(municipality);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Municipality"
        description={`Are you sure you want to delete ${selectedMunicipality?.name ?? 'this municipality'}? This action cannot be undone. If it is referenced by addresses or shipping rates, deactivate it instead.`}
        confirmText="Delete"
        onConfirm={handleDeleteMunicipality}
        isLoading={isDeleting}
      />
    </>
  );
}
