import React, { useState, useMemo } from 'react';
import Prism from 'prismjs';
import { Copy, Check, FileCode } from 'lucide-react';
import { detectLanguage } from './PrismCodeEditor';

interface PrismCodeViewerProps {
  code: string;
  filePath?: string;
  language?: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
}

export const PrismCodeViewer: React.FC<PrismCodeViewerProps> = ({
  code,
  filePath = 'code.py',
  language,
  maxHeight = '400px',
  showLineNumbers = true,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const lang = language || detectLanguage(filePath);

  const highlightedHtml = useMemo(() => {
    const grammar = Prism.languages[lang] || Prism.languages.python;
    return Prism.highlight(code || '', grammar, lang);
  }, [code, lang]);

  const lines = (code || '').split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col border border-slate-800 rounded-xl overflow-hidden bg-[#1a1e24] shadow-lg text-left" dir="ltr">
      {/* Viewer Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <FileCode className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-slate-300 font-bold truncate max-w-xs">{filePath}</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-emerald-400 font-mono uppercase font-semibold border border-slate-700">
            {lang}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
          <span>{lines.length} lines</span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Area with optional Line Numbers */}
      <div className="flex overflow-auto" style={{ maxHeight }}>
        {showLineNumbers && (
          <div className="py-3 px-2 bg-slate-950/60 border-r border-slate-800 text-right select-none font-mono text-slate-600 text-xs leading-relaxed min-w-9">
            {lines.map((_, idx) => (
              <div key={idx + 1}>{idx + 1}</div>
            ))}
          </div>
        )}

        <pre className="p-3 m-0 flex-1 overflow-auto bg-transparent font-mono text-xs leading-relaxed whitespace-pre">
          <code
            className={`language-${lang}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
};
