export type Language = 'en' | 'ar';
export type Theme = 'dark' | 'light';

export type CollisionPolicy = 'skip' | 'overwrite' | 'auto_rename';
export type MatchStatus = 'matched' | 'ambiguous' | 'not_found';
export type NewlineMode = 'keep' | 'lf' | 'crlf';

export interface WebTreeNode {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  children: WebTreeNode[];
  enabled: boolean;
  content?: string;
  lineNumber?: number;
}

export interface WebParseError {
  lineNumber: number;
  rawText: string;
  message: string;
}

export interface WebParseResult {
  root: WebTreeNode | null;
  errors: WebParseError[];
  totalFolders: number;
  totalFiles: number;
}

export interface WebFileChunk {
  id: string;
  rawTargetPath: string;
  resolvedPath: string;
  content: string;
  matchStatus: MatchStatus;
  candidatePaths: string[];
  lineCount: number;
  sizeBytes: number;
  included: boolean;
  markerType: string;
}

export interface PythonFileEntry {
  path: string;
  name: string;
  content: string;
  isDir: boolean;
}

export interface TreeSnapshot {
  id: string;
  timestamp: number;
  description: string;
  descriptionAr: string;
  treeText: string;
  disabledNodePaths: string[];
  policy: CollisionPolicy;
  addInitPy: boolean;
  starterContent: boolean;
}

