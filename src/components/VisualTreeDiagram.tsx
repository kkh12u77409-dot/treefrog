import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Folder, 
  FileCode, 
  FileText, 
  CheckSquare, 
  Square, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronRight, 
  ChevronDown, 
  Maximize2, 
  Minimize2,
  Trash2,
  Search,
  ArrowRightLeft,
  Maximize,
  FolderPlus,
  FilePlus,
  Download,
  Info,
  X,
  Copy,
  Check,
  Palette,
  Eye,
  Sliders,
  Sparkles
} from 'lucide-react';
import { WebTreeNode, Language } from '../types';

interface VisualTreeDiagramProps {
  root: WebTreeNode;
  language: Language;
  onToggleNode: (nodePath: string, nodeName: string) => void;
  onRemoveNode: (nodeName: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onAddChildNode?: (parentPath: string, name: string, isFolder: boolean) => void;
}

interface PositionedNode {
  id: string;
  node: WebTreeNode;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  isCollapsed: boolean;
  children: PositionedNode[];
  parentPath?: string;
}

interface TreeLink {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  enabled: boolean;
  isFolder: boolean;
}

type DiagramTheme = 'cyber' | 'nebula' | 'ocean' | 'amber';
type NodeTypeFilter = 'all' | 'python' | 'configs' | 'docs' | 'folders';

export const VisualTreeDiagram: React.FC<VisualTreeDiagramProps> = ({
  root,
  language,
  onToggleNode,
  onRemoveNode,
  searchQuery: externalSearchQuery,
  onSearchChange,
  onAddChildNode,
}) => {
  const isAr = language === 'ar';

  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>('');
  const [themePreset, setThemePreset] = useState<DiagramTheme>('cyber');
  const [typeFilter, setTypeFilter] = useState<NodeTypeFilter>('all');
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);

