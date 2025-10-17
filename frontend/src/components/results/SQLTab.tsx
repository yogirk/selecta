'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useStore } from '@/lib/store';

export function SQLTab() {
  const { activeResult } = useStore();

  const copyToClipboard = () => {
    if (activeResult?.sql) {
      navigator.clipboard.writeText(activeResult.sql);
    }
  };

  if (!activeResult?.sql) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No SQL query available. Send a query to see the generated SQL.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-3">
        SQL Query
      </h4>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-wider text-primary">
            Generated Query
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={copyToClipboard}>
            <Copy className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-muted-foreground overflow-x-auto p-3 bg-secondary/20 rounded border-l-2 border-primary">
            <code>{activeResult.sql}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
