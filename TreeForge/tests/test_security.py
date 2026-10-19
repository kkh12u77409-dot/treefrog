"""Regression tests for filesystem boundaries, transactions, CLI and parser parity."""
import ast
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from TreeForge.core.path_safety import safe_target, validate_relative_path
from TreeForge.core.file_writer import FileWriter, generate_standalone_installer
from TreeForge.core.tree_parser import TreeParser
from TreeForge.core.content_splitter import ContentSplitter

ROOT = Path(__file__).resolve().parents[2]


class TestSecurity(unittest.TestCase):
    def test_parser_parity(self):
        for fixture in json.loads((Path(__file__).parent / 'fixtures/parser-cases.json').read_text()):
            with self.subTest(fixture['name']):
                result = TreeParser().parse(fixture['text'])
                self.assertEqual(not result.errors, fixture['valid'])
                if fixture['valid']:
                    self.assertEqual([n.relative_path for n in result.root.get_all_files()], fixture['files'])

    def test_splitter_parity(self):
        for fixture in json.loads((Path(__file__).parent / 'fixtures/splitter-cases.json').read_text()):
            with self.subTest(fixture['name']):
                chunks = ContentSplitter().split(fixture['text'], fixture['candidates'])
                self.assertEqual(len(chunks), 1)
                self.assertEqual(chunks[0].match_status.value, fixture['status'])
                self.assertEqual(chunks[0].resolved_path, fixture['path'])
                self.assertEqual(chunks[0].content, fixture['content'])

    def test_paths_and_symlinks(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            project = base / 'project'
            project.mkdir()
            writer = FileWriter(destination_dir=project)
            for relative in ('../escape.py', '/escape.py', 'C:\\escape.py', 'NUL.txt', 'a//b', 'bad\0file'):
                with self.subTest(relative):
                    with self.assertRaises(ValueError):
                        validate_relative_path(relative)
            self.assertFalse(writer.write_file(project / '../escape.py', 'bad')[0])
            self.assertFalse((base / 'escape.py').exists())
            if os.name != 'nt':
                (project / 'link').symlink_to(base, target_is_directory=True)
                self.assertFalse(writer.write_file(project / 'link/escape.py', 'bad')[0])
                self.assertFalse((base / 'escape.py').exists())

    def test_undo_repeated_and_new_files(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            existing = base / 'a.txt'
            existing.write_bytes(b'original\r\n')
            writer = FileWriter(destination_dir=base)
            self.assertTrue(writer.write_file(existing, 'first')[0])
            self.assertTrue(writer.write_file(existing, 'second')[0])
            new = base / 'new.txt'
            self.assertTrue(writer.write_file(new, '')[0])
            count, errors = writer.undo_last_batch()
            self.assertEqual((count, errors), (2, []))
            self.assertEqual(existing.read_bytes(), b'original\r\n')
            self.assertFalse(new.exists())
            self.assertFalse(list(base.glob('.tmp_forge_*')))

    def test_installer_round_trip(self):
        files = {'main.py': 'print("مرحبا")\n', 'empty': ''}
        script = generate_standalone_installer(files, 'المشروع')
        ast.parse(script)
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([sys.executable, '-c', script], cwd=directory, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((Path(directory) / 'المشروع/main.py').read_text(), files['main.py'])
        with self.assertRaises(ValueError):
            generate_standalone_installer({'../escape.py': 'bad'})

    def test_cli_injection_and_failure_exit(self):
        with tempfile.TemporaryDirectory() as directory:
            command = [sys.executable, str(ROOT / 'TreeForge/main.py'), '--cli', 'App/\n└── main.py', '--out', directory]
            result = subprocess.run(command + ['--content', '### main.py\nprint(42)'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((Path(directory) / 'App/main.py').read_text(), 'print(42)')
            result = subprocess.run(command + ['--content', '### ../escape.py\nbad'], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((Path(directory).parent / 'escape.py').exists())
