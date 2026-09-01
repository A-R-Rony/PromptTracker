import React from 'react';
import { Box, Text } from 'ink';
import { NormalizedSession } from '@prompttracker/core';

interface SessionListProps {
  sessions: NormalizedSession[];
  selectedIndex: number;
  isFocused: boolean;
  maxVisible?: number;
}

export function getToolBadge(tool: string): { label: string; color: string } {
  const t = tool.toLowerCase();
  if (t.includes('antigravity')) return { label: 'AGY', color: 'magentaBright' };
  if (t.includes('opencode')) return { label: 'OPN', color: 'greenBright' };
  if (t.includes('claude')) return { label: 'CLD', color: 'yellowBright' };
  if (t.includes('gemini')) return { label: 'GEM', color: 'blueBright' };
  return { label: tool.slice(0, 3).toUpperCase(), color: 'cyan' };
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedIndex,
  isFocused,
  maxVisible = 12,
}) => {
  if (sessions.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={isFocused ? 'cyan' : 'gray'}
        paddingX={1}
        minHeight={10}
        flexGrow={1}
      >
        <Text color="gray" italic>
          No sessions found matching current filter or search.
        </Text>
      </Box>
    );
  }

  // Calculate windowed slice for smooth scrolling
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
      borderColor={isFocused ? 'cyanBright' : 'gray'}
      paddingX={1}
      flexGrow={1}
    >
      <Box justifyContent="space-between" marginBottom={0}>
        <Text bold color={isFocused ? 'cyanBright' : 'white'}>
          {`📋 SESSIONS (${selectedIndex + 1}/${sessions.length})`}
        </Text>
        <Text color="gray">{isFocused ? '[Focused]' : '[Press Tab]'}</Text>
      </Box>

      {visibleSessions.map((session, relIndex) => {
        const absIndex = startIndex + relIndex;
        const isSelected = absIndex === selectedIndex;
        const badge = getToolBadge(session.toolSource);
        const datePart = session.date || 'Unknown';
        
        // Clean prompt summary
        const promptSummary = (session.projectName || 'Session').replace(/[\r\n]+/g, ' ');
        const truncatedSummary =
          promptSummary.length > 26 ? promptSummary.slice(0, 24) + '..' : promptSummary.padEnd(26);

        const tokenText = `${session.totalTokens.total.toLocaleString()}t`;

        return (
          <Box key={session.id || `${session.timestamp}-${absIndex}`} justifyContent="space-between">
            <Box>
              <Text color={isSelected ? 'cyanBright' : 'gray'} bold={isSelected}>
                {isSelected ? '▶ ' : '  '}
              </Text>
              <Text color="gray">{datePart.slice(5)} </Text>
              <Text color={badge.color as any} bold>
                {`[${badge.label}] `}
              </Text>
              <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
                {truncatedSummary}{' '}
              </Text>
            </Box>
            <Box>
              <Text color={isSelected ? 'yellowBright' : 'gray'} bold={isSelected}>
                {tokenText}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
