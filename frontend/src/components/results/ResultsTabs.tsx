"use client";

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisualizationTab } from './VisualizationTab';
import { TableTab } from './TableTab';
import { SQLTab } from './SQLTab';
import { MetaTab } from './MetaTab';
import { InsightsTab } from './InsightsTab';
import { BarChart, Table, Lightbulb, Code, Info, Maximize2 } from 'lucide-react';

export function ResultsTabs() {
  return (
    <div className="hidden h-full w-[420px] flex-col border-l border-border-subtle bg-[hsl(var(--surface))] xl:flex" style={{ minWidth: '420px' }}>
      <div className="border-b border-border-subtle bg-[hsl(var(--surface))/0.6] px-6 py-4 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Analysis</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Visuals, tables, SQL, and metadata from the latest run
            </p>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="visualization" className="flex h-full flex-col">
        <div className="mt-4 px-6">
          <TabsList className="flex w-full gap-1 overflow-x-auto rounded-lg border border-border-subtle bg-card p-1">
            <TabsTrigger value="visualization" className="flex-shrink-0 gap-2 px-4 py-2 text-sm">
              <BarChart className="h-4 w-4" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="table" className="flex-shrink-0 gap-2 px-4 py-2 text-sm">
              <Table className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex-shrink-0 gap-2 px-4 py-2 text-sm">
              <Lightbulb className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="sql" className="flex-shrink-0 gap-2 px-4 py-2 text-sm">
              <Code className="h-4 w-4" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="meta" className="flex-shrink-0 gap-2 px-4 py-2 text-sm">
              <Info className="h-4 w-4" />
              Meta
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <TabsContent value="visualization" className="mt-0">
            <VisualizationTab />
          </TabsContent>
          <TabsContent value="table" className="mt-0">
            <TableTab />
          </TabsContent>
          <TabsContent value="insights" className="mt-0">
            <InsightsTab />
          </TabsContent>
          <TabsContent value="sql" className="mt-0">
            <SQLTab />
          </TabsContent>
          <TabsContent value="meta" className="mt-0">
            <MetaTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
