import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

interface HeaderProps {
  projectName: string;
  dateLabel: string;
  totalPrompts: number;
  totalTokens: number;
  totalCost: number;
  memoryUsageMb: string;
  isScanning?: boolean;
  activeFilterCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  dateLabel,
  totalPrompts,
  totalTokens,
  totalCost,
  memoryUsageMb,
  isScanning = false,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
      marginBottom={0}
    >
      {/* Title & Scope Row */}
      <Box justifyContent="space-between" width="100%">
        <Box>
          <Text bold color="cyan">
            {'🔍 PROMPT-LENS'}
          </Text>
          <Text color="gray">{' | '}</Text>
          <Text bold color="white">
            {'Project: '}
          </Text>
          <Text color="yellowBright" bold>
            {projectName}
          </Text>
          <Text color="gray">{' | '}</Text>
          <Text bold color="magentaBright">
            {`📅 ${dateLabel}`}
          </Text>
        </Box>
        <Box>
          {isScanning ? (
            <Text color="yellow" bold>
              {'⏳ Scanning logs...'}
            </Text>
          ) : (
            <Text color="gray">
              {'RAM: ' + memoryUsageMb + '/50MB'}
            </Text>
          )}
        </Box>
      </Box>

      {/* Metrics Row */}
      <Box marginTop={0} justifyContent="flex-start">
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
  );
};
