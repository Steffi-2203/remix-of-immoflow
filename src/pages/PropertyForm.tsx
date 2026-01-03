import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProperty, useCreateProperty, useUpdateProperty } from '@/hooks/useProperties';
import { useEffect } from 'react';

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const { data: existingProperty, isLoading: isLoadingProperty } = useProperty(id);
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  
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
      });
    }
  }, [existingProperty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const propertyData = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      postal_code: formData.postal_code,
      country: formData.country,
      building_year: formData.building_year ? parseInt(formData.building_year) : null,
      total_qm: parseFloat(formData.total_qm) || 0,
      total_mea: parseFloat(formData.total_mea) || 1000,
      bk_anteil_wohnung: parseFloat(formData.bk_anteil_wohnung) || 10,
      bk_anteil_geschaeft: parseFloat(formData.bk_anteil_geschaeft) || 20,
      bk_anteil_garage: parseFloat(formData.bk_anteil_garage) || 20,
    };

    if (isEditing && id) {
      await updateProperty.mutateAsync({ id, ...propertyData });
    } else {
      await createProperty.mutateAsync(propertyData);
    }
    
    navigate('/liegenschaften');
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
