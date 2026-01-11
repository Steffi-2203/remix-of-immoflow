-- Role Permissions Tabelle (mappt zu existierender app_role enum)
CREATE TABLE IF NOT EXISTS role_permissions (
  role public.app_role PRIMARY KEY,
  can_view_finances BOOLEAN DEFAULT false,
  can_edit_finances BOOLEAN DEFAULT false,
  can_view_full_tenant_data BOOLEAN DEFAULT false,
  can_manage_maintenance BOOLEAN DEFAULT false,
  can_approve_invoices BOOLEAN DEFAULT false,
  can_send_messages BOOLEAN DEFAULT false,
  can_manage_users BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Berechtigungen für bestehende Rollen definieren
INSERT INTO role_permissions (role, can_view_finances, can_edit_finances, can_view_full_tenant_data, can_manage_maintenance, can_approve_invoices, can_send_messages, can_manage_users) VALUES
('admin', true, true, true, true, true, true, true),
('property_manager', false, false, false, true, true, true, false),
('finance', true, true, true, false, true, false, false),
('viewer', true, false, true, false, false, false, false)
ON CONFLICT (role) DO UPDATE SET
  can_view_finances = EXCLUDED.can_view_finances,
  can_edit_finances = EXCLUDED.can_edit_finances,
  can_view_full_tenant_data = EXCLUDED.can_view_full_tenant_data,
  can_manage_maintenance = EXCLUDED.can_manage_maintenance,
  can_approve_invoices = EXCLUDED.can_approve_invoices,
  can_send_messages = EXCLUDED.can_send_messages,
  can_manage_users = EXCLUDED.can_manage_users;

-- Wartungsaufträge Tabelle
CREATE TABLE maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('repair', 'maintenance', 'inspection', 'emergency', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_approval', 'completed', 'cancelled')),
  
  assigned_to UUID,
  contractor_name TEXT,
  contractor_contact TEXT,
  
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Wartungsrechnungen Tabelle
CREATE TABLE maintenance_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  maintenance_task_id UUID REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
  
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  contractor_name TEXT NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  document_url TEXT,
  notes TEXT,
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Nachrichten Tabelle
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  maintenance_task_id UUID REFERENCES maintenance_tasks(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  
  recipient_type TEXT CHECK (recipient_type IN ('tenant', 'contractor', 'internal')),
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  
  subject TEXT,
  message_body TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('email', 'sms', 'both')),
  
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed')),
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Task Kommentare Tabelle
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_task_id UUID REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
  
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Role Permissions: Alle authentifizierten Benutzer können lesen
CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Maintenance Tasks Policies
CREATE POLICY "Users can view tasks in their org"
  ON maintenance_tasks FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert tasks in their org"
  ON maintenance_tasks FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update tasks in their org"
  ON maintenance_tasks FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete tasks in their org"
  ON maintenance_tasks FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Maintenance Invoices Policies
CREATE POLICY "Users can view invoices in their org"
  ON maintenance_invoices FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert invoices in their org"
  ON maintenance_invoices FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update invoices in their org"
  ON maintenance_invoices FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete invoices in their org"
  ON maintenance_invoices FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Messages Policies
CREATE POLICY "Users can view messages in their org"
  ON messages FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert messages in their org"
  ON messages FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update messages in their org"
  ON messages FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete messages in their org"
  ON messages FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Task Comments Policies
CREATE POLICY "Users can view task comments"
  ON task_comments FOR SELECT
  USING (maintenance_task_id IN (
    SELECT id FROM maintenance_tasks WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert task comments"
  ON task_comments FOR INSERT
  WITH CHECK (maintenance_task_id IN (
    SELECT id FROM maintenance_tasks WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can update own comments"
  ON task_comments FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON task_comments FOR DELETE
  USING (created_by = auth.uid());