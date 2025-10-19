'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';

export function InsightsTab() {
  const { activeResult } = useStore();

  return (
    <div>
      <h4 className="heading-md mb-3 text-card-foreground">AI Insights</h4>
      
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="heading-sm text-card-foreground">Analysis Summary</CardTitle>
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
