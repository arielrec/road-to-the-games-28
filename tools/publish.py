#!/usr/bin/env python3
"""
Update the data from the spreadsheet and publish it, in one command.

    npm run publish

It runs the same update as `npm run update` — regenerate, diff, audit — then shows you
what changed and asks before doing anything irreversible. Answer yes and it commits and
pushes; GitHub Actions rebuilds the site and it is live a couple of minutes later.

The confirmation is the point. An edit that was meant to add three events and instead
removed four hundred is the failure worth catching, and the moment to catch it is between
"here is what changed" and "this is now the public site".

If you would rather not use the terminal at all, you do not have to: replace the .xlsx
through GitHub's website and the same pipeline runs by itself. See DEPLOY.md.
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def git(*args, **kw):
    return subprocess.run(['git'] + list(args), cwd=ROOT, **kw)


def git_out(*args):
    r = subprocess.run(['git'] + list(args), cwd=ROOT, capture_output=True, text=True)
    return r.stdout.strip()


def main():
    if not os.path.isdir(os.path.join(ROOT, '.git')):
        sys.exit('This folder is not a git repository yet — see DEPLOY.md, step 1.')

    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'update.py')] + sys.argv[1:])
    if r.returncode != 0:
        sys.exit('\nThe update failed, so nothing was published.')

    changed = git_out('status', '--porcelain')
    if not changed:
        print('\nNothing changed — the live site is already up to date.')
        return

    print('\n' + '=' * 72)
    print('4. Ready to publish')
    print('=' * 72)
    print(git_out('status', '--short'))

    if not git_out('remote'):
        print('\nNo remote is configured, so there is nowhere to push yet.')
        print('See DEPLOY.md, step 1 — it is one command.')
        return

    try:
        answer = input('\nPublish these changes to the live site? [y/N] ').strip().lower()
    except EOFError:
        answer = ''
    if answer not in ('y', 'yes'):
        print('Nothing published. Your local changes are still here.')
        return

    count = len([l for l in changed.splitlines() if l])
    git('add', '-A')
    git('commit', '-m', f'Update tournament data ({count} file(s) changed)')
    push = git('push')
    if push.returncode != 0:
        sys.exit('\nThe push failed — see the error above. Nothing is live yet.')

    repo = git_out('remote', 'get-url', 'origin')
    slug = repo.replace('git@github.com:', '').replace('https://github.com/', '').removesuffix('.git')
    print('\nPushed. The site rebuilds itself now — it usually takes two to three minutes.')
    print(f'Watch it: https://github.com/{slug}/actions')


if __name__ == '__main__':
    main()
