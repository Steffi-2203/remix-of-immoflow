import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Loader2, Home, BarChart3, AlertTriangle } from 'lucide-react';
import { useCreateUnit, useUnit, useUpdateUnit } from '@/hooks/useUnits';
import { useProperty } from '@/hooks/useProperties';
import { useDistributionKeys } from '@/hooks/useDistributionKeys';
import { useDistributionKeysWithValues, useSaveUnitDistributionValues, VS_COLUMN_TO_KEY_CODE } from '@/hooks/useUnitDistributionValues';
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

type UnitType = 'wohnung' | 'geschaeft' | 'garage' | 'stellplatz' | 'lager' | 'sonstiges';

interface FormData {
  top_nummer: string;
  type: UnitType;
  floor: string;
  qm: string;
  mea: string;
}

export default function UnitForm() {
  const { propertyId, unitId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!unitId;

  const { data: property } = useProperty(propertyId);
  const { data: existingUnit, isLoading: isLoadingUnit } = useUnit(unitId);
  const { data: distributionKeys, isLoading: isLoadingKeys } = useDistributionKeys();
  const { data: keysWithValues } = useDistributionKeysWithValues(unitId);
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const saveDistributionValues = useSaveUnitDistributionValues();
  
  const [validationError, setValidationError] = useState<string | null>(null);

  // Basic form data
  const [formData, setFormData] = useState<FormData>({
    top_nummer: '',
    type: 'wohnung',
    floor: '',
    qm: '',
    mea: '',
  });

  // Distribution key values stored separately by key_id
  const [distributionValues, setDistributionValues] = useState<Record<string, string>>({});

  // Load existing unit data
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

  // Load distribution values when keysWithValues is available
  useEffect(() => {
    if (keysWithValues && keysWithValues.length > 0) {
      const values: Record<string, string> = {};
      keysWithValues.forEach(key => {
        values[key.id] = key.value?.toString() || '';
      });
      setDistributionValues(values);
    }
  }, [keysWithValues]);

  // For new units or units without distribution values, try to get values from legacy vs_* columns
  useEffect(() => {
    if (existingUnit && distributionKeys && distributionKeys.length > 0 && !keysWithValues?.some(k => k.value > 0)) {
      const values: Record<string, string> = {};
      
      distributionKeys.forEach(key => {
        // Find which vs_* column maps to this key_code
        const vsColumn = Object.entries(VS_COLUMN_TO_KEY_CODE).find(([_, code]) => code === key.key_code)?.[0];
        if (vsColumn && existingUnit[vsColumn as keyof typeof existingUnit] !== undefined) {
          const legacyValue = existingUnit[vsColumn as keyof typeof existingUnit];
          if (legacyValue && legacyValue !== 0) {
            values[key.id] = legacyValue.toString();
          }
        }
      });
      
      if (Object.keys(values).length > 0) {
        setDistributionValues(prev => ({ ...prev, ...values }));
      }
    }
  }, [existingUnit, distributionKeys, keysWithValues]);

  // Auto-sync qm and mea to distribution keys when they change
  useEffect(() => {
    if (formData.qm && distributionKeys) {
      const qmKey = distributionKeys.find(k => k.key_code === 'qm');
      if (qmKey && !distributionValues[qmKey.id]) {
        setDistributionValues(prev => ({ ...prev, [qmKey.id]: formData.qm }));
      }
    }
  }, [formData.qm, distributionKeys]);

  useEffect(() => {
    if (formData.mea && distributionKeys) {
      const meaKey = distributionKeys.find(k => k.key_code === 'mea');
      if (meaKey && !distributionValues[meaKey.id]) {
        setDistributionValues(prev => ({ ...prev, [meaKey.id]: formData.mea }));
      }
    }
  }, [formData.mea, distributionKeys]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationError(null);
  };

  const handleDistributionValueChange = (keyId: string, value: string) => {
    setDistributionValues(prev => ({ ...prev, [keyId]: value }));
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

    // Prepare unit data (basic fields only)
    const unitData: any = {
      property_id: propertyId!,
      top_nummer: formData.top_nummer.trim(),
      type: formData.type,
      floor: formData.floor ? parseInt(formData.floor) : null,
      qm: parseFloat(formData.qm) || 0,
      mea: parseFloat(formData.mea) || 0,
    };

    // Also update legacy vs_* columns for backward compatibility
    if (distributionKeys) {
      distributionKeys.forEach(key => {
        const vsColumn = Object.entries(VS_COLUMN_TO_KEY_CODE).find(([_, code]) => code === key.key_code)?.[0];
        if (vsColumn) {
          const value = distributionValues[key.id];
          if (key.input_type === 'anzahl') {
            unitData[vsColumn] = value ? parseInt(value) : 0;
          } else {
            unitData[vsColumn] = value ? parseFloat(value) : 0;
          }
        }
      });
    }

    try {
      let savedUnitId = unitId;
      
      if (isEditing && unitId) {
        await updateUnit.mutateAsync({ id: unitId, ...unitData });
      } else {
        const newUnit = await createUnit.mutateAsync(unitData);
        savedUnitId = newUnit.id;
      }

      // Save distribution values to the new table
      if (savedUnitId && distributionKeys) {
        const valuesToSave = distributionKeys
          .filter(key => key.is_active)
          .map(key => ({
            distribution_key_id: key.id,
            value: distributionValues[key.id] ? parseFloat(distributionValues[key.id]) : 0,
          }));

        await saveDistributionValues.mutateAsync({
          unitId: savedUnitId,
          values: valuesToSave,
        });
      }

      navigate(`/liegenschaften/${propertyId}`);
    } catch (error) {
      // Error handling is done in the hooks
    }
  };

  const getInputStep = (inputType: string) => {
    switch (inputType) {
      case 'anzahl':
        return '1';
      case 'qm':
      case 'mea':
      case 'promille':
      case 'direkteingabe':
      default:
        return '0.01';
    }
  };

  const isSubmitting = createUnit.isPending || updateUnit.isPending || saveDistributionValues.isPending;
  const isLoading = isLoadingUnit || isLoadingKeys;

  // Get only active distribution keys for display
  const activeDistributionKeys = distributionKeys?.filter(k => k.is_active) || [];

  if (isEditing && isLoading) {
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

        {/* Distribution Keys - Dynamic from Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Verteilerschlüssel ({activeDistributionKeys.length} aktive Schlüssel)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Geben Sie die Werte für die Betriebskostenverteilung dieser Einheit ein. 
              Die Schlüssel können in den Einstellungen konfiguriert werden.
            </p>
            {isLoadingKeys ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : activeDistributionKeys.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Keine aktiven Verteilerschlüssel gefunden. Bitte konfigurieren Sie diese in den Einstellungen.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeDistributionKeys.map((key) => (
                  <div key={key.id} className="space-y-2">
                    <Label htmlFor={`dist-${key.id}`} className="text-sm">
                      {key.name}
                      <span className="text-muted-foreground ml-1">({key.unit})</span>
                    </Label>
                    <Input
                      id={`dist-${key.id}`}
                      type="number"
                      step={getInputStep(key.input_type)}
                      min="0"
                      value={distributionValues[key.id] || ''}
                      onChange={(e) => handleDistributionValueChange(key.id, e.target.value)}
                      placeholder="0"
                    />
                    {key.description && (
                      <p className="text-xs text-muted-foreground">{key.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
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
