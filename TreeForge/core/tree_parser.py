"""Pure Python tree parser for TreeForge.

Parses text-based directory tree representations into structured TreeNode hierarchies
with strict security validation and comprehensive syntax tolerance.
"""

import re
from .path_safety import validate_relative_path
from pathlib import Path
from typing import List, Tuple, Optional, Set
from .models import TreeNode, ParseError, ParseResult

WINDOWS_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
}

WINDOWS_ILLEGAL_CHARS = set('<>:"|?*')
MAX_PATH_LENGTH = 260


def clean_line_comment(line: str) -> str:
    """Strip trailing comment starting with '#' if not inside quotes."""
    in_quote = False
    quote_char = ''
    for i, ch in enumerate(line):
        if ch in ('"', "'"):
            if not in_quote:
                in_quote = True
                quote_char = ch
            elif quote_char == ch:
                in_quote = False
        elif ch == '#' and not in_quote:
            return line[:i].rstrip()
    return line


def calculate_depth_and_content(line: str, indent_unit: int = 4) -> Tuple[int, str]:
    """Extract nesting depth level and text content from a tree line.

    Supports:
    - Box-drawing characters (├──, └──, │)
    - ASCII variants (|--, `--`, +--)
    - Indentation (spaces or tabs)
    - Markdown bullets (- or *)
    """
    cleaned = clean_line_comment(line)
    if not cleaned.strip():
        return -1, ""

    # Measure leading whitespace and tree markers
    prefix_len = 0
    box_chars_pattern = r'^(?:[\s│|]*)(?:├──|└──|\|\-\-|\`\-\-|\+\-\-|\-\-|\-|\*|\>)?\s*'
    match = re.match(box_chars_pattern, cleaned)
    
    # Calculate depth using prefix analysis
    indent_part = cleaned[:match.end()] if match else ""
    content = cleaned[len(indent_part):].strip()

    # Calculate depth: count tree symbols and indentation levels
    # Each level is roughly 2-4 spaces or one tree branch symbol
    indent_expanded = indent_part.expandtabs(4)
    # Count occurrences of branch indicators or vertical pipes
    branches = len(re.findall(r'(?:│|\||├──|└──|\+\-\-)', indent_part))
    
    expanded = cleaned.replace("\t", "    ")
    branch = re.search(r"(?:├──|└──|\|--|`--|\+--|--)", expanded)
    leading = len(expanded) - len(expanded.lstrip(" "))
    depth = (branch.start() // 4 + 1) if branch else leading // indent_unit + bool(re.match(r"^[-*>]\s", expanded.lstrip()))

    # Clean markdown bullets if any left in content
    content = re.sub(r'^[*\-]\s+', '', content).strip()
    return depth, content


def validate_name_segment(segment: str, line_number: int, full_path: str) -> Optional[str]:
    """Validate a single path component for security and filesystem legality."""
    try:
        validate_relative_path(segment)
        if "/" in segment or "\\" in segment:
            raise ValueError("A name cannot contain separators")
    except ValueError as exc:
        return f"Line {line_number}: {exc}"
    if not segment:
        return f"Line {line_number}: Path segment cannot be empty in '{full_path}'"

    # Trailing dot or space check
    if segment.endswith('.') or segment.endswith(' '):
        return f"Line {line_number}: Path segment '{segment}' cannot end with a dot or space"

    # Leading or trailing whitespace
    if segment != segment.strip():
        return f"Line {line_number}: Path segment '{segment}' has invalid surrounding whitespace"

    # Path traversal check
    if segment in ('.', '..'):
        return f"Line {line_number}: Path traversal segment '{segment}' is strictly prohibited"

    # Windows illegal characters
    illegal_found = [c for c in segment if c in WINDOWS_ILLEGAL_CHARS]
    if illegal_found:
        return f"Line {line_number}: Segment '{segment}' contains illegal character(s): {', '.join(illegal_found)}"

    # Reserved names check (case-insensitive, e.g. CON, NUL.txt, com1)
    base_name = segment.split('.')[0].upper()
    if base_name in WINDOWS_RESERVED_NAMES:
        return f"Line {line_number}: Segment '{segment}' uses reserved system name '{base_name}'"

    return None


def parse_inline_group(text: str) -> Tuple[str, List[str]]:
    """Parse inline group syntax like 'ui/ (main_window.py, spinner.py, styles.py)'.
    
    Returns (parent_folder, [child1, child2, ...])
    """
    match = re.match(r'^(.*?)\s*\((.*?)\)\s*$', text)
    if not match:
        return text, []

    parent = match.group(1).strip()
    inside = match.group(2).strip()
    
    if not inside:
        return parent, []

    # Split by commas, handling possible quoted values
    parts: List[str] = []
    current = []
    in_quote = False
    quote_char = ''
    for char in inside:
        if char in ('"', "'"):
            if not in_quote:
                in_quote = True
                quote_char = char
            elif quote_char == char:
                in_quote = False
            current.append(char)
        elif char == ',' and not in_quote:
            parts.append("".join(current).strip().strip("'\""))
            current = []
        else:
            current.append(char)
    if current:
        parts.append("".join(current).strip().strip("'\""))

    return parent, [p for p in parts if p]


class TreeParser:
    """Parses text tree into TreeNode structure with full error checking."""

    def __init__(self, default_root_name: str = "project_root"):
        self.default_root_name = default_root_name

    def parse(self, text: str, user_root_name: Optional[str] = None) -> ParseResult:
        result = ParseResult()
        raw_lines = text.splitlines()
        result.raw_lines_count = len(raw_lines)

        # Filter out empty lines and markdown fences
        clean_entries: List[Tuple[int, int, str]] = []  # (original_line_num, depth, content)
        indents = [len(re.match(r"^[ \t]+", line).group().replace("\t", "    "))
                   for line in raw_lines if re.match(r"^[ \t]+", line) and not re.search(r"[│├└|]", line)]
        indent_unit = min(indents) if indents else 4

        for idx, line in enumerate(raw_lines, start=1):
            stripped = line.strip()
            # Handle markdown code fences ```
            if stripped.startswith("```"):
                continue
            if not stripped:
                continue

            depth, content = calculate_depth_and_content(line, indent_unit)
            if depth >= 0 and content:
                clean_entries.append((idx, depth, content))

        if not clean_entries:
            result.errors.append(ParseError(1, "", "Input tree text is empty or contains no valid lines."))
            return result

        # First entry might be root folder
        first_line_num, first_depth, first_content = clean_entries[0]
        has_root_line = False
        root_name = user_root_name or self.default_root_name
        if validate_name_segment(root_name, 1, root_name):
            result.errors.append(ParseError(1, root_name, "Invalid default root name"))
            return result

        # Check if first line acts as explicit root (trailing slash or single top-level folder)
        if first_content.endswith('/') or (len(clean_entries) > 1 and first_depth < clean_entries[1][1]):
            clean_first = first_content.rstrip('/')
            # Validate root name
            err = validate_name_segment(clean_first, first_line_num, clean_first)
            if err:
                result.errors.append(ParseError(first_line_num, first_content, err))
            else:
                root_name = clean_first
                has_root_line = True

        root_node = TreeNode(
            name=root_name,
            relative_path=root_name,
            is_dir=True,
            line_number=first_line_num if has_root_line else None
        )
        result.root = root_node

        # Depth stack: list of (depth, TreeNode)
        stack: List[Tuple[int, TreeNode]] = [(0, root_node)]
        existing_paths: Set[str] = {root_name.lower()}

        # Process entries starting from line 1 or 2
        start_idx = 1 if has_root_line else 0

        for line_num, depth, content in clean_entries[start_idx:]:
            # Check for inline group: "ui/ (a.py, b.py)"
            parent_text, inline_children = parse_inline_group(content)

            # Security checks for parent_text
            if ".." in parent_text.replace("\\", "/").split("/") or parent_text.startswith(("/", "\\")) or re.match(r'^[a-zA-Z]:', parent_text):
                result.errors.append(ParseError(
                    line_num, content,
                    f"Line {line_num}: Absolute paths or traversal '..' forbidden: '{parent_text}'"
                ))
                continue

            # Determine if this parent entry is directory
            is_directory = parent_text.endswith('/') or bool(inline_children)
            clean_parent = parent_text.rstrip('/')

            # Handle nested paths in single line, e.g. "assets/icons/"
            segments = [s.strip() for s in clean_parent.replace('\\', '/').split('/') if s.strip()]
            if not segments:
                continue

            # Validate each segment
            has_validation_error = False
            for seg in segments:
                v_err = validate_name_segment(seg, line_num, clean_parent)
                if v_err:
                    result.errors.append(ParseError(line_num, content, v_err))
                    has_validation_error = True
                    break
            if has_validation_error:
                continue

            # Adjust stack according to depth
            # Pop stack items that are deeper than or equal to current depth (except root at 0)
            while len(stack) > 1 and stack[-1][0] >= depth:
                stack.pop()

            current_parent = stack[-1][1]

            # Create intermediate directories if nested segments exist
            walk_node = current_parent
            for i, seg in enumerate(segments[:-1]):
                seg_path = f"{walk_node.relative_path}/{seg}"
                found = None
                for child in walk_node.children:
                    if child.name.lower() == seg.lower() and child.is_dir:
                        found = child
                        break
                if not found:
                    found = TreeNode(name=seg, relative_path=seg_path, is_dir=True, line_number=line_num)
                    walk_node.add_child(found)
                    existing_paths.add(seg_path.lower())
                walk_node = found

            # The final segment
            final_name = segments[-1]
            final_path = f"{walk_node.relative_path}/{final_name}"

            if final_path.lower() in existing_paths:
                result.errors.append(ParseError(
                    line_num, content,
                    f"Line {line_num}: Duplicate path entry '{final_path}'"
                ))
                continue

            # Check over-long path
            if len(final_path) > MAX_PATH_LENGTH:
                result.errors.append(ParseError(
                    line_num, content,
                    f"Line {line_num}: Path exceeds max allowed length ({MAX_PATH_LENGTH} chars): '{final_path}'"
                ))
                continue

            new_node = TreeNode(
                name=final_name,
                relative_path=final_path,
                is_dir=is_directory,
                line_number=line_num
            )
            walk_node.add_child(new_node)
            existing_paths.add(final_path.lower())

            # If it's a directory, push it onto stack for subsequent indented children
            if is_directory:
                stack.append((depth, new_node))

            # If inline children exist, add them directly to this new_node
            if inline_children:
                for child_entry in inline_children:
                    child_is_dir = child_entry.endswith('/')
                    clean_child_entry = child_entry.rstrip('/')
                    child_segments = [s.strip() for s in clean_child_entry.replace('\\', '/').split('/') if s.strip()]
                    if not child_segments:
                        continue

                    # Validate child segments
                    child_has_err = False
                    for c_seg in child_segments:
                        c_err = validate_name_segment(c_seg, line_num, child_entry)
                        if c_err:
                            result.errors.append(ParseError(line_num, content, c_err))
                            child_has_err = True
                            break
                    if child_has_err:
                        continue

                    # Walk or create nested under new_node
                    child_walk = new_node
                    for c_seg in child_segments[:-1]:
                        c_sub_path = f"{child_walk.relative_path}/{c_seg}"
                        c_found = None
                        for ch in child_walk.children:
                            if ch.name.lower() == c_seg.lower() and ch.is_dir:
                                c_found = ch
                                break
                        if not c_found:
                            c_found = TreeNode(name=c_seg, relative_path=c_sub_path, is_dir=True, line_number=line_num)
                            child_walk.add_child(c_found)
                            existing_paths.add(c_sub_path.lower())
                        child_walk = c_found

                    c_final_name = child_segments[-1]
                    c_final_path = f"{child_walk.relative_path}/{c_final_name}"
                    if c_final_path.lower() in existing_paths:
                        result.errors.append(ParseError(
                            line_num, content,
                            f"Line {line_num}: Duplicate inline item '{c_final_path}'"
                        ))
                        continue

                    leaf_node = TreeNode(
                        name=c_final_name,
                        relative_path=c_final_path,
                        is_dir=child_is_dir,
                        line_number=line_num
                    )
                    child_walk.add_child(leaf_node)
                    existing_paths.add(c_final_path.lower())

        # Count total folders and files
        if result.root:
            total_folders, total_files = result.root.count_items()
            result.total_folders = total_folders
            result.total_files = total_files

        return result
