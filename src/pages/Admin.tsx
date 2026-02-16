import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAdminOrganizations, useAdminStats, AdminOrganization } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
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
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp,
  Search,
  Eye,
  Edit,
  XCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  UserCog,
  ShieldCheck,
  ShieldX,
  Mail,
  Send,
  Copy,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/queryClient';
import { DemoInviteManager } from '@/components/admin/DemoInviteManager';
import { WhiteLabelInquiryManager } from '@/components/admin/WhiteLabelInquiryManager';
import { WhiteLabelLicenseManager } from '@/components/admin/WhiteLabelLicenseManager';

export default function Admin() {
  const { data: organizations, isLoading, refetch } = useAdminOrganizations();
  const stats = useAdminStats();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganization | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTier, setEditTier] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [togglingOrgId, setTogglingOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteRegistrationUrl, setInviteRegistrationUrl] = useState<string | null>(null);

  const filteredOrgs = organizations?.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Aktiv</Badge>;
      case 'trial':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Trial</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Gekündigt</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-muted-foreground"><AlertTriangle className="h-3 w-3 mr-1" />Abgelaufen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      starter: 'Starter',
      professional: 'Professional',
      enterprise: 'Premium',
    };
    return labels[tier] || tier;
  };

  const handleUpdateTier = async () => {
    if (!selectedOrg || !editTier) return;
    
    setIsUpdating(true);
    try {
      await apiRequest('PATCH', `/api/admin/organizations/${selectedOrg.id}`, { 
        subscription_tier: editTier
      });
      
      toast.success('Plan wurde aktualisiert');
      setShowEditDialog(false);
      refetch();
    } catch (error) {
      console.error('Error updating tier:', error);
      toast.error('Fehler beim Aktualisieren des Plans');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = async (org: AdminOrganization) => {
    if (!confirm(`Abo für "${org.name}" wirklich kündigen?`)) return;

    try {
      await apiRequest('PATCH', `/api/admin/organizations/${org.id}`, { 
        subscription_status: 'cancelled'
      });
      
      toast.success('Abo wurde gekündigt');
      refetch();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Fehler beim Kündigen des Abos');
    }
  };

  const handleToggleStatus = async (org: AdminOrganization) => {
    const newStatus = org.subscription_status === 'active' ? 'cancelled' : 'active';
    const actionLabel = newStatus === 'active' ? 'aktiviert' : 'suspendiert';
    
    setTogglingOrgId(org.id);
    try {
      await apiRequest('PATCH', `/api/admin/organizations/${org.id}`, { 
        subscription_status: newStatus
      });
      
      toast.success(`Organisation "${org.name}" wurde ${actionLabel}`);
      refetch();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(`Fehler beim ${newStatus === 'active' ? 'Aktivieren' : 'Suspendieren'} der Organisation`);
    } finally {
      setTogglingOrgId(null);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSendingInvite(true);
    setInviteRegistrationUrl(null);
    try {
      const response = await apiRequest('POST', '/api/admin/invitations', {
        email: inviteEmail,
        name: inviteName || undefined,
        message: inviteMessage || undefined,
      });
      const data = await response.json();
      
      toast.success(data.message || 'Einladung wurde erfolgreich gesendet');
      if (data.registration_url) {
        setInviteRegistrationUrl(data.registration_url);
      }
      setInviteEmail('');
      setInviteName('');
      setInviteMessage('');
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error(error.message || 'Fehler beim Senden der Einladung');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL wurde in die Zwischenablage kopiert');
  };

  if (isLoading) {
    return (
      <MainLayout title="Admin Dashboard" subtitle="Übersicht aller Organisationen">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Admin Dashboard" subtitle="Übersicht aller Organisationen">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/users">
              <UserCog className="h-4 w-4 mr-2" />
              Benutzerverwaltung
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/audit-logs">
              <FileText className="h-4 w-4 mr-2" />
              Audit-Logs
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>MRR</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="stat-mrr">
                <TrendingUp className="h-5 w-5 text-green-500" />
                €{stats.monthlyRecurringRevenue}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Aktive Abos</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="stat-active-subscriptions">
                <CreditCard className="h-5 w-5 text-primary" />
                {stats.activeSubscriptions}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Trial-User</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="stat-trial-users">
                <Clock className="h-5 w-5 text-yellow-500" />
                {stats.trialUsers}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gekündigt</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="stat-cancelled">
                <XCircle className="h-5 w-5 text-red-500" />
                {stats.cancelledSubscriptions}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Gesamt Organisationen</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="stat-total-orgs">
                <Users className="h-5 w-5 text-muted-foreground" />
                {stats.totalOrganizations}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Liegenschaften</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="stat-total-properties">
                <Building2 className="h-5 w-5 text-primary" />
                {stats.totalProperties}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Benutzer</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2" data-testid="stat-total-users">
                <Users className="h-5 w-5 text-primary" />
                {stats.totalUsers}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Customer Invitation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Kunden einladen
            </CardTitle>
            <CardDescription>Senden Sie Einladungen an potenzielle Kunden</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="email"
                  placeholder="E-Mail-Adresse *"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  data-testid="input-invite-email"
                />
                <Input
                  type="text"
                  placeholder="Name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  data-testid="input-invite-name"
                />
              </div>
              <Textarea
                placeholder="Persönliche Nachricht..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-invite-message"
              />
              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit" disabled={isSendingInvite || !inviteEmail} data-testid="button-send-invite">
                  {isSendingInvite ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isSendingInvite ? 'Wird gesendet...' : 'Einladung senden'}
                </Button>
              </div>
              {inviteRegistrationUrl && (
                <div className="flex items-center gap-2 rounded-md border p-3">
                  <span className="text-sm text-muted-foreground flex-shrink-0">Registrierungs-URL:</span>
                  <code className="text-sm flex-1 truncate" data-testid="text-registration-url">{inviteRegistrationUrl}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyUrl(inviteRegistrationUrl)}
                    data-testid="button-copy-registration-url"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Demo Invitations */}
        <DemoInviteManager />

        {/* White Label Inquiries */}
        <WhiteLabelInquiryManager />

        {/* White Label Licenses */}
        <WhiteLabelLicenseManager />

        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organisationen
                </CardTitle>
                <CardDescription>Alle registrierten Organisationen</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">User</TableHead>
                    <TableHead className="text-center">Liegenschaften</TableHead>
                    <TableHead className="text-center">Einheiten</TableHead>
                    <TableHead>Seit</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Keine Organisationen gefunden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrgs.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTierLabel(org.subscription_tier)}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(org.subscription_status)}</TableCell>
                        <TableCell className="text-center">{org.user_count}</TableCell>
                        <TableCell className="text-center">{org.property_count}</TableCell>
                        <TableCell className="text-center">{org.unit_count}</TableCell>
                        <TableCell>
                          {format(new Date(org.created_at), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(org)}
                              disabled={togglingOrgId === org.id}
                              data-testid={`button-toggle-status-${org.id}`}
                              title={org.subscription_status === 'active' ? 'Suspendieren' : 'Aktivieren'}
                            >
                              {togglingOrgId === org.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : org.subscription_status === 'active' ? (
                                <ShieldCheck className="h-4 w-4 text-green-500" />
                              ) : (
                                <ShieldX className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOrg(org);
                                setShowDetailsDialog(true);
                              }}
                              data-testid={`button-view-org-${org.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOrg(org);
                                setEditTier(org.subscription_tier);
                                setShowEditDialog(true);
                              }}
                              data-testid={`button-edit-org-${org.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {org.subscription_status === 'active' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCancelSubscription(org)}
                                data-testid={`button-cancel-org-${org.id}`}
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedOrg?.name}</DialogTitle>
            <DialogDescription>Organisationsdetails</DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium">{getTierLabel(selectedOrg.subscription_tier)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrg.subscription_status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{selectedOrg.user_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Liegenschaften</p>
                  <p className="font-medium">{selectedOrg.property_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Einheiten</p>
                  <p className="font-medium">{selectedOrg.unit_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registriert</p>
                  <p className="font-medium">
                    {format(new Date(selectedOrg.created_at), 'dd.MM.yyyy', { locale: de })}
                  </p>
                </div>
              </div>
              {selectedOrg.trial_ends_at && selectedOrg.subscription_status === 'trial' && (
                <div>
                  <p className="text-sm text-muted-foreground">Trial endet am</p>
                  <p className="font-medium">
                    {format(new Date(selectedOrg.trial_ends_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </p>
                </div>
              )}
              {selectedOrg.stripe_customer_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Stripe Customer ID</p>
                  <p className="font-mono text-sm">{selectedOrg.stripe_customer_id}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan ändern</DialogTitle>
            <DialogDescription>
              Ändern Sie den Subscription-Plan für {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={editTier} onValueChange={setEditTier}>
              <SelectTrigger>
                <SelectValue placeholder="Plan auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter (€39/Monat)</SelectItem>
                <SelectItem value="professional">Professional (€299/Monat)</SelectItem>
                <SelectItem value="enterprise">Enterprise (€399/Monat)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateTier} disabled={isUpdating}>
              {isUpdating ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
