import React from 'react';
import { Box, Text } from 'ink';
import { SessionMetadata } from '@prompttracker/core';

interface SessionListProps {
  sessions: SessionMetadata[];
  selectedIndex: number;
  maxVisible?: number;
}

export function getToolBadge(tool: string): { label: string; color: string } {
  const t = (tool || '').toLowerCase();
  if (t.includes('antigravity')) return { label: 'ANTIGRAVITY', color: 'magentaBright' };
  if (t.includes('opencode')) return { label: 'OPENCODE   ', color: 'greenBright' };
  if (t.includes('claude')) return { label: 'CLAUDE CODE', color: 'yellowBright' };
  if (t.includes('gemini')) return { label: 'GEMINI CLI ', color: 'blueBright' };
  return { label: tool.slice(0, 11).toUpperCase().padEnd(11), color: 'cyan' };
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedIndex,
  maxVisible = 10,
}) => {
  if (sessions.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="gray"
        paddingX={2}
        paddingY={2}
        width="100%"
      >
        <Text color="yellow" bold>
          No sessions found for this project & date filter.
        </Text>
        <Box marginTop={1}>
          <Text color="gray" italic>
            Try pressing [5] for All Time or [a] to switch to All Projects.
          </Text>
        </Box>
      </Box>
    );
  }

  // Smooth sliding window
  const half = Math.floor(maxVisible / 2);
  let startIndex = Math.max(0, selectedIndex - half);
  let endIndex = startIndex + maxVisible;

  if (endIndex > sessions.length) {
    endIndex = sessions.length;
    startIndex = Math.max(0, endIndex - maxVisible);
  }

  const visibleSessions = sessions.slice(startIndex, endIndex);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyanBright"
      paddingX={1}
      width="100%"
    >
      <Box justifyContent="space-between" marginBottom={0}>
        <Text bold color="cyanBright">
          {`📋 SESSIONS LIST (${selectedIndex + 1} of ${sessions.length})`}
        </Text>
        <Text color="gray">
          {'Press [Enter] to open conversation turns • [o] Open in IDE'}
        </Text>
      </Box>

      {visibleSessions.map((session, relIndex) => {
        const absIndex = startIndex + relIndex;
        const isSelected = absIndex === selectedIndex;
        const badge = getToolBadge(session.toolSource);
        const datePart = session.date || 'Unknown';

        // Clean prompt summary
        const promptSummary = (session.projectName || 'Session').replace(/[\r\n]+/g, ' ');
        const pathPart = session.projectPath ? ` [${session.projectPath.split(/[\\/]/).pop()}]` : '';
        const fullTitle = `${promptSummary}${pathPart}`;
        const truncatedSummary =
          fullTitle.length > 50 ? fullTitle.slice(0, 47) + '...' : fullTitle;

        const isEst = session.totalTokens.isEstimated;
        const tokenPrefix = isEst ? 'Est. ' : '';
        const tokenText = `${tokenPrefix}${session.totalTokens.total.toLocaleString()} tok`;
        const costText = `$${session.estimatedCostUsd.toFixed(4)}`;

        return (
          <Box
            key={session.id || `${session.timestamp}-${absIndex}`}
            justifyContent="space-between"
            width="100%"
          >
            <Box flexShrink={1} flexGrow={1} marginRight={1}>
              <Text color={isSelected ? 'cyanBright' : 'gray'} bold={isSelected} wrap="truncate">
                {isSelected ? '▶ ' : '  '}
              </Text>
              <Text color={isSelected ? 'white' : 'gray'} bold={isSelected} wrap="truncate">
                {datePart}{' '}
              </Text>
              <Text color="gray">{'│ '}</Text>
              <Text color={badge.color as any} bold wrap="truncate">
                {`[${badge.label}] `}
              </Text>
              <Text color="gray">{'│ '}</Text>
              <Text color={isSelected ? 'yellowBright' : 'white'} bold={isSelected} wrap="truncate">
                {truncatedSummary}
              </Text>
            </Box>
            <Box flexShrink={0}>
              <Text color="gray">{'│ '}</Text>
              <Text color={isSelected ? 'cyanBright' : 'gray'} bold={isSelected}>
                {tokenText.padStart(14)}{' '}
              </Text>
              <Text color="gray">{'│ '}</Text>
              <Text color={isSelected ? 'greenBright' : 'gray'} bold={isSelected}>
                {costText.padStart(9)}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
