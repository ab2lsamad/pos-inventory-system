import PageLayout from '@/components/layout/PageLayout';

export default function UnsupportedRolePage() {
  return (
    <PageLayout
      title="No Matching Routes"
      description="This account can sign in, but the current frontend does not have any working screens backed by the API for this role."
    >
      <div className="glass-panel p-8">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          The backend accepts your credentials, but its available endpoints do not map to a usable dashboard route in this frontend.
          Use an `ADMIN` or `CASHIER` account for the implemented screens, or extend the backend/frontend contract for this role.
        </p>
      </div>
    </PageLayout>
  );
}
