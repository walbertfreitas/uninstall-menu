#!/usr/bin/python3 -I
# Desinstalar pelo menu — descobre como um app foi instalado e o remove (GPL-3.0-or-later)
#
#   helper.py info <arquivo .desktop>    → JSON com o tipo de instalação e o que será removido
#   helper.py remove <arquivo .desktop>  → remove (o apt e o Flatpak do sistema pedem a senha pelo polkit)
#
# Só usa "apt-get remove" (nunca --autoremove): dependências que sobrarem continuam instaladas.

import json
import os
import subprocess
import sys
from configparser import ConfigParser

APPIMAGE_ACTION = 'AppImageLauncher-Remove-AppImage'


def run(*args):
    res = subprocess.run(args, capture_output=True, text=True, env={**os.environ, 'LC_ALL': 'C'})
    return res.returncode, res.stdout, res.stderr


def desktop_entry(path):
    parser = ConfigParser(interpolation=None, strict=False)
    parser.optionxform = str
    parser.read(path, encoding='utf-8')
    return parser['Desktop Entry'] if parser.has_section('Desktop Entry') else {}


def info(path):
    entry = desktop_entry(path)
    if '/flatpak/exports/' in path and entry.get('X-Flatpak'):
        system = not path.startswith(os.path.expanduser('~'))
        return {'kind': 'flatpak', 'id': entry['X-Flatpak'], 'installation': 'system' if system else 'user'}
    if APPIMAGE_ACTION in entry.get('Actions', '').split(';'):
        return {'kind': 'appimage', 'action': APPIMAGE_ACTION}
    code, out, _ = run('dpkg-query', '-S', os.path.realpath(path))
    if code != 0:
        return {'kind': 'unknown'}
    # "pacote1, pacote2: /usr/share/applications/x.desktop" (ignora linhas de "diversion")
    owners = [line.rsplit(': ', 1)[0] for line in out.splitlines() if not line.startswith('diversion')]
    package = owners[0].split(', ')[0] if owners else None
    if not package:
        return {'kind': 'unknown'}
    _, fields, _ = run('dpkg-query', '-W', '-f=${Essential} ${Priority}', package)
    essential, _, priority = fields.partition(' ')
    blocked = essential == 'yes' or priority in ('required', 'important')
    code, out, err = run('apt-get', '-s', 'remove', package)
    removes = [line.split()[1].split(':')[0] for line in out.splitlines() if line.startswith('Remv ')]
    if code != 0:
        return {'kind': 'deb', 'package': package, 'removes': [], 'blocked': True,
                'reason': (err.strip().splitlines() or ['o apt recusou a remoção'])[-1]}
    # levar junto o metapacote da área de trabalho (zorin-os-desktop, ubuntu-desktop…) desmonta o sistema
    system_parts = [p for p in removes if p != package and (p.endswith('-desktop') or p.startswith('zorin-os'))]
    reason = None
    if blocked:
        reason = 'pacote essencial do sistema'
    elif system_parts:
        blocked, reason = True, f"faz parte do sistema (removeria {', '.join(system_parts)})"
    return {'kind': 'deb', 'package': package, 'removes': removes, 'blocked': blocked, 'reason': reason}


def remove(path):
    details = info(path)
    if details['kind'] == 'flatpak':
        cmd = ['flatpak', 'uninstall', '-y', '--noninteractive', f"--{details['installation']}", details['id']]
    elif details['kind'] == 'deb' and not details['blocked']:
        cmd = ['pkexec', 'env', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', 'remove', '-y', details['package']]
    else:
        print('não sei remover este app', file=sys.stderr)
        return 1
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print((res.stderr.strip() or res.stdout.strip()).splitlines()[-1] if (res.stderr or res.stdout).strip()
              else f'falhou (código {res.returncode})', file=sys.stderr)
    return res.returncode


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in ('info', 'remove'):
        print(__doc__ or 'uso: helper.py info|remove <arquivo .desktop>', file=sys.stderr)
        return 2
    if sys.argv[1] == 'info':
        print(json.dumps(info(sys.argv[2])))
        return 0
    return remove(sys.argv[2])


if __name__ == '__main__':
    sys.exit(main())
