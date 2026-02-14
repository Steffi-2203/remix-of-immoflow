import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AnnualClosingWizard } from '@/components/accounting/AnnualClosingWizard';

export default function AnnualClosing() {
  return (
    <MainLayout
      title="Jahresabschluss"
      subtitle="Geführter Abschluss mit Checkliste, Abschlussbuchungen und PDF-Bericht"
    >
      <AnnualClosingWizard />
    </MainLayout>
  );
}
