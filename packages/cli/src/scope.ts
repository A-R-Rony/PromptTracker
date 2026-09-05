import * as path from 'path';
import { NormalizedSession } from '@prompttracker/core';

function normalizedPath(value: string): string {
  return value.replace(/\\/g, '/');
}

export function filterSessionsByScope(
  rawSessions: NormalizedSession[],
  options: { all?: boolean; project?: string },
  cwd: string = process.cwd()
): { sessions: NormalizedSession[]; scopeLabel: string } {
  if (options.project) {
    const query = options.project.toLowerCase();
    return {
      sessions: rawSessions.filter(session =>
        (session.projectPath?.toLowerCase().includes(query) ?? false) ||
        session.projectName.toLowerCase().includes(query)
      ),
      scopeLabel: `Project: ${options.project}`
    };
  }

  if (options.all) {
    return { sessions: rawSessions, scopeLabel: 'All Projects' };
  }

  const currentDirectory = normalizedPath(cwd);
  const currentName = path.basename(currentDirectory);
  const parentDirectory = normalizedPath(path.resolve(currentDirectory, '..'));
  const parentName = path.basename(parentDirectory);
  const useParentScope = ['cli', 'prototype', 'packages'].includes(currentName.toLowerCase());
  const scopeDirectory = useParentScope ? parentDirectory : currentDirectory;
  const matched = rawSessions.filter(session => {
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
    return { sessions: rawSessions, scopeLabel: 'All Projects (Global)' };
  }

  const displayName = useParentScope ? parentName : currentName;
  return { sessions: matched, scopeLabel: `Project: ${displayName}` };
}
