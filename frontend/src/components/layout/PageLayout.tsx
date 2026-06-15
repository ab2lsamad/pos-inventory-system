import { ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

export default function PageLayout({
  title,
  description,
  action,
  back,
  badge,
  children,
}: PageLayoutProps) {
  return (
    <div className="page-container flex min-h-full flex-col">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          {back ? <div className="flex-shrink-0 pt-1">{back}</div> : null}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
                {title}
              </h1>
              {badge}
            </div>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </header>

      <main className="flex-grow">{children}</main>
    </div>
  );
}
