'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy } from 'lucide-react';
import { QueryError } from '@/types';

interface ErrorPanelProps {
  error: QueryError;
}

const formatDateTime = (value?: number | null): string => {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '—';
  }
};

export function ErrorPanel({ error }: ErrorPanelProps) {
  const handleCopySql = () => {
    if (error.sql) {
      void navigator.clipboard.writeText(error.sql);
    }
  };

  return (
    <Card className="card-elevated border border-destructive/40 bg-destructive/5">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <CardTitle className="heading-sm text-destructive">
            Query Failed
          </CardTitle>
        </div>
        {error.type && (
          <Badge variant="outline" className="rounded-full border-destructive/40 text-destructive">
            {error.type}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="text-foreground font-medium">
            {error.message || 'BigQuery reported an error while executing the query.'}
          </p>
          <dl className="mt-3 space-y-1">
            <div className="flex gap-2">
              <dt className="w-28 text-muted-foreground/80">Occurred:</dt>
              <dd className="text-foreground">{formatDateTime(error.timestamp)}</dd>
            </div>
            {error.jobId && (
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground/80">Job ID:</dt>
                <dd className="font-mono text-xs text-foreground/80 break-all">{error.jobId}</dd>
              </div>
            )}
            {error.errorCode && (
              <div className="flex gap-2">
                <dt className="w-28 text-muted-foreground/80">Error Code:</dt>
                <dd className="text-foreground">{String(error.errorCode)}</dd>
              </div>
            )}
          </dl>
        </div>

        {error.details && error.details.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
              Details
            </p>
            <ul className="mt-2 space-y-2 text-xs text-foreground">
              {error.details.map((detail, index) => (
                <li key={index} className="rounded-md bg-background/60 p-2">
                  {detail.reason && (
                    <p className="font-medium text-destructive">{detail.reason}</p>
                  )}
                  {detail.message && (
                    <p className="text-foreground/90">{detail.message}</p>
                  )}
                  {detail.location && (
                    <p className="text-muted-foreground">Location: {detail.location}</p>
                  )}
                  {detail.debugInfo && (
                    <p className="text-muted-foreground/80">Info: {detail.debugInfo}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error.sql && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Query Attempted
              </p>
              <Button variant="ghost" size="sm" onClick={handleCopySql} className="gap-1 text-xs">
                <Copy className="h-3 w-3" />
                Copy SQL
              </Button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg border border-border-subtle bg-background/80 p-3 text-xs text-muted-foreground">
              <code>{error.sql}</code>
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
