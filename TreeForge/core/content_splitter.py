"""Pure Python content splitter for TreeForge.

Splits multi-file batches using multiple marker conventions, resolves target files
in a project tree via exact, unique-name, and fuzzy matching, and handles fence stripping.
"""

import re
import difflib
from typing import List, Dict, Optional, Tuple, Set
from .models import FileChunk, MatchStatus, TreeNode, NewlineMode


MARKER_REGEXES = [
    # 1. Comment file markers: // FILE: path or /* FILE: path */
    (re.compile(r'^(?:\/\/|\/\*)\s*(?:FILE|File|file):\s*(?P<path>[^\n\r*]+?)(?:\s*\*\/)?$', re.MULTILINE), "slash_file"),

    # 2. Hash comment marker: # FILE: path or # file: path
    (re.compile(r'^\#\s*(?:FILE|File|file):\s*(?P<path>[^\n\r]+?)\s*$', re.MULTILINE), "hash_file"),

    # 3. Triple equal: === path/to/file.py ===
    (re.compile(r'^[=]{3,}\s*(?P<path>[^\n\r]+?)\s*[=]{3,}$', re.MULTILINE), "triple_equal"),

    # 4. Triple dash: --- path/to/file.py ---
    (re.compile(r'^\-{3,}\s*(?P<path>[^\n\r]+?)\s*\-{3,}$', re.MULTILINE), "triple_dash"),

    # 5. Code fence with path info: ```python:path/to/file.py or ```python title="path/to/file.py"
    (re.compile(r'^```[a-zA-Z0-9_-]*(?::\s*|\s+(?:title|filename|file)=["\'])(?P<path>[^"\'\n\r]+)["\']?\s*$', re.MULTILINE), "fence_info"),

    # 6. Heading style: ### path/to/file.py or #### path
    (re.compile(r'^(?:#{1,6})\s+(?P<path>[^\n\r`]+?)\s*$', re.MULTILINE), "markdown_heading"),

    # 7. Bold line: **path/to/file.py**
    (re.compile(r'^\*\*(?P<path>[^\n\r*`]+?)\*\*\s*$', re.MULTILINE), "bold_filename"),

    # 8. HTML comment marker: <!-- FILE: path/to/file.py -->
    (re.compile(r'^\<!--\s*(?:FILE|File|file):\s*(?P<path>[^\n\r>-]+?)\s*-->$', re.MULTILINE), "html_comment_file"),
]


def strip_code_fences(content: str) -> str:
    """Strip surrounding markdown code fences (```lang ... ```) if present."""
    trimmed = content.strip()
    if trimmed.startswith("```") and trimmed.endswith("```"):
        lines = trimmed.splitlines()
        if len(lines) >= 2 and lines[0].startswith("```") and lines[-1].startswith("```"):
            return "\n".join(lines[1:-1])
    return content


def normalize_newlines(content: str, mode: NewlineMode) -> str:
    """Normalize line endings to LF, CRLF, or keep original."""
    if mode == NewlineMode.KEEP:
        return content
    # First unify to LF
    unified = content.replace("\r\n", "\n").replace("\r", "\n")
    if mode == NewlineMode.LF:
        return unified
    elif mode == NewlineMode.CRLF:
        return unified.replace("\n", "\r\n")
    return content


COMMON_EXTENSIONS = {
    ".py", ".txt", ".md", ".json", ".toml", ".yaml", ".yml", ".html",
    ".css", ".js", ".ts", ".jsx", ".tsx", ".sh", ".sql", ".xml", ".ini", ".cfg"
}

KNOWN_EXTENSIONLESS = {"dockerfile", "makefile", "license", ".gitignore", "procfile"}


def looks_like_filename(path_str: str) -> bool:
    """Check if the string looks like a filename (has dot extension or known filename)."""
    p = path_str.strip().lower()
    if p in KNOWN_EXTENSIONLESS:
        return True
    # Check if last segment has an extension or slash
    parts = p.split('/')
    last_part = parts[-1]
    if '.' in last_part and not last_part.startswith('.'):
        ext = '.' + last_part.split('.')[-1]
        return ext in COMMON_EXTENSIONS or len(ext) <= 5
    return False


def sanitize_extracted_path(raw_path: str) -> str:
    """Clean raw extracted path string by removing unwanted quotes, colons, or bullets."""
    clean = raw_path.strip().strip("`'\"*: ").strip()
    # Strip any leading FILE: or file: prefix
    clean = re.sub(r'^(?:FILE|File|file):\s*', '', clean)
    # Normalize slashes
    clean = clean.replace('\\', '/')
    # Remove leading ./ or /
    clean = re.sub(r'^(?:\.\/|\/)+', '', clean)
    return clean


