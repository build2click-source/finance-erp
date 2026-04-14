'use client';

import React, { useState } from 'react';
import { Sidebar, ViewId } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { DashboardView } from '@/components/views/DashboardView';
import { ClientsView } from '@/components/views/ClientsView';
import { TradesView } from '@/components/views/TradesView';
import { TransactionsView } from '@/components/views/TransactionsView';
import { ReceiptsView } from '@/components/views/ReceiptsView';
import { InvoicesView } from '@/components/views/InvoicesView';
import { LedgerView } from '@/components/views/LedgerView';
import { BankView } from '@/components/views/BankView';
import { ProductsView } from '@/components/views/ProductsView';
import { TenuresView } from '@/components/views/TenuresView';
import { VendorBillsView } from '@/components/views/VendorBillsView';
import { GstReportsView } from '@/components/views/GstReportsView';
import { TradeSummaryView } from '@/components/views/TradeSummaryView';
import { FinancialReportsView } from '@/components/views/FinancialReportsView';
import { OutstandingView } from '@/components/views/OutstandingView';
import { TaxReportsView } from '@/components/views/TaxReportsView';
import { SettingsView } from '@/components/views/SettingsView';
import { AccountsView } from '@/components/views/AccountsView';
import { PaymentsView } from '@/components/views/PaymentsView';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RoleProvider, useRole } from '@/lib/hooks/useRole';
import { ToastProvider } from '@/lib/hooks/useToast';

function AppShellContent() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { allowedViews, isLoading } = useRole();

  const handleNavigate = (view: any) => {
    if (!allowedViews.includes(view as ViewId)) {
      return; // silently blocked — sidebar already hides unauthorized items
    }
    setActiveView(view as ViewId);
  };

  // If still loading session, show a minimal spinner
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-container-low)',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          border: '3px solid var(--border-subtle)',
          borderTopColor: 'var(--color-command-navy)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <main className="main-content">
        <Header
          activeView={activeView}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <div className="page-viewport">
          <div className="page-container">
            <ErrorBoundary>
              {activeView === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
              {activeView === 'clients' && <ClientsView onNavigate={handleNavigate} />}
              {activeView === 'data-entry' && <TradesView onNavigate={handleNavigate} />}
              {activeView === 'transactions' && <TransactionsView onNavigate={handleNavigate} />}
              {activeView === 'receipts' && <ReceiptsView onNavigate={handleNavigate} />}
              {activeView === 'invoices' && <InvoicesView onNavigate={handleNavigate} />}
              {activeView === 'vendor-bills' && <VendorBillsView onNavigate={handleNavigate} />}
              {activeView === 'gst-reports' && <GstReportsView onNavigate={handleNavigate} />}
              {activeView === 'ledger' && <LedgerView onNavigate={handleNavigate} />}
              {activeView === 'bank' && <BankView onNavigate={handleNavigate} />}
              {activeView === 'products' && <ProductsView onNavigate={handleNavigate} />}
              {activeView === 'tenure' && <TenuresView onNavigate={handleNavigate} />}
              {activeView === 'trade-summary' && <TradeSummaryView onNavigate={handleNavigate} />}
              {activeView === 'financial-reports' && <FinancialReportsView onNavigate={handleNavigate} />}
              {activeView === 'outstanding' && <OutstandingView onNavigate={handleNavigate} />}
              {activeView === 'tax-reports' && <TaxReportsView onNavigate={handleNavigate} />}
              {activeView === 'settings' && <SettingsView onNavigate={handleNavigate} />}
              {activeView === 'accounts' && <AccountsView onNavigate={handleNavigate} />}
              {activeView === 'payments' && <PaymentsView onNavigate={handleNavigate} />}
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AppShell() {
  return (
    <RoleProvider>
      <ToastProvider>
        <AppShellContent />
      </ToastProvider>
    </RoleProvider>
  );
}
