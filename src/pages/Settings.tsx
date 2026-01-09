import { Building2, User, Mail, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { DistributionKeySettings } from '@/components/settings/DistributionKeySettings';

export default function Settings() {
  const { user } = useAuth();
  const { data: organization, isLoading } = useOrganization();

  if (isLoading) {
    return (
      <MainLayout title="Einstellungen" subtitle="Verwalten Sie Ihr Konto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Einstellungen" subtitle="Verwalten Sie Ihr Konto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Konto
            </CardTitle>
            <CardDescription>Ihre Kontoinformationen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">E-Mail</p>
                <p className="font-medium">{user?.email || 'Nicht verfügbar'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organisation
            </CardTitle>
            <CardDescription>Ihre Organisationsdetails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Organisationsname</p>
              <p className="font-medium text-lg">{organization?.name || 'Nicht verfügbar'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="bg-green-100 text-green-800">Aktiv</Badge>
            </div>
            {organization?.created_at && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Mitglied seit</p>
                  <p className="font-medium">
                    {format(new Date(organization.created_at), 'dd. MMMM yyyy', { locale: de })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribution Keys Section */}
        <DistributionKeySettings />
      </div>
    </MainLayout>
  );
}
