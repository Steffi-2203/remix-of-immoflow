import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BarChart3, Plus, Pencil, Trash2, GripVertical, Loader2 } from 'lucide-react';
import {
  useDistributionKeys,
  useInitializeDistributionKeys,
  useCreateDistributionKey,
  useUpdateDistributionKey,
  useDeleteDistributionKey,
  inputTypeOptions,
  DistributionKey,
} from '@/hooks/useDistributionKeys';
import { useOrganization } from '@/hooks/useOrganization';

interface KeyFormData {
  key_code: string;
  name: string;
  unit: string;
  input_type: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

const emptyFormData: KeyFormData = {
  key_code: '',
  name: '',
  unit: 'Anteil',
  input_type: 'direkteingabe',
  description: '',
  is_active: true,
  sort_order: 100,
};

export function DistributionKeySettings() {
  const { data: organization } = useOrganization();
  const { data: keys, isLoading } = useDistributionKeys();
  const initializeKeys = useInitializeDistributionKeys();
  const createKey = useCreateDistributionKey();
  const updateKey = useUpdateDistributionKey();
  const deleteKey = useDeleteDistributionKey();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<DistributionKey | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<DistributionKey | null>(null);
  const [formData, setFormData] = useState<KeyFormData>(emptyFormData);

  // Initialize keys if none exist
  useEffect(() => {
    if (organization?.id && keys && keys.length === 0 && !initializeKeys.isPending) {
      initializeKeys.mutate(organization.id);
    }
  }, [organization?.id, keys, initializeKeys]);

  const handleOpenCreate = () => {
    setEditingKey(null);
    setFormData({
      ...emptyFormData,
      key_code: `vs_custom_${Date.now()}`,
      sort_order: (keys?.length || 0) + 1,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (key: DistributionKey) => {
    setEditingKey(key);
    setFormData({
      key_code: key.key_code,
      name: key.name,
      unit: key.unit,
      input_type: key.input_type,
      description: key.description || '',
      is_active: key.is_active,
      sort_order: key.sort_order,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (key: DistributionKey) => {
    setKeyToDelete(key);
    setDeleteDialogOpen(true);
  };

  const handleInputTypeChange = (value: string) => {
    const option = inputTypeOptions.find(o => o.value === value);
    setFormData(prev => ({
      ...prev,
      input_type: value,
      unit: option?.unit || prev.unit,
    }));
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    if (editingKey) {
      await updateKey.mutateAsync({
        id: editingKey.id,
        name: formData.name,
        unit: formData.unit,
        input_type: formData.input_type,
        description: formData.description || null,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      });
    } else {
      await createKey.mutateAsync({
        organization_id: organization.id,
        key_code: formData.key_code,
        name: formData.name,
        unit: formData.unit,
        input_type: formData.input_type,
        description: formData.description || null,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (keyToDelete) {
      await deleteKey.mutateAsync(keyToDelete.id);
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    }
  };

  const handleToggleActive = async (key: DistributionKey) => {
    await updateKey.mutateAsync({
      id: key.id,
      is_active: !key.is_active,
    });
  };

  if (isLoading || initializeKeys.isPending) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <div>
                <CardTitle>Verteilerschlüssel</CardTitle>
                <CardDescription>
                  Definieren Sie Ihre eigenen Verteilerschlüssel für die Betriebskostenabrechnung
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Schlüssel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Eingabetyp</TableHead>
                <TableHead>Einheit</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead className="text-center">Aktiv</TableHead>
                <TableHead className="w-[100px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys?.map((key) => (
                <TableRow key={key.id} className={!key.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {key.is_system && (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {inputTypeOptions.find(o => o.value === key.input_type)?.label || key.input_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{key.unit}</TableCell>
                  <TableCell className="text-muted-foreground">{key.description}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={key.is_active}
                      onCheckedChange={() => handleToggleActive(key)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(key)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!key.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(key)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingKey ? 'Verteilerschlüssel bearbeiten' : 'Neuer Verteilerschlüssel'}
            </DialogTitle>
            <DialogDescription>
              Definieren Sie die Eigenschaften des Verteilerschlüssels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Quadratmeter, Personenanzahl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input_type">Eingabetyp *</Label>
              <Select
                value={formData.input_type}
                onValueChange={handleInputTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Eingabetyp wählen" />
                </SelectTrigger>
                <SelectContent>
                  {inputTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label} ({option.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Einheit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="z.B. m², ‰, Pers."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optionale Beschreibung"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Aktiv</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || createKey.isPending || updateKey.isPending}
            >
              {(createKey.isPending || updateKey.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verteilerschlüssel löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Verteilerschlüssel "{keyToDelete?.name}" wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
