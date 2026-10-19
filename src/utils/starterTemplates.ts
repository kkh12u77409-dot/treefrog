/** Small, stack-neutral scaffolding templates shared by ZIP and the export wizard. */
const TEMPLATES: Record<string, string> = {
  '.py': '"""Module documentation."""\n\ndef main() -> None:\n    pass\n\nif __name__ == "__main__":\n    main()\n',
  '.md': '# {projectName}\n\nProject overview, installation, and usage instructions.\n',
  '.gitignore': '__pycache__/\n*.py[cod]\n.env\n.venv/\nnode_modules/\ndist/\nbuild/\n*.bak\n',
  '.json': '{\n  "version": "1.0.0"\n}\n',
  '.toml': '[project]\nname = "{projectName}"\nversion = "0.1.0"\n',
  '.txt': '# {projectName} notes\n',
};
export function getStarterContent(filename: string, projectName: string): string {
  if (filename === 'requirements.txt') return '# Project dependencies\n';
  if (filename === '__init__.py') return '"""Package initialization."""\n';
  const extension = filename === '.gitignore' ? filename : '.' + filename.split('.').pop()?.toLowerCase();
  return (TEMPLATES[extension] || '').replaceAll('{projectName}', projectName);
}
