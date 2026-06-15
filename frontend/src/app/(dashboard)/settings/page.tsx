'use client';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import TaxRatesTab from '@/components/settings/TaxRatesTab';
import DiscountsTab from '@/components/settings/DiscountsTab';
import AttributesTab from '@/components/settings/AttributesTab';
import RestockAlertsTab from '@/components/settings/RestockAlertsTab';

type Tab = 'tax-rates' | 'discounts' | 'attributes' | 'restock-alerts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tax-rates', label: 'Tax Rates' },
  { id: 'discounts', label: 'Discounts' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'restock-alerts', label: 'Restock Alerts' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tax-rates');

  return (
    <PageLayout
      title="Settings"
      description="Manage tax rates, discounts, product attributes, and restock alerts"
    >
      <div className="flex flex-col section-gap">
        {/* Tab bar */}
        <div className="flex gap-1 bg-[var(--bg-card)] p-1 rounded-xl w-fit border border-[var(--border-glass)]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--text-primary)]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'tax-rates' && <TaxRatesTab />}
          {activeTab === 'discounts' && <DiscountsTab />}
          {activeTab === 'attributes' && <AttributesTab />}
          {activeTab === 'restock-alerts' && <RestockAlertsTab />}
        </div>
      </div>
    </PageLayout>
  );
}
