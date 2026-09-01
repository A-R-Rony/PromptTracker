import React from 'react';
import { Box, Text } from 'ink';
import { NormalizedSession, PromptTurn } from '@prompttracker/core';
import { getToolBadge } from './SessionList.js';

interface SessionDetailProps {
  session: NormalizedSession | null;
  turns: PromptTurn[];
  isFocused: boolean;
  expandedTurns: Set<number>;
  scrollOffset: number;
}

export function formatPromptText(text: string, maxLen = 400): string {
  if (!text) return '(Empty prompt)';
  const cleaned = text.trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen) + '...';
}

export function formatResponseText(text: string, isExpanded: boolean): string {
  if (!text) return '(No response text captured)';
  const cleaned = text.trim();
  if (isExpanded) return cleaned;
  if (cleaned.length <= 250) return cleaned;
  return cleaned.slice(0, 250) + '... (Press [Space] to expand)';
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  session,
  turns,
  isFocused,
  expandedTurns,
}) => {
  if (!session) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        flexGrow={2}
      >
        <Text color="gray" italic>
          Select a session from the list on the left to inspect conversation turns.
        </Text>
      </Box>
    );
  }

  const badge = getToolBadge(session.toolSource);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isFocused ? 'cyanBright' : 'gray'}
      paddingX={1}
      flexGrow={2}
    >
      {/* Session Metadata Banner */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginBottom={1}
      >
        <Box justifyContent="space-between">
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
              {`$${session.estimatedCostUsd.toFixed(4)} `}
            </Text>
            <Text color="cyanBright">
              {`(${session.totalTokens.total.toLocaleString()} tokens)`}
            </Text>
          </Box>
        </Box>

        <Box justifyContent="space-between" marginTop={0}>
          <Text color="gray">
            {`Model: ${session.model || 'Unknown'} | Date: ${session.date} | Turns: ${turns.length}`}
          </Text>
          <Text color="gray">
            {session.projectPath ? `Path: .../${session.projectPath.split(/[\\/]/).slice(-2).join('/')}` : ''}
          </Text>
        </Box>
      </Box>

      {/* Turns Stream */}
      <Box flexDirection="column">
        {turns.length === 0 ? (
          <Text color="gray" italic>
            No turns recorded in this session.
          </Text>
        ) : (
          turns.slice(0, 8).map((turn, index) => {
            const isExpanded = expandedTurns.has(turn.turnIndex);
            const inputTokens = turn.tokens?.input || 0;
            const outputTokens = turn.tokens?.output || 0;

            return (
              <Box
                key={turn.turnIndex || index}
                flexDirection="column"
                marginBottom={1}
                borderStyle="single"
                borderColor="gray"
                paddingX={1}
              >
                {/* User Prompt */}
                <Box justifyContent="space-between">
                  <Text color="greenBright" bold>
                    {`📑 Turn #${turn.turnIndex} (${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out)`}
                  </Text>
                  <Text color="gray">
                    {isExpanded ? '[-]' : '[+]'}
                  </Text>
                </Box>
                <Text color="white">
                  {formatPromptText(turn.userPrompt, isExpanded ? 2000 : 300)}
                </Text>

                {/* Assistant Response */}
                {(turn.assistantSummary || turn.assistantResponse) && (
                  <Box flexDirection="column" marginTop={1}>
                    <Text color="magentaBright" bold>
                      {'🤖 Response:'}
                    </Text>
                    <Text color="gray">
                      {formatResponseText(
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
        {turns.length > 8 && (
          <Text color="yellow" italic>
            {`+ ${turns.length - 8} more turns. Press [o] to open full conversation in IDE.`}
          </Text>
        )}
      </Box>
    </Box>
  );
};
