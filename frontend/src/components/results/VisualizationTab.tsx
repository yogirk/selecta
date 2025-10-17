'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Maximize } from 'lucide-react';
import { useStore } from '@/lib/store';
import { VegaEmbed } from 'react-vega';

export function VisualizationTab() {
  const { activeResult } = useStore();

  if (!activeResult?.chart) {
    return (
      <Card className="card-subtle">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No visualization available. Send a query to see results.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h4 className="text-base font-semibold text-card-foreground mb-3">
        Data Visualization
      </h4>
      
      <Card className="card-elevated">
        <CardContent className="p-4">
          <VegaEmbed 
            spec={activeResult.chart} 
            options={{
              actions: false,
              theme: "dark"
            }}
          />
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm">
          <Download className="w-3.5 h-3.5 mr-2" />
          Export
        </Button>
        <Button variant="outline" size="sm">
          <Maximize className="w-3.5 h-3.5 mr-2" />
          Fullscreen
        </Button>
      </div>
    </div>
  );
}
