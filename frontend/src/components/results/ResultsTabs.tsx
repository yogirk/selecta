'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisualizationTab } from './VisualizationTab';
import { TableTab } from './TableTab';
import { SQLTab } from './SQLTab';
import { MetaTab } from './MetaTab';
import { InsightsTab } from './InsightsTab';
import { BarChart, Table, Lightbulb, Code, Info } from 'lucide-react';

export function ResultsTabs() {
  return (
    <aside className="surface-panel hidden h-full w-[420px] shrink-0 flex-col overflow-hidden rounded-2xl xl:flex">
      <Tabs defaultValue="visualization" className="flex h-full flex-col">
        <div className="px-4 pb-4 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Analysis
              </h3>
              <p className="text-xs text-muted-foreground/80">
                Visuals, tables, SQL, and meta data from the latest run
              </p>
            </div>
          </div>
          <TabsList className="grid w-full grid-cols-5 rounded-xl bg-muted/25 p-1 backdrop-blur">
            <TabsTrigger value="visualization" className="text-[11px] font-medium data-[state=active]:bg-background">
              <BarChart className="mr-2 h-4 w-4" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="table" className="text-[11px] font-medium data-[state=active]:bg-background">
              <Table className="mr-2 h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-[11px] font-medium data-[state=active]:bg-background">
              <Lightbulb className="mr-2 h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="sql" className="text-[11px] font-medium data-[state=active]:bg-background">
              <Code className="mr-2 h-4 w-4" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="meta" className="text-[11px] font-medium data-[state=active]:bg-background">
              <Info className="mr-2 h-4 w-4" />
              Meta
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <TabsContent value="visualization">
            <VisualizationTab />
          </TabsContent>

          <TabsContent value="table">
            <TableTab />
          </TabsContent>

          <TabsContent value="insights">
            <InsightsTab />
          </TabsContent>

          <TabsContent value="sql">
            <SQLTab />
          </TabsContent>

          <TabsContent value="meta">
            <MetaTab />
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
