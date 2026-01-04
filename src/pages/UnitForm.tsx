import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Loader2, Home, BarChart3, Star, AlertTriangle } from 'lucide-react';
import { useCreateUnit, useUnit, useUpdateUnit } from '@/hooks/useUnits';
import { useProperty } from '@/hooks/useProperties';
import { useSubscriptionLimits } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Validation schema
const unitSchema = z.object({
  top_nummer: z.string().min(1, 'Top-Nummer ist erforderlich').max(50, 'Max. 50 Zeichen'),
  qm: z.string().min(1, 'Nutzfläche ist erforderlich'),
  mea: z.string().min(1, 'MEA ist erforderlich'),
});

const unitTypes = [
  { value: 'wohnung', label: 'Wohnung' },
  { value: 'geschaeft', label: 'Geschäft' },
  { value: 'garage', label: 'Garage' },
  { value: 'stellplatz', label: 'Stellplatz' },
  { value: 'lager', label: 'Lager' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

// All 20 distribution keys with their labels and units
const distributionKeyFields = [
  { key: 'vs_qm', label: 'Quadratmeter', unit: 'm²', description: 'Nutzfläche' },
  { key: 'vs_mea', label: 'MEA', unit: '‰', description: 'Miteigentumsanteile' },
  { key: 'vs_personen', label: 'Personenanzahl', unit: 'Pers.', description: 'Bewohner' },
  { key: 'vs_heizung_verbrauch', label: 'Heizungsverbrauch', unit: 'kWh', description: 'Heizverbrauch' },
  { key: 'vs_wasser_verbrauch', label: 'Wasserverbrauch', unit: 'm³', description: 'Wasserverbrauch' },
  { key: 'vs_lift_wohnung', label: 'Lift Wohnung', unit: 'Anteil', description: 'Liftkosten Wohnung' },
  { key: 'vs_lift_geschaeft', label: 'Lift Geschäft', unit: 'Anteil', description: 'Liftkosten Geschäft' },
  { key: 'vs_muell', label: 'Müllentsorgung', unit: 'Anteil', description: 'Müllgebühren' },
  { key: 'vs_strom_allgemein', label: 'Allgemeinstrom', unit: 'Anteil', description: 'Strom Allgemein' },
  { key: 'vs_versicherung', label: 'Versicherung', unit: 'Anteil', description: 'Gebäudeversicherung' },
  { key: 'vs_hausbetreuung', label: 'Hausbetreuung', unit: 'Anteil', description: 'Hausbetreuung' },
  { key: 'vs_garten', label: 'Gartenpflege', unit: 'Anteil', description: 'Gartenpflege' },
  { key: 'vs_schneeraeumung', label: 'Schneeräumung', unit: 'Anteil', description: 'Winterdienst' },
  { key: 'vs_kanal', label: 'Kanalgebühren', unit: 'Anteil', description: 'Kanal' },
  { key: 'vs_grundsteuer', label: 'Grundsteuer', unit: 'Anteil', description: 'Grundsteuer' },
  { key: 'vs_verwaltung', label: 'Verwaltungskosten', unit: 'Anteil', description: 'Verwaltung' },
  { key: 'vs_ruecklage', label: 'Rücklage', unit: 'Anteil', description: 'Instandhaltung' },
  { key: 'vs_sonstiges_1', label: 'Sonstiges 1', unit: 'Anteil', description: 'Frei definierbar' },
  { key: 'vs_sonstiges_2', label: 'Sonstiges 2', unit: 'Anteil', description: 'Frei definierbar' },
  { key: 'vs_sonstiges_3', label: 'Sonstiges 3', unit: 'Anteil', description: 'Frei definierbar' },
];

type UnitType = 'wohnung' | 'geschaeft' | 'garage' | 'stellplatz' | 'lager' | 'sonstiges';

interface FormData {
  top_nummer: string;
  type: UnitType;
  floor: string;
  qm: string;
  mea: string;
  [key: string]: string | UnitType;
}

export default function UnitForm() {
  const { propertyId, unitId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!unitId;

  const { data: property } = useProperty(propertyId);
  const { data: existingUnit, isLoading: isLoadingUnit } = useUnit(unitId);
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const { canAddUnit, maxLimits, currentUsage, getRemainingUnits } = useSubscriptionLimits();
  
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Check if can add unit to this property
  const canAddUnitToProperty = propertyId ? canAddUnit(propertyId) : false;
  const remainingUnits = propertyId ? getRemainingUnits(propertyId) : 0;
  const currentUnitsInProperty = propertyId ? (currentUsage.units[propertyId] || 0) : 0;

  const [formData, setFormData] = useState<FormData>(() => {
    const initial: FormData = {
      top_nummer: '',
      type: 'wohnung',
      floor: '',
      qm: '',
      mea: '',
    };
    // Initialize all distribution key fields
    distributionKeyFields.forEach(field => {
      initial[field.key] = '';
    });
    return initial;
  });

  useEffect(() => {
    if (existingUnit) {
      const newFormData: FormData = {
        top_nummer: existingUnit.top_nummer || '',
        type: existingUnit.type || 'wohnung',
        floor: existingUnit.floor?.toString() || '',
        qm: existingUnit.qm?.toString() || '',
        mea: existingUnit.mea?.toString() || '',
      };
      
      // Set distribution key values from existing unit
      distributionKeyFields.forEach(field => {
        const value = (existingUnit as any)[field.key];
        newFormData[field.key] = value?.toString() || '';
      });
      
      setFormData(newFormData);
    }
  }, [existingUnit]);

  // Auto-sync qm and mea to distribution keys when they change
  useEffect(() => {
    if (formData.qm && !formData.vs_qm) {
      setFormData(prev => ({ ...prev, vs_qm: prev.qm }));
    }
  }, [formData.qm]);

  useEffect(() => {
    if (formData.mea && !formData.vs_mea) {
      setFormData(prev => ({ ...prev, vs_mea: prev.mea }));
    }
  }, [formData.mea]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    // Validate form data
    const result = unitSchema.safeParse(formData);
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }
    
    // Check subscription limits for new units
    if (!isEditing && !canAddUnitToProperty) {
      toast.error('Limit erreicht! Bitte upgraden Sie Ihren Plan.');
      return;
    }

    const unitData: any = {
      property_id: propertyId!,
      top_nummer: formData.top_nummer.trim(),
      type: formData.type,
      floor: formData.floor ? parseInt(formData.floor) : null,
      qm: parseFloat(formData.qm) || 0,
      mea: parseFloat(formData.mea) || 0,
    };

    // Add all distribution key values
    distributionKeyFields.forEach(field => {
      const value = formData[field.key];
      if (field.key === 'vs_personen') {
        unitData[field.key] = value ? parseInt(value as string) : 0;
      } else {
        unitData[field.key] = value ? parseFloat(value as string) : 0;
      }
    });

    try {
      if (isEditing && unitId) {
        await updateUnit.mutateAsync({ id: unitId, ...unitData });
      } else {
        await createUnit.mutateAsync(unitData);
      }
      navigate(`/liegenschaften/${propertyId}`);
    } catch (error) {
      // Error handling is done in the hooks
    }
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

      {/* Limit Warning for new units */}
      {!isEditing && !canAddUnitToProperty && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Limit erreicht! Sie haben bereits {currentUnitsInProperty} von {maxLimits.unitsPerProperty} Einheiten in dieser Liegenschaft.
            </span>
            <Link to="/upgrade">
              <Button size="sm" variant="outline" className="ml-4">
                <Star className="h-4 w-4 mr-2" />
                Plan upgraden
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Basic Unit Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Einheitsdaten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as UnitType }))}
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
                <Label htmlFor="qm">Nutzfläche (m²) *</Label>
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
          </CardContent>
        </Card>

        {/* Distribution Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Verteilerschlüssel (20 Schlüssel)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Geben Sie die Werte für die Betriebskostenverteilung dieser Einheit ein. 
              Die Verteilung erfolgt anteilig zu den Gesamtwerten der Liegenschaft.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {distributionKeyFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key} className="text-sm">
                    {field.label}
                    <span className="text-muted-foreground ml-1">({field.unit})</span>
                  </Label>
                  <Input
                    id={field.key}
                    name={field.key}
                    type="number"
                    step={field.key === 'vs_personen' ? '1' : '0.01'}
                    min="0"
                    value={formData[field.key] as string}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/liegenschaften/${propertyId}`)}
          >
            Abbrechen
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || (!isEditing && !canAddUnitToProperty)}
          >
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
