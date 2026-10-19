import React, { useState, useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';

import { Copy, Check, FileCode, Type } from 'lucide-react';

interface PrismCodeEditorProps {
  value: string;
  onChange?: (val: string) => void;
  filePath?: string;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
  languageOverride?: string;
}

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return 'python';
    case 'md':
      return 'markdown';
    case 'json':
      return 'json';
    case 'sh':
    case 'bash':
      return 'bash';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'toml':
      return 'toml';
    case 'css':
      return 'css';
    case 'sql':
      return 'sql';
    default:
      return 'python';
  }
}

export const PrismCodeEditor: React.FC<PrismCodeEditorProps> = ({
  value,
  onChange,
  filePath = 'script.py',
  readOnly = false,
  minHeight = '420px',
  placeholder = 'Write code here...',
  languageOverride,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(13);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lang = languageOverride || detectLanguage(filePath);

  // Synchronize scrolling between textarea, highlighted code, and line numbers gutter
  const handleScroll = () => {
    if (textareaRef.current && preRef.current && lineNumbersRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Generate highlighted HTML via Prism
  const highlightedCode = React.useMemo(() => {
    const grammar = Prism.languages[lang] || Prism.languages.python;
    return Prism.highlight(value || '', grammar, lang);
  }, [value, lang]);

  const lineCount = React.useMemo(() => {
    return (value || '').split('\n').length;
  }, [value]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Support Tab key indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      if (onChange) onChange(newValue);

      // Restore cursor position after state update
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div className="flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-[#1e1e1e] shadow-xl text-left rtl:text-left" dir="ltr">
      {/* Editor Header Status Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-mono text-slate-300 font-bold truncate max-w-xs">
            {filePath}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-emerald-400 font-mono uppercase font-semibold border border-slate-700 shrink-0">
            {lang}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Font Size Selector */}
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Type className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
            >
              <option value={12}>12px</option>
              <option value={13}>13px</option>
              <option value={14}>14px</option>
              <option value={16}>16px</option>
            </select>
          </div>

          <span className="text-slate-600">|</span>

          {/* Line & Char Count */}
          <span className="text-[11px] font-mono text-slate-400">
            {lineCount} lines • {new Blob([value]).size} B
          </span>

          <span className="text-slate-600">|</span>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Dual Layer Area: Line numbers + Overlayed Textarea & Highlight */}
      <div className="relative flex flex-1 overflow-hidden" style={{ minHeight }}>
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          className="select-none py-3 px-2 bg-slate-950/70 border-r border-slate-800/80 text-right font-mono text-slate-500 pointer-events-none overflow-hidden"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: `${fontSize * 1.5}px`,
            minWidth: '42px',
          }}
        >
          {Array.from({ length: Math.max(1, lineCount) }, (_, i) => (
            <div key={i + 1}>{i + 1}</div>
          ))}
        </div>

        {/* Editor Container */}
        <div className="relative flex-1 overflow-hidden font-mono" style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.5}px` }}>
          {/* Syntax Highlighted Layer (Underneath Textarea) */}
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 m-0 p-3 overflow-hidden whitespace-pre pointer-events-none bg-transparent"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${fontSize * 1.5}px`,
              tabSize: 4,
            }}
          >
            <code
              className={`language-${lang}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
            />
          </pre>

          {/* Transparent Input Textarea (On Top for typing, cursor, and selection) */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            placeholder={placeholder}
            spellCheck={false}
            className="absolute inset-0 w-full h-full m-0 p-3 bg-transparent text-transparent caret-emerald-400 resize-none outline-none overflow-auto whitespace-pre font-mono selection:bg-emerald-500/30 selection:text-transparent"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${fontSize * 1.5}px`,
              tabSize: 4,
            }}
          />
        </div>
      </div>
    </div>
  );
};
