import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  projectName: string;
  isAllProjects: boolean;
  datePreset: string;
  dateLabel: string;
  totalPrompts: number;
  totalTokens: number;
  totalCost: number;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  isAllProjects,
  datePreset,
  totalPrompts,
  totalTokens,
  totalCost,
}) => {
  const presets = [
    { key: '1', label: 'Today', value: 'today' },
    { key: '2', label: 'Yesterday', value: 'yesterday' },
    { key: '3', label: '7D', value: '7d' },
    { key: '4', label: '30D', value: '30d' },
    { key: '5', label: 'All', value: 'all' },
  ];

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
      marginBottom={0}
      width="100%"
    >
      {/* Scope and Presets Row */}
      <Box justifyContent="space-between" width="100%">
        <Box flexShrink={1} flexGrow={1} marginRight={1}>
          <Text wrap="truncate">
            <Text bold color="cyanBright">
              {'🔍 PROMPT-LENS'}
            </Text>
            <Text color="gray">{' │ '}</Text>
            <Text color="white" bold>
              {'Scope: '}
            </Text>
            <Text color={isAllProjects ? 'yellowBright' : 'greenBright'} bold>
              {projectName}
            </Text>
            <Text color="gray">{' [a]'}</Text>
          </Text>
        </Box>

        {/* Date Filter Pills */}
        <Box flexShrink={0}>
          {presets.map((p) => {
            const isActive = datePreset === p.value;
            return (
              <Box key={p.value} marginLeft={1}>
                <Text
                  color={isActive ? 'black' : 'cyan'}
                  backgroundColor={isActive ? 'cyanBright' : undefined}
                  bold={isActive}
                  wrap="truncate"
                >
                  {`[${p.key}] ${p.label}`}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Aggregate Metrics Bar */}
      <Box marginTop={0} width="100%">
        <Box flexShrink={1} flexGrow={1}>
          <Text color="white" wrap="truncate">
            {'Prompts: '}
            <Text color="greenBright" bold>{totalPrompts.toLocaleString()}</Text>
            <Text color="gray">{' │ '}</Text>
            {'Est. Tokens: '}
            <Text color="cyanBright" bold>{totalTokens.toLocaleString()}</Text>
            <Text color="gray">{' │ '}</Text>
            {'Est. Cost: '}
            <Text color="yellowBright" bold>{'$' + totalCost.toFixed(4)}</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
