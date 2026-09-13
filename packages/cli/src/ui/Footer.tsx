import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  currentScreen: 'list' | 'detail';
}

export const Footer: React.FC<FooterProps> = ({ currentScreen }) => {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      paddingY={0}
      justifyContent="space-between"
      marginTop={0}
      width="100%"
    >
      {currentScreen === 'list' ? (
        <Box flexShrink={1} flexGrow={1}>
          <Text wrap="truncate">
            <Text color="cyanBright" bold>{'[↑/↓]'}</Text>
            <Text color="gray">{' Nav  '}</Text>
            <Text color="cyanBright" bold>{'[Enter]'}</Text>
            <Text color="white" bold>{' Turns  '}</Text>
            <Text color="cyanBright" bold>{'[1-5]'}</Text>
            <Text color="gray">{' Date  '}</Text>
            <Text color="cyanBright" bold>{'[a]'}</Text>
            <Text color="gray">{' Scope  '}</Text>
            <Text color="cyanBright" bold>{'[o]'}</Text>
            <Text color="gray">{' Editor  '}</Text>
            <Text color="cyanBright" bold>{'[q]'}</Text>
            <Text color="gray">{' Quit'}</Text>
          </Text>
        </Box>
      ) : (
        <Box flexShrink={1} flexGrow={1}>
          <Text wrap="truncate">
            <Text color="cyanBright" bold>{'[↑/↓ / PgUp/Dn]'}</Text>
            <Text color="gray">{' Scroll  '}</Text>
            <Text color="greenBright" bold>{'[Enter/o]'}</Text>
            <Text color="white" bold>{' Editor  '}</Text>
            <Text color="cyanBright" bold>{'[b/Esc]'}</Text>
            <Text color="yellowBright" bold>{' Back  '}</Text>
            <Text color="cyanBright" bold>{'[q]'}</Text>
            <Text color="gray">{' Quit'}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};
