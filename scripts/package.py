#!/usr/bin/env python3
"""Package the already built plugin using only the Python standard library."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'manifest.json').read_text())
version = manifest['version']
assert json.loads((root / 'package.json').read_text())['version'] == version
assert version in json.loads((root / 'versions.json').read_text())
dist = root / 'dist'
folder = dist / manifest['id']
folder.mkdir(parents=True, exist_ok=True)
files = ['main.js', 'manifest.json', 'styles.css']
for name in files:
    assert (root / name).stat().st_size > 0, f'Missing or empty {name}'
    shutil.copy2(root / name, folder / name)
archive = dist / f'{manifest["id"]}-{version}.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as out:
    for name in files:
        info = zipfile.ZipInfo(f'{manifest["id"]}/{name}', date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        out.writestr(info, (folder / name).read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
with zipfile.ZipFile(archive) as check:
    assert check.testzip() is None
    assert check.namelist() == [f'{manifest["id"]}/{name}' for name in files]
    for name in files:
        assert check.read(f'{manifest["id"]}/{name}') == (root / name).read_bytes()
entries = [archive] + [folder / name for name in files]
(dist / 'SHA256SUMS').write_text(''.join(
    f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(dist)}\n' for path in entries
))
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root, text=True).strip())
(dist / 'BUILD.json').write_text(json.dumps({'version': version, 'sourceCommit': commit, 'sourceDirty': dirty}, indent=2) + '\n')
print(f'Packaged {archive}; source {commit}, dirty={dirty}')
