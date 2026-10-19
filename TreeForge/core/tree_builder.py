"""Pure Python tree builder for TreeForge.

Builds physical directories and files from a parsed TreeNode hierarchy with
starter content generation, __init__.py generation, and dry-run execution.
"""

from pathlib import Path
from typing import Optional, Callable, List, Tuple
from .models import TreeNode, ItemPolicy, BuildStats
from .file_writer import FileWriter, get_unique_filename


STARTER_TEMPLATES = {
    ".py": '"""Module documentation."""\n\n\ndef main() -> None:\n    """Main entry point."""\n    pass\n\n\nif __name__ == "__main__":\n    main()\n',
    ".md": '# {project_name}\n\nProject overview, installation, and usage instructions.\n\n## Getting Started\n\n```bash\npip install -r requirements.txt\npython main.py\n```\n',
    ".gitignore": '__pycache__/\n*.py[cod]\n*$py.class\n*.so\n.Python\nbuild/\ndevelop-eggs/\ndist/\ndownloads/\neggs/\n.eggs/\nlib/\nlib64/\nparts/\nsdist/\nvar/\nwheels/\n*.egg-info/\n.installed.cfg\n*.egg\n\n# Environments\n.env\n.venv\nenv/\nvirtualenv/\n\n# IDE\n.vscode/\n.idea/\n*.swp\n*.bak\n',
    ".json": '{\n  "version": "1.0.0"\n}\n',
    ".toml": '[tool]\nname = "{project_name}"\nversion = "0.1.0"\n',
    ".txt": '# {project_name} notes\n',
}


def folder_contains_python(node: TreeNode) -> bool:
    """Check recursively if this directory contains any .py files."""
    for child in node.children:
        if not child.is_dir and child.name.endswith(".py"):
            return True
        if child.is_dir and folder_contains_python(child):
            return True
    return False


class TreeBuilder:
    """Constructs physical folder and file structure on disk from TreeNode tree."""

    def __init__(
        self,
        policy: ItemPolicy = ItemPolicy.SKIP,
        add_init_py: bool = True,
        create_starter_content: bool = True,
        dry_run: bool = False
    ):
        self.policy = policy
        self.add_init_py = add_init_py
        self.create_starter_content = create_starter_content
        self.dry_run = dry_run
        self.writer = FileWriter(policy=policy, create_backups=True)

    def build(
        self,
        root_node: TreeNode,
        destination_dir: Path,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
        cancel_check: Optional[Callable[[], bool]] = None
    ) -> BuildStats:
        """Create directory and file hierarchy on disk.
        
        Returns BuildStats detailing created, skipped, and failed paths.
        """
        stats = BuildStats()
        destination_dir = destination_dir.resolve()

        # Collect all enabled nodes
        all_enabled: List[TreeNode] = []

        def collect(n: TreeNode) -> None:
            if n.enabled:
                all_enabled.append(n)
                for c in n.children:
                    collect(c)

        collect(root_node)
        total_items = len(all_enabled)

        for index, node in enumerate(all_enabled, start=1):
            if cancel_check and cancel_check():
                break

            target_path = destination_dir / node.relative_path

            # Guard against path escaping destination_dir
            try:
                target_path.resolve().relative_to(destination_dir)
            except ValueError:
                stats.failed_items.append((node.relative_path, "Path escape detected outside destination directory"))
                continue

            if progress_callback:
                progress_callback(index, total_items, node.relative_path)

            if node.is_dir:
                if self.dry_run:
                    stats.created_folders.append(node.relative_path)
                    continue

                try:
                    if target_path.exists():
                        stats.skipped_items.append(f"{node.relative_path} (folder already exists)")
                    else:
                        target_path.mkdir(parents=True, exist_ok=True)
                        stats.created_folders.append(node.relative_path)

                    # Auto add __init__.py if this is a python package
                    if self.add_init_py and folder_contains_python(node):
                        init_file = target_path / "__init__.py"
                        if not init_file.exists():
                            init_file.write_text('"""Package initialization."""\n', encoding="utf-8")
                            stats.created_files.append(f"{node.relative_path}/__init__.py")

                except Exception as e:
                    stats.failed_items.append((node.relative_path, str(e)))

            else:
                # File creation
                content_to_write = node.content if node.content is not None else ""
                
                # Check for starter template
                if not content_to_write and self.create_starter_content:
                    suffix = target_path.suffix.lower()
                    template = STARTER_TEMPLATES.get(suffix, "")
                    if template:
                        content_to_write = template.replace("{project_name}", root_node.name)
                    elif node.name == "requirements.txt":
                        content_to_write = "# Project dependencies\n"

                if self.dry_run:
                    if target_path.exists() and self.policy == ItemPolicy.SKIP:
                        stats.skipped_items.append(node.relative_path)
                    else:
                        stats.created_files.append(node.relative_path)
                    continue

                # Ensure parent folder exists
                try:
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    success, msg, final_path = self.writer.write_file(target_path, content_to_write)
                    if success:
                        stats.created_files.append(str(final_path.relative_to(destination_dir)))
                    else:
                        if "skipped" in msg.lower():
                            stats.skipped_items.append(node.relative_path)
                        else:
                            stats.failed_items.append((node.relative_path, msg))
                except Exception as e:
                    stats.failed_items.append((node.relative_path, str(e)))

        return stats
