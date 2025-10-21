'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ErrorPanel } from './ErrorPanel';
import { Highlight, themes } from 'prism-react-renderer';
import { useTheme } from '@/components/layout/ThemeProvider';
import { useMemo } from 'react';

export function SQLTab() {
  const activeResult = useStore((state) => state.activeResult);
  const activeError = useStore((state) => state.activeError);
  const { theme } = useTheme();

  const syntaxTheme = useMemo(
    () => (theme === 'dark' ? themes.nightOwl : themes.github),
    [theme]
  );

  if (activeError) {
    return <ErrorPanel error={activeError} />;
  }

  const copyToClipboard = () => {
    if (activeResult?.sql) {
      void navigator.clipboard.writeText(activeResult.sql);
    }
  };

  const sql = activeResult?.sql?.trim();

  if (!sql) {
    return (
      <Card className="card-subtle">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No SQL query available. Send a query to see the generated SQL.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h4 className="heading-md mb-3 text-card-foreground">SQL Query</h4>
      
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="heading-xs text-primary">
            Generated Query
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={copyToClipboard}>
            <Copy className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <Highlight code={sql} language="sql" theme={syntaxTheme}>
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={`${className} w-full rounded-xl border border-border-subtle bg-surface/80 p-4 text-xs leading-relaxed font-mono overflow-auto whitespace-pre`}
                style={{ ...style, margin: 0, maxHeight: '20rem' }}
              >
                {tokens.map((line, lineIndex) => {
                  const lineProps = getLineProps({ line, key: lineIndex });
                  return (
                    <div key={lineIndex} {...lineProps}>
                      {line.map((token, tokenIndex) => {
                        const tokenProps = getTokenProps({ token, key: tokenIndex });
                        return <span key={tokenIndex} {...tokenProps} />;
                      })}
                    </div>
                  );
                })}
              </pre>
            )}
          </Highlight>
        </CardContent>
      </Card>
    </div>
  );
}
