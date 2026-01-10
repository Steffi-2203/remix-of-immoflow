import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Save, User, Euro, CreditCard, Calendar } from 'lucide-react';
import { useUnit } from '@/hooks/useUnits';
import { useProperty } from '@/hooks/useProperties';
import { useTenant, useCreateTenant, useUpdateTenant } from '@/hooks/useTenants';
import { format } from 'date-fns';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

const tenantSchema = z.object({
  first_name: z.string().trim().min(1, 'Vorname ist erforderlich').max(100),
  last_name: z.string().trim().min(1, 'Nachname ist erforderlich').max(100),
  email: z.string().trim().email('Ungültige E-Mail-Adresse').max(255).optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  mietbeginn: z.string().min(1, 'Mietbeginn ist erforderlich'),
  mietende: z.string().optional().or(z.literal('')),
  kaution: z.coerce.number().min(0, 'Kaution muss positiv sein'),
  kaution_bezahlt: z.boolean(),
  grundmiete: z.coerce.number().min(0, 'Grundmiete muss positiv sein'),
  betriebskosten_vorschuss: z.coerce.number().min(0, 'BK-Vorschuss muss positiv sein'),
  heizungskosten_vorschuss: z.coerce.number().min(0, 'Heizungskosten-Vorschuss muss positiv sein'),
  sepa_mandat: z.boolean(),
  iban: z.string().trim().max(34).optional().or(z.literal('')),
  bic: z.string().trim().max(11).optional().or(z.literal('')),
  mandat_reference: z.string().trim().max(35).optional().or(z.literal('')),
  status: z.enum(['aktiv', 'leerstand', 'beendet']),
});

type TenantFormData = z.infer<typeof tenantSchema>;

export default function TenantForm() {
  const { unitId, tenantId, propertyId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!tenantId;

  const { data: unit, isLoading: isLoadingUnit } = useUnit(unitId);
  const { data: property, isLoading: isLoadingProperty } = useProperty(propertyId || unit?.property_id);
  const { data: tenant, isLoading: isLoadingTenant } = useTenant(tenantId);
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mietbeginn: format(new Date(), 'yyyy-MM-dd'),
      mietende: '',
      kaution: 0,
      kaution_bezahlt: false,
      grundmiete: 0,
      betriebskosten_vorschuss: 0,
      heizungskosten_vorschuss: 0,
      sepa_mandat: false,
      iban: '',
      bic: '',
      mandat_reference: '',
      status: 'aktiv',
    },
    values: tenant ? {
      first_name: tenant.first_name,
      last_name: tenant.last_name,
      email: tenant.email || '',
      phone: tenant.phone || '',
      mietbeginn: tenant.mietbeginn,
      mietende: tenant.mietende || '',
      kaution: Number(tenant.kaution),
      kaution_bezahlt: tenant.kaution_bezahlt,
      grundmiete: Number(tenant.grundmiete),
      betriebskosten_vorschuss: Number(tenant.betriebskosten_vorschuss),
      heizungskosten_vorschuss: Number(tenant.heizungskosten_vorschuss),
      sepa_mandat: tenant.sepa_mandat,
      iban: tenant.iban || '',
      bic: tenant.bic || '',
      mandat_reference: tenant.mandat_reference || '',
      status: tenant.status,
    } : undefined,
  });

  const watchSepaMandat = form.watch('sepa_mandat');
  const watchGrundmiete = form.watch('grundmiete');
  const watchBK = form.watch('betriebskosten_vorschuss');
  const watchHeizung = form.watch('heizungskosten_vorschuss');
  const totalRent = (watchGrundmiete || 0) + (watchBK || 0) + (watchHeizung || 0);

  const onSubmit = async (data: TenantFormData) => {
    const tenantData = {
      first_name: data.first_name,
      last_name: data.last_name,
      unit_id: unitId!,
      mietbeginn: data.mietbeginn,
      mietende: data.mietende || null,
      kaution: data.kaution,
      kaution_bezahlt: data.kaution_bezahlt,
      grundmiete: data.grundmiete,
      betriebskosten_vorschuss: data.betriebskosten_vorschuss,
      heizungskosten_vorschuss: data.heizungskosten_vorschuss,
      sepa_mandat: data.sepa_mandat,
      status: data.status,
      email: data.email || null,
      phone: data.phone || null,
      iban: data.iban || null,
      bic: data.bic || null,
      mandat_reference: data.mandat_reference || null,
    };

    if (isEditing && tenantId) {
      await updateTenant.mutateAsync({ id: tenantId, ...tenantData });
    } else {
      await createTenant.mutateAsync(tenantData);
    }

    const effectivePropertyId = propertyId || unit?.property_id;
    navigate(`/einheiten/${effectivePropertyId}/${unitId}`);
  };

  const isLoading = isLoadingUnit || isLoadingProperty || (isEditing && isLoadingTenant);
  const isSaving = createTenant.isPending || updateTenant.isPending;

  if (isLoading) {
    return (
      <MainLayout title="Laden..." subtitle="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const effectivePropertyId = propertyId || unit?.property_id;
  const backUrl = `/einheiten/${effectivePropertyId}/${unitId}`;

  return (
    <MainLayout
      title={isEditing ? 'Mieter bearbeiten' : 'Neuer Mieter'}
      subtitle={unit ? `${unit.top_nummer} - ${property?.name || ''}` : ''}
    >
      {/* Back Button */}
      <Link
        to={backUrl}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Einheit
      </Link>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Persönliche Daten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vorname *</FormLabel>
                      <FormControl>
                        <Input placeholder="Max" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nachname *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mustermann" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="max@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="+43 1 234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status wählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="aktiv">Aktiv</SelectItem>
                        <SelectItem value="beendet">Beendet</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Rental Period */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Mietdauer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mietbeginn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Mietbeginn *
                        <InfoTooltip text="mietbeginn" />
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mietende"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Mietende
                        <InfoTooltip text="mietende" />
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>Leer lassen für unbefristeten Vertrag</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="kaution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Kaution (€)
                        <InfoTooltip text="kaution" />
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kaution_bezahlt"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Kaution bezahlt</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Rent Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Monatliche Miete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="grundmiete"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Grundmiete (€) *
                        <InfoTooltip text="grundmiete" />
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="betriebskosten_vorschuss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        BK-Vorschuss (€) *
                        <InfoTooltip text="betriebskosten" />
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="heizungskosten_vorschuss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Heizungskosten-Vorschuss (€) *
                        <InfoTooltip text="heizkosten" />
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Gesamtmiete monatlich:</span>
                  <span className="text-xl font-bold">
                    € {totalRent.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEPA Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                SEPA-Lastschrift
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="sepa_mandat"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center">
                      SEPA-Lastschriftmandat erteilt
                      <InfoTooltip text="sepa_mandat" />
                    </FormLabel>
                  </FormItem>
                )}
              />

              {watchSepaMandat && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          IBAN
                          <InfoTooltip text="iban" />
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="AT12 3456 7890 1234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          BIC
                          <InfoTooltip text="bic" />
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="BAWAATWW" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mandat_reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          Mandatsreferenz
                          <InfoTooltip text="mandat_reference" />
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="MANDAT-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(backUrl)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? 'Speichern' : 'Mieter anlegen'}
            </Button>
          </div>
        </form>
      </Form>
    </MainLayout>
  );
}