  // Inspector & Quick Add Drawer State
  const [selectedNode, setSelectedNode] = useState<PositionedNode | null>(null);
  const [quickAddParent, setQuickAddParent] = useState<{ path: string; name: string } | null>(null);
  const [newChildName, setNewChildName] = useState<string>('');
  const [newChildIsFolder, setNewChildIsFolder] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    setInternalSearchQuery(val);
    if (onSearchChange) onSearchChange(val);
  };

  const [zoom, setZoom] = useState<number>(0.9);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Toggle collapse state of a folder
  const toggleCollapse = (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Expand all folders
  const expandAll = () => {
    setCollapsedPaths(new Set());
  };

  // Collapse all folders except root
  const collapseAll = () => {
    const allFolderPaths = new Set<string>();
    function collect(n: WebTreeNode) {
      if (n.isDir && n.path !== root.path) {
        allFolderPaths.add(n.path);
      }
      n.children.forEach(collect);
    }
    collect(root);
    setCollapsedPaths(allFolderPaths);
  };

  // Node Dimensions
  const NODE_WIDTH = orientation === 'horizontal' ? 185 : 165;
  const NODE_HEIGHT = 48;
  const H_GAP = orientation === 'horizontal' ? 75 : 38;
  const V_GAP = orientation === 'horizontal' ? 24 : 68;

  // Build hierarchical layout with computed coordinates
  const { nodes, links, bounds } = useMemo(() => {
    let currentY = 0;
    const allPositioned: PositionedNode[] = [];
    const allLinks: TreeLink[] = [];

    // Helper to calculate subtree heights and layout
    function layoutSubtree(
      node: WebTreeNode,
      depth: number,
      parent?: PositionedNode
    ): PositionedNode {
      const isCollapsed = collapsedPaths.has(node.path);

      const pNode: PositionedNode = {
        id: node.id,
        node,
        x: 0,
        y: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        depth,
        isCollapsed,
        children: [],
        parentPath: parent?.node.path,
      };

      if (!isCollapsed && node.children.length > 0) {
        pNode.children = node.children.map((child) =>
          layoutSubtree(child, depth + 1, pNode)
        );
      }

      if (orientation === 'horizontal') {
        pNode.x = depth * (NODE_WIDTH + H_GAP);

        if (pNode.children.length === 0) {
          pNode.y = currentY;
          currentY += NODE_HEIGHT + V_GAP;
        } else {
          // Center parent vertically relative to children
          const firstChild = pNode.children[0];
          const lastChild = pNode.children[pNode.children.length - 1];
          pNode.y = (firstChild.y + lastChild.y) / 2;
        }
      } else {
        // Vertical layout
        pNode.y = depth * (NODE_HEIGHT + V_GAP);

        if (pNode.children.length === 0) {
          pNode.x = currentY; // use currentY as horizontal tracker
          currentY += NODE_WIDTH + H_GAP;
        } else {
          const firstChild = pNode.children[0];
          const lastChild = pNode.children[pNode.children.length - 1];
          pNode.x = (firstChild.x + lastChild.x) / 2;
        }
      }

      allPositioned.push(pNode);
      return pNode;
    }

    const rootPositioned = layoutSubtree(root, 0);

    // Compute Links connecting parent and children
    function computeLinks(parent: PositionedNode) {
      for (const child of parent.children) {
        let fromX = 0;
        let fromY = 0;
        let toX = 0;
        let toY = 0;

        if (orientation === 'horizontal') {
          fromX = parent.x + parent.width;
          fromY = parent.y + parent.height / 2;
          toX = child.x;
          toY = child.y + child.height / 2;
        } else {
          fromX = parent.x + parent.width / 2;
          fromY = parent.y + parent.height;
          toX = child.x + child.width / 2;
          toY = child.y;
        }

        allLinks.push({
          id: `${parent.node.path}->${child.node.path}`,
          fromX,
          fromY,
          toX,
          toY,
          enabled: child.node.enabled && parent.node.enabled,
          isFolder: child.node.isDir,
        });

        computeLinks(child);
      }
    }

    computeLinks(rootPositioned);

    // Calculate bounding box
    let maxX = 0;
    let maxY = 0;
    for (const p of allPositioned) {
      maxX = Math.max(maxX, p.x + p.width + 120);
      maxY = Math.max(maxY, p.y + p.height + 120);
    }

    return {
      nodes: allPositioned,
      links: allLinks,
      bounds: { width: Math.max(850, maxX), height: Math.max(550, maxY) },
    };
  }, [root, collapsedPaths, orientation, NODE_WIDTH, H_GAP, NODE_HEIGHT, V_GAP]);

  // Fit & Center View
  const handleAutoFit = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const scaleX = (clientWidth - 60) / bounds.width;
    const scaleY = (clientHeight - 60) / bounds.height;
    const newZoom = Math.max(0.4, Math.min(1.2, Math.min(scaleX, scaleY)));

    const centerX = (clientWidth - bounds.width * newZoom) / 2;
    const centerY = (clientHeight - bounds.height * newZoom) / 2;

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.max(20, centerX), y: Math.max(20, centerY) });
  }, [bounds]);

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.07 : 0.07;
    setZoom((prev) => Math.min(2.0, Math.max(0.35, Number((prev + zoomDelta).toFixed(2)))));
  };

  const resetView = () => {
    setZoom(0.85);
    setPan({ x: 40, y: 40 });
  };

  // SVG curved path calculation
  const getCurvePath = (link: TreeLink) => {
    const { fromX, fromY, toX, toY } = link;
    if (orientation === 'horizontal') {
      const midX = fromX + (toX - fromX) * 0.5;
      return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
    } else {
      const midY = fromY + (toY - fromY) * 0.5;
      return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;
    }
  };

  // Color theme palettes
  const themeColors = {
    cyber: {
      folderGrad: 'from-amber-500/20 to-emerald-500/10 border-amber-500/40 text-amber-300',
      pyGrad: 'from-emerald-950/40 to-slate-900 border-emerald-500/40 text-emerald-300',
      defaultGrad: 'from-slate-900 to-slate-950 border-slate-700 text-slate-300',
      rootBorder: 'border-emerald-400 shadow-emerald-500/25',
      linkActive: 'url(#linkGradCyber)',
      linkFolder: 'url(#linkGradCyberFolder)',
      canvasBg: '#020617',
    },
    nebula: {
      folderGrad: 'from-fuchsia-500/20 to-purple-500/10 border-fuchsia-500/40 text-fuchsia-300',
      pyGrad: 'from-purple-950/40 to-slate-900 border-purple-500/40 text-purple-300',
      defaultGrad: 'from-slate-900 to-slate-950 border-slate-700 text-slate-300',
      rootBorder: 'border-purple-400 shadow-purple-500/25',
      linkActive: 'url(#linkGradNebula)',
      linkFolder: 'url(#linkGradNebulaFolder)',
      canvasBg: '#090514',
    },
    ocean: {
      folderGrad: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300',
      pyGrad: 'from-sky-950/40 to-slate-900 border-sky-500/40 text-sky-300',
      defaultGrad: 'from-slate-900 to-slate-950 border-slate-700 text-slate-300',
      rootBorder: 'border-cyan-400 shadow-cyan-500/25',
      linkActive: 'url(#linkGradOcean)',
      linkFolder: 'url(#linkGradOceanFolder)',
      canvasBg: '#030b17',
    },
    amber: {
      folderGrad: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300',
      pyGrad: 'from-yellow-950/40 to-slate-900 border-yellow-500/40 text-yellow-300',
      defaultGrad: 'from-slate-900 to-slate-950 border-slate-700 text-slate-300',
      rootBorder: 'border-amber-400 shadow-amber-500/25',
      linkActive: 'url(#linkGradAmber)',
      linkFolder: 'url(#linkGradAmberFolder)',
      canvasBg: '#0d0903',
    },
  }[themePreset];

  const getNodeColor = (node: WebTreeNode) => {
    if (node.isDir) return themeColors.folderGrad;
    if (node.name.endsWith('.py')) return themeColors.pyGrad;
    if (node.name.endsWith('.md')) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    if (node.name.endsWith('.json') || node.name.endsWith('.toml') || node.name.endsWith('.yaml')) {
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    }
    return themeColors.defaultGrad;
  };

  // Node Type Filter matcher
  const matchesTypeFilter = (node: WebTreeNode) => {
    if (typeFilter === 'all') return true;
    if (typeFilter === 'folders') return node.isDir;
    if (typeFilter === 'python') return !node.isDir && node.name.endsWith('.py');
    if (typeFilter === 'configs') {
      return !node.isDir && (node.name.endsWith('.json') || node.name.endsWith('.toml') || node.name.endsWith('.yaml') || node.name.endsWith('.ini'));
    }
    if (typeFilter === 'docs') {
      return !node.isDir && (node.name.endsWith('.md') || node.name.endsWith('.txt') || node.name.startsWith('README'));
    }
    return true;
  };

  // Export Diagram as SVG
  const handleExportSvg = () => {
    if (!containerRef.current) return;
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}">
  <style>
    .node-text { font-family: monospace; font-size: 12px; fill: #f8fafc; font-weight: bold; }
    .node-path { font-family: monospace; font-size: 9px; fill: #94a3b8; }
    .link { fill: none; stroke-width: 2px; }
  </style>
  <rect width="100%" height="100%" fill="#090d16" />
  ${links
    .map(
      (l) =>
        `<path d="${getCurvePath(l)}" class="link" stroke="${l.enabled ? '#10b981' : '#475569'}" stroke-dasharray="${
          l.enabled ? 'none' : '4,4'
        }" />`
    )
    .join('\n')}
  ${nodes
    .map(
      (n) => `
    <g transform="translate(${n.x}, ${n.y})">
      <rect width="${n.width}" height="${n.height}" rx="10" fill="${n.node.isDir ? '#1e293b' : '#0f172a'}" stroke="${
        n.node.isDir ? '#f59e0b' : '#10b981'
      }" stroke-width="1.5" />
      <text x="14" y="24" class="node-text">${n.node.name}${n.node.isDir ? '/' : ''}</text>
      <text x="14" y="38" class="node-path">${n.node.path}</text>
    </g>
  `
    )
    .join('\n')}
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `treeforge_${root.name || 'project'}_diagram.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Quick Child Creation
  const handleAddChildConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddParent || !newChildName.trim() || !onAddChildNode) return;
    onAddChildNode(quickAddParent.path, newChildName.trim(), newChildIsFolder);
    setNewChildName('');
    setQuickAddParent(null);
  };

  return (
    <div
      className={`relative flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none transition-all ${
        isFullscreen
          ? 'fixed inset-4 z-50 shadow-2xl border-emerald-500/50 bg-slate-950/98 backdrop-blur-md'
          : 'h-[490px] w-full'
      }`}
    >
      {/* Top Diagram Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/95 border-b border-slate-800 text-xs gap-2">
        {/* Left: View orientation, type filters & search */}
        <div className="flex items-center space-x-1.5 rtl:space-x-reverse flex-wrap gap-y-1">
          {/* Orientation Switcher */}
          <button
            onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
            className="flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title={isAr ? 'تبديل اتجاه الرسم (أفقي / رأسي)' : 'Switch orientation (Horizontal / Vertical)'}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>{orientation === 'horizontal' ? (isAr ? 'أفقي' : 'Horizontal') : (isAr ? 'رأسي' : 'Vertical')}</span>
          </button>

          {/* Expand / Collapse All */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={expandAll}
              className="px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition"
              title={isAr ? 'توسيع كافة المجلدات' : 'Expand all folders'}
            >
              {isAr ? 'توسيع الكل' : 'Expand All'}
            </button>
            <span className="text-slate-700 px-0.5">|</span>
            <button
              onClick={collapseAll}
              className="px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition"
              title={isAr ? 'طي كافة المجلدات' : 'Collapse all folders'}
            >
              {isAr ? 'طي الكل' : 'Collapse All'}
            </button>
          </div>

          {/* Type Filter Pills */}
          <div className="hidden sm:flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
            {(
              [
                { id: 'all', label: isAr ? 'الكل' : 'All' },
                { id: 'python', label: '.py' },
                { id: 'folders', label: isAr ? 'مجلدات' : 'Dirs' },
                { id: 'configs', label: 'Configs' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-2 py-0.5 rounded transition ${
                  typeFilter === t.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search inside diagram */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 rtl:right-2 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث في العقد...' : 'Find node...'}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-7 rtl:pr-7 pr-2 py-0.5 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 w-28 sm:w-32"
            />
          </div>
        </div>

        {/* Right: Theme, Auto-Fit, Zoom, SVG Export, Fullscreen */}
        <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
          {/* Theme Palette dropdown / toggle */}
          <button
            onClick={() => {
              const themes: DiagramTheme[] = ['cyber', 'nebula', 'ocean', 'amber'];
              const nextIndex = (themes.indexOf(themePreset) + 1) % themes.length;
              setThemePreset(themes[nextIndex]);
            }}
            className="flex items-center space-x-1 px-2 py-1 rounded-md text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition border border-slate-800"
            title={isAr ? 'تبديل المظهر اللوني للرسم' : 'Switch Diagram Visual Theme'}
          >
            <Palette className="w-3 h-3 text-emerald-400" />
            <span className="capitalize text-[11px]">{themePreset}</span>
          </button>

          {/* Auto-Fit View button */}
          <button
            onClick={handleAutoFit}
            className="flex items-center space-x-1 px-2 py-1 rounded-md text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition border border-slate-800 text-[11px]"
            title={isAr ? 'ملاءمة وتوسيط كامل الشجرة في الشاشة' : 'Auto-Fit Tree in Viewport'}
          >
            <Maximize className="w-3 h-3 text-sky-400" />
            <span className="hidden md:inline">{isAr ? 'ملاءمة' : 'Fit'}</span>
          </button>

          {/* Zoom In/Out */}
          <button
            onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 min-w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.15).toFixed(2))))}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isAr ? 'إعادة ضبط المنظور' : 'Reset View'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <span className="text-slate-700">|</span>

          {/* Export SVG */}
          <button
            onClick={handleExportSvg}
            className="p-1 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
            title={isAr ? 'تصدير الرسم كصورة متجهية (SVG)' : 'Export Diagram as Vector SVG'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
            title={isFullscreen ? (isAr ? 'تصغير' : 'Exit Fullscreen') : (isAr ? 'تكبير كامل الشاشة' : 'Fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Interactive Infinite Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing ${
          isPanning ? 'cursor-grabbing' : ''
        }`}
        style={{
          backgroundColor: themeColors.canvasBg,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(51, 65, 85, 0.28) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          className="absolute top-0 left-0 transition-transform duration-75 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`,
          }}
        >
          {/* SVG Connecting Lines Layer */}
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={bounds.width}
            height={bounds.height}
          >
            <defs>
              {/* Cyber Gradients */}
              <linearGradient id="linkGradCyber" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="linkGradCyberFolder" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>

              {/* Nebula Gradients */}
              <linearGradient id="linkGradNebula" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="linkGradNebulaFolder" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e879f9" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
              </linearGradient>

              {/* Ocean Gradients */}
              <linearGradient id="linkGradOcean" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="linkGradOceanFolder" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
              </linearGradient>

              {/* Amber Gradients */}
              <linearGradient id="linkGradAmber" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="linkGradAmberFolder" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ea580c" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {links.map((link) => (
              <path
                key={link.id}
                d={getCurvePath(link)}
                fill="none"
                stroke={
                  !link.enabled
                    ? '#475569'
                    : link.isFolder
                    ? themeColors.linkFolder
                    : themeColors.linkActive
                }
                strokeWidth={link.enabled ? 2.2 : 1.5}
                strokeDasharray={!link.enabled ? '4,4' : undefined}
                className="transition-all duration-300"
              />
            ))}
          </svg>

          {/* Interactive HTML Node Cards Layer */}
          {nodes.map((pNode) => {
            const { node, x, y, width, height, isCollapsed } = pNode;
            const isDir = node.isDir;
            const isRoot = pNode.depth === 0;
            const isPy = node.name.endsWith('.py');
            const hasChildren = node.children.length > 0;
            const isHighlighted =
              searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = matchesTypeFilter(node);

            return (
              <div
                key={pNode.id}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  opacity: matchesFilter ? 1 : 0.25,
                }}
                className={`group flex items-center justify-between px-2.5 rounded-xl border shadow-lg transition-all duration-200 cursor-pointer ${
                  !node.enabled
                    ? 'opacity-40 bg-slate-900 border-slate-800'
                    : isRoot
                    ? `bg-gradient-to-r from-slate-900 to-slate-950 ${themeColors.rootBorder} ring-1 ring-emerald-500/30`
                    : getNodeColor(node)
                } ${isHighlighted ? 'ring-2 ring-amber-400 scale-105' : 'hover:scale-[1.02]'}`}
                onClick={() => setSelectedNode(pNode)}
              >
                {/* Checkbox and Icon */}
                <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleNode(node.path, node.name);
                    }}
                    className="shrink-0 text-slate-400 hover:text-emerald-400 transition"
                  >
                    {node.enabled ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {isDir ? (
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : isPy ? (
                    <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-mono truncate ${
                        isRoot
                          ? 'font-black text-white'
                          : isDir
                          ? 'font-bold text-slate-100'
                          : 'text-slate-200'
                      }`}
                      title={node.path}
                    >
                      {node.name}
                      {isDir && '/'}
                    </p>
                  </div>
                </div>

                {/* Right side actions: Expand/Collapse toggle or child count or delete */}
                <div className="flex items-center space-x-1 rtl:space-x-reverse ml-1.5 shrink-0">
                  {/* Folder Quick Add Button */}
                  {isDir && onAddChildNode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickAddParent({ path: node.path, name: node.name });
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 transition"
                      title={isAr ? `إضافة ملف/مجلد داخل ${node.name}` : `Add item inside ${node.name}`}
                    >
                      <FolderPlus className="w-3 h-3" />
                    </button>
                  )}

                  {isDir && hasChildren && (
                    <button
                      onClick={(e) => toggleCollapse(node.path, e)}
                      className="p-1 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center space-x-0.5 rtl:space-x-reverse transition"
                      title={isCollapsed ? (isAr ? 'توسيع' : 'Expand') : (isAr ? 'طي' : 'Collapse')}
                    >
                      <span>{node.children.length}</span>
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-emerald-400" />
                      )}
                    </button>
                  )}

                  {!isRoot && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveNode(node.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition"
                      title={isAr ? `حذف ${node.name}` : `Delete ${node.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini-Map Radar Navigation (Bottom Right) */}
        {showMiniMap && (
          <div className="absolute bottom-3 right-3 z-20 bg-slate-950/90 border border-slate-800 rounded-xl p-2 shadow-2xl backdrop-blur-md hidden sm:block">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80 mb-1 text-[10px] text-slate-400 font-mono">
              <span>Radar MiniMap</span>
              <button
                onClick={() => setShowMiniMap(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                ×
              </button>
            </div>
            <div
              className="relative bg-slate-900 border border-slate-800 rounded cursor-crosshair overflow-hidden"
              style={{ width: '130px', height: '85px' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = (e.clientX - rect.left) / rect.width;
                const clickY = (e.clientY - rect.top) / rect.height;
                setPan({
                  x: -(clickX * bounds.width * zoom - 150),
                  y: -(clickY * bounds.height * zoom - 150),
                });
              }}
            >
              {/* Nodes miniature dots */}
              {nodes.map((n) => {
                const dotX = (n.x / bounds.width) * 130;
                const dotY = (n.y / bounds.height) * 85;
                return (
                  <div
                    key={n.id}
                    className={`absolute rounded-full ${
                      n.node.isDir ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{
                      left: `${dotX}px`,
                      top: `${dotY}px`,
                      width: '4px',
                      height: '4px',
                    }}
                  />
                );
              })}
              {/* Viewport box representation */}
              <div
                className="absolute border border-emerald-400/80 bg-emerald-500/10 rounded pointer-events-none"
                style={{
                  left: `${Math.max(0, (-pan.x / (bounds.width * zoom)) * 130)}px`,
                  top: `${Math.max(0, (-pan.y / (bounds.height * zoom)) * 85)}px`,
                  width: `${Math.min(130, (400 / (bounds.width * zoom)) * 130)}px`,
                  height: `${Math.min(85, (300 / (bounds.height * zoom)) * 85)}px`,
                }}
              />
            </div>
          </div>
        )}

        {/* Quick Add Child Modal */}
        {quickAddParent && (
          <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl max-w-sm w-full space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <FolderPlus className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white text-sm">
                    {isAr ? 'إضافة عنصر داخل المجلد' : 'Add Item Inside Folder'}
                  </span>
                </div>
                <button
                  onClick={() => setQuickAddParent(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 truncate">
                📁 {quickAddParent.path}/
              </div>

              <form onSubmit={handleAddChildConfirm} className="space-y-3">
                <div className="flex items-center space-x-3 rtl:space-x-reverse text-xs">
                  <label className="flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer">
                    <input
                      type="radio"
                      name="childType"
                      checked={!newChildIsFolder}
                      onChange={() => setNewChildIsFolder(false)}
                      className="accent-emerald-500"
                    />
                    <span className="text-slate-200">{isAr ? 'ملف جديد' : 'New File'}</span>
                  </label>
                  <label className="flex items-center space-x-1.5 rtl:space-x-reverse cursor-pointer">
                    <input
                      type="radio"
                      name="childType"
                      checked={newChildIsFolder}
                      onChange={() => setNewChildIsFolder(true)}
                      className="accent-emerald-500"
                    />
                    <span className="text-slate-200">{isAr ? 'مجلد فرعي' : 'Subfolder'}</span>
                  </label>
                </div>

                <input
                  type="text"
                  autoFocus
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  placeholder={newChildIsFolder ? 'utils or subpkg' : 'calculator.py'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />

                <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-2">
                  <button
                    type="button"
                    onClick={() => setQuickAddParent(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={!newChildName.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50"
                  >
                    {isAr ? 'إضافة الآن' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Selected Node Details Drawer / Popover */}
        {selectedNode && (
          <div className="absolute top-3 left-3 z-20 bg-slate-900/95 border border-emerald-500/30 rounded-xl p-3.5 shadow-2xl backdrop-blur-md max-w-xs w-full text-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Info className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white truncate max-w-[170px]">
                  {selectedNode.node.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1 text-[11px] text-slate-300 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{isAr ? 'النوع:' : 'Type:'}</span>
                <span className="font-semibold text-emerald-400">
                  {selectedNode.node.isDir ? (isAr ? 'مجلد' : 'Folder') : (isAr ? 'ملف' : 'File')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{isAr ? 'المستوى الهرمي:' : 'Depth:'}</span>
                <span>Level {selectedNode.depth}</span>
              </div>
              {selectedNode.node.isDir && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{isAr ? 'العناصر الفرعية:' : 'Sub-items:'}</span>
                  <span>{selectedNode.node.children.length}</span>
                </div>
              )}
              <div className="pt-1">
                <span className="text-slate-500 block text-[10px]">{isAr ? 'المسار الكامل:' : 'Full Path:'}</span>
                <span className="text-slate-400 break-all bg-slate-950 p-1.5 rounded border border-slate-800 block text-[10px] mt-0.5">
                  {selectedNode.node.path}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedNode.node.path);
                  setCopiedPath(true);
                  setTimeout(() => setCopiedPath(false), 1500);
                }}
                className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-emerald-400 transition"
              >
                {copiedPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPath ? (isAr ? 'تم النسخ' : 'Copied!') : (isAr ? 'نسخ المسار' : 'Copy Path')}</span>
              </button>

              <button
                onClick={() => {
                  onToggleNode(selectedNode.node.path, selectedNode.node.name);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  selectedNode.node.enabled
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {selectedNode.node.enabled ? (isAr ? 'استبعاد' : 'Exclude') : (isAr ? 'تفعيل' : 'Include')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Diagram Legend & Stats */}
      <div className="px-3 py-1.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <span className="flex items-center space-x-1 rtl:space-x-reverse">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>{isAr ? 'مجلدات' : 'Folders'}</span>
          </span>
          <span className="flex items-center space-x-1 rtl:space-x-reverse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>{isAr ? 'بايثون (.py)' : 'Python'}</span>
          </span>
          <span className="flex items-center space-x-1 rtl:space-x-reverse">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span>{isAr ? 'توثيق وملفات' : 'Docs & Files'}</span>
          </span>
          <span className="flex items-center space-x-1 rtl:space-x-reverse">
            <span className="w-2.5 h-1 border-t border-dashed border-slate-500"></span>
            <span>{isAr ? 'مستبعد' : 'Excluded'}</span>
          </span>
        </div>

        <div className="flex items-center space-x-3 rtl:space-x-reverse text-[10px] text-slate-500 font-mono">
          {!showMiniMap && (
            <button
              onClick={() => setShowMiniMap(true)}
              className="text-emerald-400 hover:underline"
            >
              {isAr ? 'إظهار الخريطة' : 'Show MiniMap'}
            </button>
          )}
          <span>
            {isAr
              ? `${nodes.length} عقدة • ${links.length} وصلة • اسحب للتحريك`
              : `${nodes.length} nodes • ${links.length} links • Drag to pan`}
          </span>
        </div>
      </div>
    </div>
  );
};
