import { Building2, User, Mail, Calendar, Sparkles, Shield, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { DistributionKeySettings } from '@/components/settings/DistributionKeySettings';
import { FAQSection } from '@/components/settings/FAQSection';
import { HandbookSection } from '@/components/settings/HandbookSection';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { useFeatureTour } from '@/hooks/useFeatureTour';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useIsAdmin } from '@/hooks/useAdmin';

export default function Settings() {
  const { user } = useAuth();
  const { data: organization, isLoading } = useOrganization();
  const { resetTour } = useFeatureTour();
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();
  
  // Initialize session timeout
  useSessionTimeout();

  const handleStartTour = () => {
    resetTour();
    navigate('/dashboard');
  };

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
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="account">Konto</TabsTrigger>
            <TabsTrigger value="privacy">Datenschutz</TabsTrigger>
            <TabsTrigger value="distribution">Verteilungsschlüssel</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="handbook">Handbuch</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Administration</TabsTrigger>}
          </TabsList>

          <TabsContent value="account" className="space-y-6">
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

            {/* Feature Tour Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Einführungstour
                </CardTitle>
                <CardDescription>Lernen Sie alle Funktionen der Software kennen</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Starten Sie die interaktive Tour, um einen Überblick über alle wichtigen Funktionen zu erhalten.
                </p>
                <Button onClick={handleStartTour}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Tour erneut starten
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <PrivacySettings />
          </TabsContent>

          <TabsContent value="distribution">
            <DistributionKeySettings />
          </TabsContent>

          <TabsContent value="faq">
            <FAQSection />
          </TabsContent>

          <TabsContent value="handbook">
            <HandbookSection />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Administration
                  </CardTitle>
                  <CardDescription>
                    Systemweite Einstellungen und Benutzerverwaltung
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" asChild className="justify-start h-auto py-4">
                      <Link to="/admin">
                        <Building2 className="h-5 w-5 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">Organisationen</div>
                          <div className="text-sm text-muted-foreground">
                            Alle Organisationen und Abonnements verwalten
                          </div>
                        </div>
                      </Link>
                    </Button>
                    
                    <Button variant="outline" asChild className="justify-start h-auto py-4">
                      <Link to="/admin/users">
                        <Users className="h-5 w-5 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">Benutzerverwaltung</div>
                          <div className="text-sm text-muted-foreground">
                            Rollen und Berechtigungen zuweisen
                          </div>
                        </div>
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
