import * as path from 'path';
import { NormalizedSession } from '@prompttracker/core';

function normalizedPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function filterSessionsByScope<T extends Pick<NormalizedSession, 'projectPath' | 'projectName'>>(
  sessions: T[],
  options: { all?: boolean; project?: string },
  cwd: string = process.cwd()
): { sessions: T[]; scopeLabel: string } {
  if (options.project) {
    const query = options.project.toLowerCase();
    return {
      sessions: sessions.filter(session =>
        (session.projectPath?.toLowerCase().includes(query) ?? false) ||
        session.projectName.toLowerCase().includes(query)
      ),
      scopeLabel: `Project: ${options.project}`
    };
  }

  if (options.all) {
    return { sessions, scopeLabel: 'All Projects' };
  }

  const currentDirectory = normalizedPath(cwd);
  const currentName = path.basename(currentDirectory);
  const parentDirectory = normalizedPath(path.resolve(currentDirectory, '..'));
  const parentName = path.basename(parentDirectory);
  const useParentScope = ['cli', 'prototype', 'packages'].includes(currentName.toLowerCase());
  const scopeDirectory = useParentScope ? parentDirectory : currentDirectory;
  const matched = sessions.filter(session => {
    if (!session.projectPath) return false;
    const projectPath = normalizedPath(session.projectPath).toLowerCase();
    const scope = scopeDirectory.toLowerCase();

    return (
      projectPath === scope ||
      projectPath.startsWith(`${scope}/`) ||
      scope.startsWith(`${projectPath}/`)
    );
  });

  if (matched.length === 0) {
    return { sessions, scopeLabel: 'All Projects (Global)' };
  }

  const displayName = useParentScope ? parentName : currentName;
  return { sessions: matched, scopeLabel: `Project: ${displayName}` };
}
