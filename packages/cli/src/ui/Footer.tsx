import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  isSearchActive: boolean;
  searchQuery: string;
  isDetailsFocused: boolean;
  isFullscreen: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  isSearchActive,
  searchQuery,
  isDetailsFocused,
  isFullscreen,
}) => {
  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
      marginTop={0}
    >
      <Box>
        <Text color="cyanBright" bold>
          {'[↑/↓] '}
        </Text>
        <Text color="gray">{'Navigate  '}</Text>

        <Text color="cyanBright" bold>
          {'[Tab] '}
        </Text>
        <Text color="gray">{'Switch Pane  '}</Text>

        <Text color="cyanBright" bold>
          {'[/] '}
        </Text>
        <Text color="gray">{'Search  '}</Text>

        <Text color="cyanBright" bold>
          {'[d] '}
        </Text>
        <Text color="gray">{'Date Filter  '}</Text>

        <Text color="cyanBright" bold>
          {'[Space] '}
        </Text>
        <Text color="gray">{'Expand Turn  '}</Text>

        <Text color="cyanBright" bold>
          {'[o] '}
        </Text>
        <Text color="gray">{'Open in IDE  '}</Text>

        <Text color="cyanBright" bold>
          {'[q] '}
        </Text>
        <Text color="gray">{'Quit'}</Text>
      </Box>
    </Box>
  );
};
