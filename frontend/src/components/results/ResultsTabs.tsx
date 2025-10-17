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
    <aside
      className="analysis-panel hidden h-full w-[420px] shrink-0 flex-col border-l border-border shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] xl:flex"
      style={{ minWidth: '420px' }}
    >
      <Tabs defaultValue="visualization" className="flex h-full flex-col">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Analysis
              </h3>
              <p className="text-xs text-muted-foreground/80">
                Visuals, tables, SQL, and meta data from the latest run
              </p>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Expand analysis panel">
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
          <TabsList className="mt-3 grid w-full grid-cols-5 gap-1 border-0 bg-transparent p-0">
            <TabsTrigger
              value="visualization"
              className="gap-2 rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition data-[state=active]:border-[#a855f7] data-[state=active]:text-[#a855f7]"
            >
              <BarChart className="mr-1.5 h-4 w-4" />
              Chart
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="gap-2 rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground data-[state=active]:border-[#a855f7] data-[state=active]:text-[#a855f7]"
            >
              <Table className="mr-1.5 h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="gap-2 rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground data-[state=active]:border-[#a855f7] data-[state=active]:text-[#a855f7]"
            >
              <Lightbulb className="mr-1.5 h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger
              value="sql"
              className="gap-2 rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground data-[state=active]:border-[#a855f7] data-[state=active]:text-[#a855f7]"
            >
              <Code className="mr-1.5 h-4 w-4" />
              SQL
            </TabsTrigger>
            <TabsTrigger
              value="meta"
              className="gap-2 rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground data-[state=active]:border-[#a855f7] data-[state=active]:text-[#a855f7]"
            >
              <Info className="mr-1.5 h-4 w-4" />
              Meta
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
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
    </aside>
  );
}
