import React from 'react';
import { Box, Text } from 'ink';
import { NormalizedSession, PromptTurn } from '@prompttracker/core';
import { getToolBadge } from './SessionList.js';

interface SessionDetailProps {
  session: NormalizedSession;
  turns: PromptTurn[];
  scrollIndex: number;
  expandedTurns: Set<number>;
  maxVisibleTurns?: number;
}

export function cleanPromptText(text: string, isExpanded: boolean): string {
  if (!text) return '(Empty user prompt)';
  const trimmed = text.trim();
  if (isExpanded || trimmed.length <= 450) return trimmed;
  return trimmed.slice(0, 450) + '\n... [Press Space to expand full prompt]';
}

export function cleanResponseText(text: string, isExpanded: boolean): string {
  if (!text) return '(No response text captured)';
  const trimmed = text.trim();
  if (isExpanded || trimmed.length <= 500) return trimmed;
  return trimmed.slice(0, 500) + '\n... [Press Space to expand full response]';
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  turns,
  scrollIndex,
  expandedTurns,
  maxVisibleTurns = 4,
}) => {
  const badge = getToolBadge(session.toolSource);
  const totalTurnsCount = turns.length;

  // Windowed turns for vertical pager
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
              {`${session.totalTokens.total.toLocaleString()} tokens`}
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
            {` (Showing ${startIndex + 1}-${Math.min(startIndex + maxVisibleTurns, totalTurnsCount)})`}
          </Text>
          <Text color="gray">
            {session.projectPath ? `Dir: .../${session.projectPath.split(/[\\/]/).slice(-2).join('/')}` : ''}
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
            const isExpanded = expandedTurns.has(turn.turnIndex);
            const inTokens = turn.tokens?.input || 0;
            const outTokens = turn.tokens?.output || 0;

            return (
              <Box
                key={turn.turnIndex}
                flexDirection="column"
                borderStyle="round"
                borderColor="gray"
                paddingX={1}
                paddingY={0}
                marginBottom={1}
                width="100%"
              >
                {/* Turn Header */}
                <Box justifyContent="space-between" width="100%">
                  <Box>
                    <Text color="greenBright" bold>
                      {`📑 [Turn #${turn.turnIndex}] `}
                    </Text>
                    <Text color="gray">
                      {`(${inTokens.toLocaleString()} in / ${outTokens.toLocaleString()} out)`}
                    </Text>
                  </Box>
                  <Text color="cyan">
                    {isExpanded ? '[-] Full View' : '[+] Compact View'}
                  </Text>
                </Box>

                {/* User Prompt */}
                <Box marginTop={0} flexDirection="column">
                  <Text color="white">
                    {cleanPromptText(turn.userPrompt, isExpanded)}
                  </Text>
                </Box>

                {/* Tool Calls Chips (if any) */}
                {turn.toolCalls && turn.toolCalls.length > 0 && (
                  <Box marginTop={1} flexDirection="row" flexWrap="wrap">
                    <Text color="gray">{'🛠️ Tools: '}</Text>
                    {turn.toolCalls.slice(0, isExpanded ? 10 : 3).map((tool, idx) => (
                      <Box key={idx} marginRight={1}>
                        <Text color="magenta">
                          {`[${tool.name}${tool.args?.TargetFile ? ': ' + tool.args.TargetFile.split(/[\\/]/).pop() : ''}]`}
                        </Text>
                      </Box>
                    ))}
                    {turn.toolCalls.length > 3 && !isExpanded && (
                      <Text color="gray">{`+${turn.toolCalls.length - 3} more`}</Text>
                    )}
                  </Box>
                )}

                {/* Assistant Response */}
                {(turn.assistantResponse || turn.assistantSummary) && (
                  <Box
                    marginTop={1}
                    flexDirection="column"
                    borderStyle="single"
                    borderColor="magenta"
                    paddingX={1}
                  >
                    <Text color="magentaBright" bold>
                      {'🤖 Assistant Response:'}
                    </Text>
                    <Text color="gray">
                      {cleanResponseText(
                        turn.assistantResponse || turn.assistantSummary || '',
                        isExpanded
                      )}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};
