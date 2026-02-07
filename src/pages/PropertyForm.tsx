import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProperty, useCreateProperty, useUpdateProperty } from '@/hooks/useProperties';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema
const propertySchema = z.object({
  name: z.string().min(1, 'Bezeichnung ist erforderlich').max(100, 'Max. 100 Zeichen'),
  address: z.string().min(1, 'Adresse ist erforderlich').max(200, 'Max. 200 Zeichen'),
  city: z.string().min(1, 'Stadt ist erforderlich').max(100, 'Max. 100 Zeichen'),
  postal_code: z.string().min(1, 'PLZ ist erforderlich').max(20, 'Max. 20 Zeichen'),
});

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const { data: existingProperty, isLoading: isLoadingProperty } = useProperty(id);
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Österreich',
    building_year: '',
    total_qm: '',
    total_mea: '1000',
    bk_anteil_wohnung: '10',
    bk_anteil_geschaeft: '20',
    bk_anteil_garage: '20',
    management_type: 'mrg',
  });

  useEffect(() => {
    if (existingProperty) {
      setFormData({
        name: existingProperty.name || '',
        address: existingProperty.address || '',
        city: existingProperty.city || '',
        postal_code: existingProperty.postal_code || '',
        country: existingProperty.country || 'Österreich',
        building_year: existingProperty.building_year?.toString() || '',
        total_qm: existingProperty.total_qm?.toString() || '',
        total_mea: existingProperty.total_mea?.toString() || '1000',
        bk_anteil_wohnung: existingProperty.bk_anteil_wohnung?.toString() || '10',
        bk_anteil_geschaeft: existingProperty.bk_anteil_geschaeft?.toString() || '20',
        bk_anteil_garage: existingProperty.bk_anteil_garage?.toString() || '20',
        management_type: (existingProperty as any).management_type || 'mrg',
      });
    }
  }, [existingProperty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    // Validate form data
    const result = propertySchema.safeParse(formData);
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }
    
    const propertyData = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      postal_code: formData.postal_code.trim(),
      country: formData.country.trim(),
      building_year: formData.building_year ? parseInt(formData.building_year) : null,
      total_qm: parseFloat(formData.total_qm) || 0,
      total_mea: parseFloat(formData.total_mea) || 1000,
      bk_anteil_wohnung: parseFloat(formData.bk_anteil_wohnung) || 10,
      bk_anteil_geschaeft: parseFloat(formData.bk_anteil_geschaeft) || 20,
      bk_anteil_garage: parseFloat(formData.bk_anteil_garage) || 20,
      management_type: formData.management_type,
    };

    try {
      if (isEditing && id) {
        await updateProperty.mutateAsync({ id, ...propertyData });
        navigate('/liegenschaften');
      } else {
        const newProperty = await createProperty.mutateAsync(propertyData);
        if (newProperty?.id) {
          navigate(`/liegenschaften/${newProperty.id}`);
        } else {
          navigate('/liegenschaften');
        }
      }
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const isSubmitting = createProperty.isPending || updateProperty.isPending;

  if (isEditing && isLoadingProperty) {
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
      title={isEditing ? 'Liegenschaft bearbeiten' : 'Neue Liegenschaft'}
      subtitle={isEditing ? existingProperty?.name : 'Erfassen Sie eine neue Immobilie'}
    >
      <div className="mb-6">
        <Link
          to="/liegenschaften"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Grunddaten */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Grunddaten</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Bezeichnung *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="z.B. Mozartstraße 15"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Straße und Hausnummer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">PLZ *</Label>
              <Input
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                placeholder="z.B. 1040"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Stadt *</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="z.B. Wien"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Land</Label>
              <Input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building_year">Baujahr</Label>
              <Input
                id="building_year"
                name="building_year"
                type="number"
                value={formData.building_year}
                onChange={handleChange}
                placeholder="z.B. 1965"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="management_type">Verwaltungsart</Label>
              <Select
                value={formData.management_type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, management_type: v }))}
              >
                <SelectTrigger id="management_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mrg">MRG – Mietverwaltung</SelectItem>
                  <SelectItem value="weg">WEG – Wohnungseigentum</SelectItem>
                  <SelectItem value="gemischt">Gemischt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Flächen und Anteile */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Flächen und Anteile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_qm">Gesamtfläche (m²)</Label>
              <Input
                id="total_qm"
                name="total_qm"
                type="number"
                step="0.01"
                value={formData.total_qm}
                onChange={handleChange}
                placeholder="z.B. 985.50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_mea">Gesamt MEA (‰)</Label>
              <Input
                id="total_mea"
                name="total_mea"
                type="number"
                step="0.01"
                value={formData.total_mea}
                onChange={handleChange}
                placeholder="1000"
              />
            </div>
          </div>
        </div>

        {/* Betriebskosten-Anteile */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Betriebskosten-Anteile (%)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bk_anteil_wohnung">Wohnung</Label>
              <Input
                id="bk_anteil_wohnung"
                name="bk_anteil_wohnung"
                type="number"
                step="0.01"
                value={formData.bk_anteil_wohnung}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk_anteil_geschaeft">Geschäft</Label>
              <Input
                id="bk_anteil_geschaeft"
                name="bk_anteil_geschaeft"
                type="number"
                step="0.01"
                value={formData.bk_anteil_geschaeft}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk_anteil_garage">Garage</Label>
              <Input
                id="bk_anteil_garage"
                name="bk_anteil_garage"
                type="number"
                step="0.01"
                value={formData.bk_anteil_garage}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/liegenschaften')}>
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
