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

export default function AppShell() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (view: ViewId) => {
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
            {activeView === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
            {activeView === 'clients' && <ClientsView onNavigate={handleNavigate} />}
            {activeView === 'data-entry' && <TradesView onNavigate={handleNavigate} />}
            {activeView === 'transactions' && <TransactionsView onNavigate={handleNavigate} />}
            {activeView === 'receipts' && <ReceiptsView onNavigate={handleNavigate} />}
            {activeView === 'invoices' && <InvoicesView onNavigate={handleNavigate} />}
            {activeView === 'ledger' && <LedgerView onNavigate={handleNavigate} />}
            {activeView === 'bank' && <BankView onNavigate={handleNavigate} />}
            {activeView === 'products' && <ProductsView onNavigate={handleNavigate} />}
            {activeView === 'tenure' && <TenuresView onNavigate={handleNavigate} />}
          </div>
        </div>
      </main>
    </div>
  );
}
