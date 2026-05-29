'use client';

import { AppShell, SearchInput, Card, Badge } from '@quant/shared-ui';
import { ErrorState, EmptyState, Skeleton } from '@quant/shared-ui';
import { useInbox } from '../hooks/useInbox';
import { AppSidebar } from '../components/AppSidebar';

export default function InboxPage() {
  const { data, isLoading, error, refetch } = useInbox();

  return (
    <AppShell sidebar={<AppSidebar />}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-[var(--quant-border)]">
          <SearchInput placeholder="Search emails..." onChange={() => {}} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rect" width="100%" height="80px" />
              ))}
            </div>
          )}
          {error && <ErrorState message={error.message} onRetry={() => void refetch()} />}
          {!isLoading && !error && (!data || data.length === 0) && (
            <EmptyState title="Inbox is empty" description="No emails to show" />
          )}
          {!isLoading &&
            !error &&
            data &&
            data.map((email) => (
              <Card
                key={email.id}
                padding="none"
                className={`mx-4 my-2 p-4 cursor-pointer hover:bg-[var(--quant-muted)] transition-colors ${
                  !email.isRead ? 'border-l-4 border-l-quant-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm ${!email.isRead ? 'font-semibold' : 'font-normal'}`}
                      >
                        {email.from?.name || email.from?.email}
                      </span>
                      {!email.isRead && <Badge variant="info">New</Badge>}
                    </div>
                    <h3 className={`text-sm mt-1 ${!email.isRead ? 'font-semibold' : ''}`}>
                      {email.subject}
                    </h3>
                    <p className="text-xs text-[var(--quant-muted-foreground)] mt-1 truncate">
                      {email.snippet}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--quant-muted-foreground)] whitespace-nowrap ml-4">
                    {email.receivedAt ? new Date(email.receivedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </Card>
            ))}
        </div>
      </div>
    </AppShell>
  );
}
