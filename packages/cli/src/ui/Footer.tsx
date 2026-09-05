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
      justifyContent="space-between"
      marginTop={0}
      width="100%"
    >
      {currentScreen === 'list' ? (
        <Box>
          <Text color="cyanBright" bold>
            {'[↑/↓ / j/k] '}
          </Text>
          <Text color="gray">{'Navigate  '}</Text>

          <Text color="cyanBright" bold>
            {'[Enter] '}
          </Text>
          <Text color="white" bold>{'View Turns  '}</Text>

          <Text color="cyanBright" bold>
            {'[1-5] '}
          </Text>
          <Text color="gray">{'Date Filter  '}</Text>

          <Text color="cyanBright" bold>
            {'[a] '}
          </Text>
          <Text color="gray">{'Toggle Scope  '}</Text>

          <Text color="cyanBright" bold>
            {'[o] '}
          </Text>
          <Text color="gray">{'Open in Editor  '}</Text>

          <Text color="cyanBright" bold>
            {'[q] '}
          </Text>
          <Text color="gray">{'Quit'}</Text>
        </Box>
      ) : (
        <Box>
          <Text color="cyanBright" bold>
            {'[↑/↓ / PgUp/PgDn] '}
          </Text>
          <Text color="gray">{'Scroll Turns  '}</Text>

          <Text color="greenBright" bold>
            {'[Enter / o] '}
          </Text>
          <Text color="white" bold>{'Open Full Response in Editor  '}</Text>

          <Text color="cyanBright" bold>
            {'[b / Esc] '}
          </Text>
          <Text color="yellowBright" bold>{'Back to Sessions  '}</Text>

          <Text color="cyanBright" bold>
            {'[q] '}
          </Text>
          <Text color="gray">{'Quit'}</Text>
        </Box>
      )}
    </Box>
  );
};
