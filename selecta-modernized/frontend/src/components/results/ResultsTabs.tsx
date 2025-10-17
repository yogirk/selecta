"use client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VisualizationTab } from "./VisualizationTab"
import { TableTab } from "./TableTab"
import { SQLTab } from "./SQLTab"
import { MetaTab } from "./MetaTab"
import { InsightsTab } from "./InsightsTab"
import { BarChart, Table, Lightbulb, Code, Info, Maximize2 } from "lucide-react"

export function ResultsTabs() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border-subtle bg-surface/50 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Analysis</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Visuals, tables, SQL, and meta data from the latest run
            </p>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="chart" className="flex h-full flex-col">
          <TabsList className="mx-6 mt-4 bg-surface border border-border">
            <TabsTrigger value="chart" className="gap-2">
              <BarChart className="h-4 w-4" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <Table className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="sql" className="gap-2">
              <Code className="h-4 w-4" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="meta" className="gap-2">
              <Info className="h-4 w-4" />
              Meta
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="chart" className="h-full overflow-auto">
              <VisualizationTab />
            </TabsContent>
            <TabsContent value="table" className="h-full overflow-auto">
              <TableTab />
            </TabsContent>
            <TabsContent value="insights" className="h-full overflow-auto">
              <InsightsTab />
            </TabsContent>
            <TabsContent value="sql" className="h-full overflow-auto">
              <SQLTab />
            </TabsContent>
            <TabsContent value="meta" className="h-full overflow-auto">
              <MetaTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
