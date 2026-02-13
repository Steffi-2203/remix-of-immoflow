import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function putJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function deleteJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Employee Types ───────────────────────────────────────────────────────
export interface Employee {
  id: string;
  organization_id: string;
  property_id: string | null;
  vorname: string;
  nachname: string;
  svnr: string | null;
  geburtsdatum: string | null;
  adresse: string | null;
  plz: string | null;
  ort: string | null;
  eintrittsdatum: string;
  austrittsdatum: string | null;
  beschaeftigungsart: 'geringfuegig' | 'teilzeit' | 'vollzeit';
  wochenstunden: string | null;
  bruttolohn_monatlich: string;
  kollektivvertrag_stufe: string | null;
  status: 'aktiv' | 'karenz' | 'ausgeschieden';
  created_at: string;
  updated_at: string;
}

export interface PayrollEntry {
  id: string;
  employee_id: string;
  organization_id: string;
  year: number;
  month: number;
  bruttolohn: string;
  sv_dn: string;
  sv_dg: string;
  lohnsteuer: string;
  db_beitrag: string;
  dz_beitrag: string;
  kommunalsteuer: string;
  mvk_beitrag: string;
  nettolohn: string;
  gesamtkosten_dg: string;
  auszahlungsdatum: string | null;
  status: 'entwurf' | 'freigegeben' | 'ausbezahlt';
  created_at: string;
}

export interface EldaSubmission {
  id: string;
  organization_id: string;
  employee_id: string;
  meldungsart: 'anmeldung' | 'abmeldung' | 'aenderung' | 'beitragsgrundlage';
  zeitraum: string | null;
  xml_content: string | null;
  status: 'erstellt' | 'uebermittelt' | 'bestaetigt' | 'fehler';
  created_at: string;
}

// ── Hooks ────────────────────────────────────────────────────────────────

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: () => fetchJson(`${API_BASE}/employees`),
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Employee>) => postJson(`${API_BASE}/employees`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Employee> & { id: string }) =>
      putJson(`${API_BASE}/employees/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJson(`${API_BASE}/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function usePayrollEntries(employeeId: string, year: number) {
  return useQuery<PayrollEntry[]>({
    queryKey: ['payroll', employeeId, year],
    queryFn: () => fetchJson(`${API_BASE}/payroll/${employeeId}/${year}`),
    enabled: !!employeeId && !!year,
  });
}

export function useCalculatePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { employeeId: string; year: number; month: number }) =>
      postJson(`${API_BASE}/payroll/calculate`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });
}

export function useFinalizePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => postJson(`${API_BASE}/payroll/finalize`, { entryId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });
}

export function useGenerateEldaXml() {
  return useMutation({
    mutationFn: ({ employeeId, meldungsart }: { employeeId: string; meldungsart: string }) =>
      fetchJson<{ xml: string; meldungsart: string }>(
        `${API_BASE}/elda/generate/${employeeId}?meldungsart=${meldungsart}`
      ),
  });
}

export function useEldaSubmissions() {
  return useQuery<EldaSubmission[]>({
    queryKey: ['elda-submissions'],
    queryFn: () => fetchJson(`${API_BASE}/elda/submissions`),
  });
}

export function useCreateEldaSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EldaSubmission>) => postJson(`${API_BASE}/elda/submit`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elda-submissions'] }),
  });
}