class ContentSplitter:
    """Parses combined text into individual file chunks and matches to project tree."""

    def __init__(self, strip_fences: bool = True, newline_mode: NewlineMode = NewlineMode.KEEP):
        self.strip_fences = strip_fences
        self.newline_mode = newline_mode

    def split(self, text: str, available_paths: Optional[List[str]] = None) -> List[FileChunk]:
        """Split text by detecting recognized file separators."""
        if not text.strip():
            return []

        # Find all marker occurrences in text
        matches: List[Tuple[int, int, str, str]] = []  # (start_char, end_char, path, marker_type)

        for regex, marker_type in MARKER_REGEXES:
            for m in regex.finditer(text):
                raw_path = m.group("path")
                clean_path = sanitize_extracted_path(raw_path)
                if not clean_path or clean_path.startswith("http") or len(clean_path.splitlines()) > 1:
                    continue

                # For markdown heading and bold line, verify it has a file extension
                # OR is followed by a code fence ``` within next lines
                if marker_type in ("markdown_heading", "bold_filename"):
                    after_text = text[m.end():m.end() + 150].lstrip()
                    is_fence_following = after_text.startswith("```")
                    is_file = looks_like_filename(clean_path)
                    
                    if not (is_file or is_fence_following):
                        continue

                matches.append((m.start(), m.end(), clean_path, marker_type))

        # Sort matches by appearance in text
        matches.sort(key=lambda x: x[0])

        # Filter overlapping matches (keep earliest/longest)
        filtered_matches: List[Tuple[int, int, str, str]] = []
        last_end = -1
        for m in matches:
            if m[0] >= last_end:
                filtered_matches.append(m)
                last_end = m[1]

        chunks: List[FileChunk] = []

        if not filtered_matches:
            # No recognized markers found. Treat the whole text as a single unassigned chunk
            clean_content = strip_code_fences(text) if self.strip_fences else text
            clean_content = normalize_newlines(clean_content, self.newline_mode)
            chunk = FileChunk(
                id="chunk_1",
                raw_target_path="",
                resolved_path="",
                content=clean_content,
                match_status=MatchStatus.NOT_FOUND,
                line_count=len(clean_content.splitlines()),
                size_bytes=len(clean_content.encode("utf-8")),
                included=True,
                marker_type="whole_file"
            )
            return [chunk]

        # Extract content between markers
        for i, match in enumerate(filtered_matches):
            start_content = match[1]
            end_content = filtered_matches[i + 1][0] if i + 1 < len(filtered_matches) else len(text)
            
            raw_target = match[2]
            marker_type = match[3]
            body = text[start_content:end_content]

            # Strip leading/trailing blank lines
            body_clean = body.strip("\r\n")
            if self.strip_fences:
                body_clean = strip_code_fences(body_clean)
            body_clean = normalize_newlines(body_clean, self.newline_mode)

            chunk = FileChunk(
                id=f"chunk_{i + 1}",
                raw_target_path=raw_target,
                resolved_path=raw_target,
                content=body_clean,
                match_status=MatchStatus.NOT_FOUND,
                line_count=len(body_clean.splitlines()),
                size_bytes=len(body_clean.encode("utf-8")),
                included=True,
                marker_type=marker_type
            )
            chunks.append(chunk)

        # If available_paths are provided, resolve matches
        if available_paths:
            self.resolve_matches(chunks, available_paths)

        return chunks

    @staticmethod
    def resolve_matches(chunks: List[FileChunk], candidate_paths: List[str]) -> None:
        """Match chunk targets to candidate project paths using exact, unique-name, and fuzzy matching."""
        # Normalize candidate paths
        norm_candidates = {p.replace('\\', '/').lower(): p for p in candidate_paths}
        name_to_paths: Dict[str, List[str]] = {}
        for p in candidate_paths:
            norm_p = p.replace('\\', '/')
            name = norm_p.split('/')[-1].lower()
            name_to_paths.setdefault(name, []).append(p)

        for chunk in chunks:
            raw = chunk.raw_target_path.strip().replace('\\', '/')
            if not raw:
                chunk.match_status = MatchStatus.NOT_FOUND
                chunk.candidate_paths = candidate_paths[:5]
                continue

            raw_lower = raw.lower()

            # 1. Exact match (case insensitive relative path)
            matched_exact = None
            if raw_lower in norm_candidates:
                matched_exact = norm_candidates[raw_lower]
            else:
                # Check suffix match, e.g. "ui/styles.py" matches "SumMaster/ui/styles.py"
                suffix_matches = [
                    orig for norm, orig in norm_candidates.items()
                    if norm == raw_lower or norm.endswith('/' + raw_lower)
                ]
                if len(suffix_matches) == 1:
                    matched_exact = suffix_matches[0]
                elif len(suffix_matches) > 1:
                    chunk.match_status = MatchStatus.AMBIGUOUS
                    chunk.candidate_paths = suffix_matches
                    chunk.resolved_path = suffix_matches[0]
                    continue

            if matched_exact:
                chunk.match_status = MatchStatus.MATCHED
                chunk.resolved_path = matched_exact
                continue

            # 2. Unique filename match (e.g. styles.py -> ui/styles.py)
            filename = raw.split('/')[-1].lower()
            filename_matches = name_to_paths.get(filename, [])
            if len(filename_matches) == 1:
                chunk.match_status = MatchStatus.MATCHED
                chunk.resolved_path = filename_matches[0]
                continue
            elif len(filename_matches) > 1:
                chunk.match_status = MatchStatus.AMBIGUOUS
                chunk.candidate_paths = filename_matches
                chunk.resolved_path = filename_matches[0]
                continue

            # 3. Fuzzy matching with difflib
            close = difflib.get_close_matches(raw, candidate_paths, n=3, cutoff=0.55)
            if not close:
                # Try fuzzy matching on just the filename
                close = difflib.get_close_matches(filename, candidate_paths, n=3, cutoff=0.5)

            if len(close) == 1:
                chunk.match_status = MatchStatus.MATCHED
                chunk.resolved_path = close[0]
                chunk.candidate_paths = close
            elif len(close) > 1:
                chunk.match_status = MatchStatus.AMBIGUOUS
                chunk.candidate_paths = close
                chunk.resolved_path = close[0]
            else:
                chunk.match_status = MatchStatus.NOT_FOUND
                chunk.candidate_paths = candidate_paths[:5]
