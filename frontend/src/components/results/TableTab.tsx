'use client';

import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStore } from '@/lib/store';
import { ErrorPanel } from './ErrorPanel';

export function TableTab() {
  const activeResult = useStore((state) => state.activeResult);
  const activeError = useStore((state) => state.activeError);

  if (activeError) {
    return <ErrorPanel error={activeError} />;
  }

  if (!activeResult?.rows || !activeResult?.columns) {
    return (
      <Card className="card-subtle">
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No table data available. Send a query to see results.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <h4 className="heading-md mb-3 text-card-foreground">Query Results</h4>
      
      <Card className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {activeResult.columns.map((column, i) => (
                <TableHead key={i} className="text-xs">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeResult.rows.slice(0, 10).map((row, i) => (
              <TableRow key={i}>
                {activeResult.columns!.map((column, j) => (
                  <TableCell key={j} className="text-xs">
                    {String(row[column] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      
      {activeResult.rowCount && activeResult.rowCount > 10 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing 10 of {activeResult.rowCount} rows
        </p>
      )}
    </div>
  );
}
