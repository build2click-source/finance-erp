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

  const { canManageLedger } = useRole();

  const handleNavigate = (view: ViewId) => {
    // Basic protection to prevent navigation to unauthorized views
    if (!canManageLedger && (view === 'transactions' || view === 'ledger' || view === 'bank')) {
       alert('Unauthorized access. Admin role required.');
       return;
    }
    setActiveView(view);
  };

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
              {activeView === 'trade-summary' && <TradeSummaryView />}
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
