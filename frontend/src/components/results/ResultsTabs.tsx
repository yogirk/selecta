"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisualizationTab } from './VisualizationTab';
import { TableTab } from './TableTab';
import { SQLTab } from './SQLTab';
import { MetaTab } from './MetaTab';
import { BarChart, Table, Code, Info } from 'lucide-react';

export function ResultsTabs() {
  return (
    <div className="hidden h-full w-[420px] flex-col border-l border-border-subtle bg-[color:var(--card)] xl:flex" style={{ minWidth: '420px' }}>

      <Tabs defaultValue="visualization" className="flex flex-1 flex-col">
        <div className="border-b border-border-subtle px-6 pt-4 pb-3">
          <TabsList className="w-full">
            <TabsTrigger value="visualization">
              <BarChart className="h-4 w-4" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="table">
              <Table className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="sql">
              <Code className="h-4 w-4" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="meta">
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
