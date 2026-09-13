import React from 'react';
import { Box, Text } from 'ink';
import { PromptTurn, SessionMetadata } from '@prompttracker/core';
import { getToolBadge } from './SessionList.js';

interface SessionDetailProps {
  session: SessionMetadata;
  turns: PromptTurn[];
  scrollIndex: number;
  maxVisibleTurns?: number;
}

export function cleanSingleLine(text: string, maxLen = 120): string {
  if (!text) return '';
  const single = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (single.length <= maxLen) return single;
  return single.slice(0, maxLen) + '...';
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  turns,
  scrollIndex,
  maxVisibleTurns = 8,
}) => {
  const badge = getToolBadge(session.toolSource);
  const totalTurnsCount = turns.length;

  const startIndex = Math.min(scrollIndex, Math.max(0, totalTurnsCount - maxVisibleTurns));
  const visibleTurns = turns.slice(startIndex, startIndex + maxVisibleTurns);

  return (
    <Box flexDirection="column" width="100%">
      {/* Session Top Header Card */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="yellowBright"
        paddingX={1}
        paddingY={0}
        marginBottom={1}
        width="100%"
      >
        <Box justifyContent="space-between" width="100%">
          <Box>
            <Text bold color={badge.color as any}>
              {`[${session.toolSource.toUpperCase()}] `}
            </Text>
            <Text bold color="white">
              {session.projectName}
            </Text>
          </Box>
          <Box>
            <Text color="yellowBright" bold>
              {`Cost: $${session.estimatedCostUsd.toFixed(4)} `}
            </Text>
            <Text color="gray">{'│ '}</Text>
            <Text color="cyanBright" bold>
              {`${session.totalTokens.isEstimated ? 'Est. ' : ''}${session.totalTokens.total.toLocaleString()} tokens`}
            </Text>
          </Box>
        </Box>

        <Box justifyContent="space-between" width="100%" marginTop={0}>
          <Text color="gray">
            {`Model: `}
            <Text color="cyan">{session.model || 'Unknown'}</Text>
            {` │ Date: `}
            <Text color="white">{session.date}</Text>
            {` │ Turns: `}
            <Text color="greenBright" bold>{totalTurnsCount}</Text>
            {totalTurnsCount > maxVisibleTurns
              ? ` (Showing ${startIndex + 1}-${Math.min(startIndex + maxVisibleTurns, totalTurnsCount)})`
              : ''}
          </Text>
          <Text color="greenBright" bold>
            {'[Enter / o] Open in Editor'}
          </Text>
        </Box>
      </Box>

      {/* Conversation Turns Stream */}
      <Box flexDirection="column" width="100%">
        {turns.length === 0 ? (
          <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1}>
            <Text color="gray" italic>
              No turns captured for this session.
            </Text>
          </Box>
        ) : (
          visibleTurns.map((turn) => {
            const inTokens = turn.tokens?.input || 0;
            const outTokens = turn.tokens?.output || 0;
            const isEst = turn.tokens?.isEstimated;
            const tokenBadge = isEst
              ? `(Est. ${inTokens.toLocaleString()} in / Est. ${outTokens.toLocaleString()} out)`
              : `(${inTokens.toLocaleString()} in / ${outTokens.toLocaleString()} out)`;
            const responseText = cleanSingleLine(
              turn.assistantResponse || turn.assistantSummary || '',
              130
            );

            return (
              <Box
                key={turn.turnIndex}
                flexDirection="column"
                borderStyle="round"
                borderColor="gray"
                paddingX={1}
                paddingY={0}
                marginBottom={0}
                width="100%"
              >
                {/* User Prompt Row */}
                <Box justifyContent="space-between" width="100%">
                  <Box flexShrink={1} flexGrow={1} marginRight={1}>
                    <Text color="greenBright" bold wrap="truncate">
                      {`📑 [#${turn.turnIndex}] `}
                    </Text>
                    <Text color="white" wrap="truncate">
                      {cleanSingleLine(turn.userPrompt, 80)}
                    </Text>
                  </Box>
                  <Box flexShrink={0}>
                    <Text color={isEst ? 'yellow' : 'gray'} wrap="truncate">
                      {tokenBadge}
                    </Text>
                  </Box>
                </Box>

                {/* 1-Line Agent Response */}
                {responseText ? (
                  <Box marginTop={0} flexShrink={1} flexGrow={1}>
                    <Text color="magentaBright" bold wrap="truncate">
                      {'  ↳ 🤖 '}
                    </Text>
                    <Text color="gray" wrap="truncate">
                      {cleanSingleLine(responseText, 90)}
                    </Text>
                  </Box>
                ) : null}
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};
