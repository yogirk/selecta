'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';

export function MetaSection() {
  const { activeResult } = useStore();

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-3">
        Execution Metadata
      </h4>
      
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Query Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rows Returned</span>
            <span className="font-medium">{activeResult?.rowCount ?? 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Columns</span>
            <span className="font-medium">{activeResult?.columns?.length ?? 'N/A'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
