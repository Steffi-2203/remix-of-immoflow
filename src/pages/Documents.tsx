import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Search, 
  Building2,
  Home,
  Users
} from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { 
  usePropertyDocuments, 
  useUploadPropertyDocument, 
  useDeletePropertyDocument,
  PROPERTY_DOCUMENT_TYPES,
  PropertyDocument
} from '@/hooks/usePropertyDocuments';
import { useUnits } from '@/hooks/useUnits';
import { 
  useUnitDocuments, 
  useUploadUnitDocument, 
  useDeleteUnitDocument,
  UNIT_DOCUMENT_TYPES,
  UnitDocument
} from '@/hooks/useUnitDocuments';
import { 
  useAllTenantDocuments, 
  useDeleteTenantDocument,
  TENANT_DOCUMENT_TYPES,
  TenantDocumentWithTenant
} from '@/hooks/useTenantDocuments';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';

// Component for property documents section
function PropertyDocumentsSection({ 
  propertyId, 
  propertyName, 
  propertyAddress,
  searchQuery,
  onUploadClick 
}: { 
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  searchQuery: string;
  onUploadClick: () => void;
}) {
  const { data: documents = [] } = usePropertyDocuments(propertyId);
  const deleteDocument = useDeletePropertyDocument();

  const filteredDocs = documents.filter(doc => {
    if (!searchQuery) return true;
    return doc.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleDelete = (doc: PropertyDocument) => {
    deleteDocument.mutate({ id: doc.id, propertyId: doc.property_id, fileUrl: doc.file_url });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">{propertyName}</CardTitle>
            <p className="text-sm text-muted-foreground">{propertyAddress}</p>
          </div>
        </div>
        <Button onClick={onUploadClick}>
          <FileText className="h-4 w-4 mr-2" />
          Dokument hochladen
        </Button>
      </CardHeader>
      <CardContent>
        <DocumentList
          documents={filteredDocs}
          documentTypes={PROPERTY_DOCUMENT_TYPES}
          onDelete={handleDelete}
          isDeleting={deleteDocument.isPending}
          emptyMessage="Keine Dokumente"
          emptyDescription="Laden Sie Dokumente für diese Liegenschaft hoch."
        />
      </CardContent>
    </Card>
  );
}

// Component for unit documents section
function UnitDocumentsSection({ 
  unitId, 
  unitName,
  propertyName,
  unitDetails,
  searchQuery,
  onUploadClick 
}: { 
  unitId: string;
  unitName: string;
  propertyName: string;
  unitDetails: string;
  searchQuery: string;
  onUploadClick: () => void;
}) {
  const { data: documents = [] } = useUnitDocuments(unitId);
  const deleteDocument = useDeleteUnitDocument();

  const filteredDocs = documents.filter(doc => {
    if (!searchQuery) return true;
    return doc.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleDelete = (doc: UnitDocument) => {
    deleteDocument.mutate({ id: doc.id, unitId: doc.unit_id, fileUrl: doc.file_url });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Home className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Top {unitName}</CardTitle>
            <p className="text-sm text-muted-foreground">{propertyName} • {unitDetails}</p>
          </div>
        </div>
        <Button onClick={onUploadClick}>
          <FileText className="h-4 w-4 mr-2" />
          Dokument hochladen
        </Button>
      </CardHeader>
      <CardContent>
        <DocumentList
          documents={filteredDocs}
          documentTypes={UNIT_DOCUMENT_TYPES}
          onDelete={handleDelete}
          isDeleting={deleteDocument.isPending}
          emptyMessage="Keine Dokumente"
          emptyDescription="Laden Sie Dokumente für diese Einheit hoch."
        />
      </CardContent>
    </Card>
  );
}

// Component for tenant documents section
function TenantDocumentsSection({
  documents,
  searchQuery,
  selectedProperty,
}: {
  documents: TenantDocumentWithTenant[];
  searchQuery: string;
  selectedProperty: string;
}) {
  const deleteDocument = useDeleteTenantDocument();

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tenant_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProperty = selectedProperty === 'all' || doc.property_id === selectedProperty;
    return matchesSearch && matchesProperty;
  });

  const handleDelete = (doc: TenantDocumentWithTenant) => {
    deleteDocument.mutate({ id: doc.id, tenantId: doc.tenant_id, fileUrl: doc.file_url });
  };

  if (filteredDocs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Keine Mieter-Dokumente vorhanden</p>
        <p className="text-sm text-muted-foreground mt-1">Dokumente werden automatisch bei Vorschreibungen erstellt oder können auf der Einheiten-Detailseite hochgeladen werden.</p>
      </div>
    );
  }

  // Group documents by tenant
  const groupedByTenant = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.tenant_id]) {
      acc[doc.tenant_id] = {
        tenant_name: doc.tenant_name,
        documents: [],
      };
    }
    acc[doc.tenant_id].documents.push(doc);
    return acc;
  }, {} as Record<string, { tenant_name: string; documents: TenantDocumentWithTenant[] }>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByTenant).map(([tenantId, { tenant_name, documents: tenantDocs }]) => (
        <Card key={tenantId}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">{tenant_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{tenantDocs.length} Dokument{tenantDocs.length !== 1 ? 'e' : ''}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DocumentList
              documents={tenantDocs}
              documentTypes={TENANT_DOCUMENT_TYPES}
              onDelete={handleDelete}
              isDeleting={deleteDocument.isPending}
              emptyMessage="Keine Dokumente"
              emptyDescription="Laden Sie Dokumente für diesen Mieter hoch."
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('property');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{ type: 'property' | 'unit'; id: string } | null>(null);

  const { data: properties } = useProperties();
  const { data: allUnits } = useUnits();
  const { data: tenantDocuments = [] } = useAllTenantDocuments();
  
  const uploadPropertyDoc = useUploadPropertyDocument();
  const uploadUnitDoc = useUploadUnitDocument();

  // Filter properties and units based on selection
  const filteredProperties = properties?.filter(p => 
    selectedProperty === 'all' || p.id === selectedProperty
  ) || [];

  const filteredUnits = allUnits?.filter(u =>
    selectedProperty === 'all' || u.propertyId === selectedProperty
  ) || [];

  const filteredTenantDocs = tenantDocuments.filter(doc =>
    selectedProperty === 'all' || doc.property_id === selectedProperty
  );

  const handleUploadClick = (type: 'property' | 'unit', id: string) => {
    setUploadTarget({ type, id });
    setUploadDialogOpen(true);
  };

  const handleUpload = async (file: File, type: string, name: string) => {
    if (!uploadTarget) return;
    
    if (uploadTarget.type === 'property') {
      await uploadPropertyDoc.mutateAsync({
        propertyId: uploadTarget.id,
        file,
        documentType: type,
        documentName: name,
      });
    } else {
      await uploadUnitDoc.mutateAsync({
        unitId: uploadTarget.id,
        file,
        documentType: type,
        documentName: name,
      });
    }
    setUploadDialogOpen(false);
    setUploadTarget(null);
  };

  const currentDocumentTypes = uploadTarget?.type === 'property' 
    ? PROPERTY_DOCUMENT_TYPES 
    : UNIT_DOCUMENT_TYPES;

  const isUploading = uploadPropertyDoc.isPending || uploadUnitDoc.isPending;

  return (
    <MainLayout
      title="Dokumente"
      subtitle="Dokumentenmanagement für Liegenschaften und Einheiten"
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Dokument suchen..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Alle Liegenschaften" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Liegenschaften</SelectItem>
            {properties?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liegenschaften</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredProperties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Einheiten</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredUnits.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mieter-Dokumente</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTenantDocs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="property">
            <Building2 className="h-4 w-4 mr-2" />
            Liegenschaften
          </TabsTrigger>
          <TabsTrigger value="unit">
            <Home className="h-4 w-4 mr-2" />
            Einheiten
          </TabsTrigger>
          <TabsTrigger value="tenant">
            <Users className="h-4 w-4 mr-2" />
            Mieter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="property" className="space-y-6">
          {filteredProperties.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Keine Liegenschaften vorhanden</p>
              <p className="text-sm text-muted-foreground mt-1">Erstellen Sie zuerst eine Liegenschaft.</p>
            </div>
          ) : (
            filteredProperties.map((property) => (
              <PropertyDocumentsSection
                key={property.id}
                propertyId={property.id}
                propertyName={property.name}
                propertyAddress={`${property.address}, ${property.postal_code || ''} ${property.city}`}
                searchQuery={searchQuery}
                onUploadClick={() => handleUploadClick('property', property.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="unit" className="space-y-6">
          {filteredUnits.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Keine Einheiten vorhanden</p>
              <p className="text-sm text-muted-foreground mt-1">Erstellen Sie zuerst Einheiten in einer Liegenschaft.</p>
            </div>
          ) : (
            filteredUnits.map((unit) => {
              const property = properties?.find(p => p.id === unit.propertyId);
              return (
                <UnitDocumentsSection
                  key={unit.id}
                  unitId={unit.id}
                  unitName={unit.topNummer}
                  propertyName={property?.name || ''}
                  unitDetails={`${unit.qm} m² • ${unit.type}`}
                  searchQuery={searchQuery}
                  onUploadClick={() => handleUploadClick('unit', unit.id)}
                />
              );
            })
          )}
        </TabsContent>

        <TabsContent value="tenant" className="space-y-6">
          <TenantDocumentsSection
            documents={tenantDocuments}
            searchQuery={searchQuery}
            selectedProperty={selectedProperty}
          />
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        documentTypes={currentDocumentTypes}
        onUpload={handleUpload}
        isUploading={isUploading}
      />
    </MainLayout>
  );
}
