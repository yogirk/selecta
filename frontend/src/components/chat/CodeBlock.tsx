'use client';

import { useState } from 'react';
import { Highlight, themes, type PrismTheme } from 'prism-react-renderer';
import { Check, Copy, Terminal } from 'lucide-react';
import { useTheme } from '@/components/layout/ThemeProvider';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
    language: string;
    code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
    const { theme } = useTheme();
    const [isCopied, setIsCopied] = useState(false);

    const codeTheme = (theme === 'dark' ? themes.nightOwl : themes.github) as PrismTheme;

    const copyToClipboard = async () => {
        if (!code) return;
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="group relative my-4 overflow-hidden rounded-xl border border-border-subtle bg-[color:var(--surface)] shadow-sm">
            <div className="flex items-center justify-between border-b border-border-subtle bg-muted/30 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Terminal className="h-3.5 w-3.5" />
                    <span className="uppercase">{language}</span>
                </div>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label="Copy code"
                >
                    {isCopied ? (
                        <>
                            <Check className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-green-500">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            <Highlight code={code} language={language} theme={codeTheme}>
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                    <div className="relative overflow-x-auto">
                        <pre
                            className={cn(className, "min-w-full p-4 text-sm leading-relaxed")}
                            style={{ ...style, background: 'transparent', margin: 0 }}
                        >
                            {tokens.map((line, i) => (
                                <div key={i} {...getLineProps({ line, key: i })} className="table-row">
                                    <span className="table-cell select-none pr-4 text-right text-xs text-muted-foreground/40">
                                        {i + 1}
                                    </span>
                                    <span className="table-cell">
                                        {line.map((token, key) => (
                                            <span key={key} {...getTokenProps({ token, key })} />
                                        ))}
                                    </span>
                                </div>
                            ))}
                        </pre>
                    </div>
                )}
            </Highlight>
        </div>
    );
}
