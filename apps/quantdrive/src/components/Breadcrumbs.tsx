'use client';

interface BreadcrumbsProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumbs({ currentPath, onNavigate }: BreadcrumbsProps) {
  const segments = currentPath.split('/').filter(Boolean);

  const breadcrumbs = [
    { label: 'My Files', path: '' },
    ...segments.map((segment, index) => ({
      label: segment,
      path: segments.slice(0, index + 1).join('/'),
    })),
  ];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <ol className="flex items-center gap-1 flex-wrap">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1">
              {index > 0 && (
                <span className="text-[var(--quant-muted-foreground)]" aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <span className="font-medium text-[var(--quant-foreground)]" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <button
                  onClick={() => onNavigate(crumb.path)}
                  className="text-[var(--quant-muted-foreground)] hover:text-[var(--quant-foreground)] transition-colors"
                >
                  {crumb.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
