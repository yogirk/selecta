'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';

export function InsightsTab() {
  const { activeResult } = useStore();

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-3">
        AI Insights
      </h4>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {activeResult 
              ? 'Insights will be generated based on the query results.'
              : 'No insights available yet. Send a query to get started.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
