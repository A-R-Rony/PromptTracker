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
        <Box>
          <Text bold color="cyanBright">
            {'🔍 PROMPT-LENS'}
          </Text>
          <Text color="gray">{' | '}</Text>
          <Text color="white" bold>
            {'Scope: '}
          </Text>
          <Text color={isAllProjects ? 'yellowBright' : 'greenBright'} bold>
            {projectName}
          </Text>
          <Text color="gray">{' [a: toggle scope]'}</Text>
        </Box>

        {/* Date Filter Pills */}
        <Box>
          <Text color="gray">{'Filters: '}</Text>
          {presets.map((p) => {
            const isActive = datePreset === p.value;
            return (
              <Box key={p.value} marginRight={1}>
                <Text
                  color={isActive ? 'black' : 'cyan'}
                  backgroundColor={isActive ? 'cyanBright' : undefined}
                  bold={isActive}
                >
                  {`[${p.key}] ${p.label}`}
                </Text>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Aggregate Metrics Bar */}
      <Box marginTop={0} justifyContent="space-between" width="100%">
        <Box>
          <Text color="gray">{'  USAGE: '}</Text>
          <Text color="white">{'Prompts: '}</Text>
          <Text color="greenBright" bold>
            {totalPrompts.toLocaleString()}
          </Text>
          <Text color="gray">{' │ '}</Text>
          <Text color="white">{'Tokens: '}</Text>
          <Text color="cyanBright" bold>
            {totalTokens.toLocaleString()}
          </Text>
          <Text color="gray">{' │ '}</Text>
          <Text color="white">{'Est. Cost: '}</Text>
          <Text color="yellowBright" bold>
            {'$' + totalCost.toFixed(4)}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
