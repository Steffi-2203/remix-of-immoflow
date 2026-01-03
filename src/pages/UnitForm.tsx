import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCreateUnit, useUnit, useUpdateUnit } from '@/hooks/useUnits';
import { useProperty } from '@/hooks/useProperties';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const unitTypes = [
  { value: 'wohnung', label: 'Wohnung' },
  { value: 'geschaeft', label: 'Geschäft' },
  { value: 'garage', label: 'Garage' },
  { value: 'stellplatz', label: 'Stellplatz' },
  { value: 'lager', label: 'Lager' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

export default function UnitForm() {
  const { propertyId, unitId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!unitId;

  const { data: property } = useProperty(propertyId);
  const { data: existingUnit, isLoading: isLoadingUnit } = useUnit(unitId);
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();

  const [formData, setFormData] = useState({
    top_nummer: '',
    type: 'wohnung' as 'wohnung' | 'geschaeft' | 'garage' | 'stellplatz' | 'lager' | 'sonstiges',
    floor: '',
    qm: '',
    mea: '',
  });

  useEffect(() => {
    if (existingUnit) {
      setFormData({
        top_nummer: existingUnit.top_nummer || '',
        type: existingUnit.type || 'wohnung',
        floor: existingUnit.floor?.toString() || '',
        qm: existingUnit.qm?.toString() || '',
        mea: existingUnit.mea?.toString() || '',
      });
    }
  }, [existingUnit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const unitData = {
      property_id: propertyId!,
      top_nummer: formData.top_nummer,
      type: formData.type as any,
      floor: formData.floor ? parseInt(formData.floor) : null,
      qm: parseFloat(formData.qm) || 0,
      mea: parseFloat(formData.mea) || 0,
      vs_qm: parseFloat(formData.qm) || 0,
      vs_mea: parseFloat(formData.mea) || 0,
    };

    if (isEditing && unitId) {
      await updateUnit.mutateAsync({ id: unitId, ...unitData });
    } else {
      await createUnit.mutateAsync(unitData);
    }

    navigate(`/liegenschaften/${propertyId}`);
  };

  const isSubmitting = createUnit.isPending || updateUnit.isPending;

  if (isEditing && isLoadingUnit) {
    return (
      <MainLayout title="Laden..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={isEditing ? 'Einheit bearbeiten' : 'Neue Einheit'}
      subtitle={property?.name || ''}
    >
      <div className="mb-6">
        <Link
          to={`/liegenschaften/${propertyId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Liegenschaft
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Einheitsdaten</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="top_nummer">Top-Nummer *</Label>
              <Input
                id="top_nummer"
                name="top_nummer"
                value={formData.top_nummer}
                onChange={handleChange}
                placeholder="z.B. Top 1, Garage 2"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Typ *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Typ wählen" />
                </SelectTrigger>
                <SelectContent>
                  {unitTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Stockwerk</Label>
              <Input
                id="floor"
                name="floor"
                type="number"
                value={formData.floor}
                onChange={handleChange}
                placeholder="z.B. 0, 1, -1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qm">Fläche (m²) *</Label>
              <Input
                id="qm"
                name="qm"
                type="number"
                step="0.01"
                value={formData.qm}
                onChange={handleChange}
                placeholder="z.B. 78.50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mea">MEA (‰) *</Label>
              <Input
                id="mea"
                name="mea"
                type="number"
                step="0.01"
                value={formData.mea}
                onChange={handleChange}
                placeholder="z.B. 79"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/liegenschaften/${propertyId}`)}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Aktualisieren' : 'Erstellen'}
              </>
            )}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
