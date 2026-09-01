import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface DateFilterModalProps {
  currentPreset: string;
  onSelectPreset: (preset: 'today' | 'yesterday' | '7d' | '30d' | 'all') => void;
  onClose: () => void;
}

const PRESETS: { key: string; label: string; value: 'today' | 'yesterday' | '7d' | '30d' | 'all' }[] = [
  { key: '1', label: '⚡ 1. Today', value: 'today' },
  { key: '2', label: '⏮️ 2. Yesterday', value: 'yesterday' },
  { key: '3', label: '📊 3. Last 7 Days', value: '7d' },
  { key: '4', label: '🗓️ 4. Last 30 Days', value: '30d' },
  { key: '5', label: '🌐 5. All Time', value: 'all' },
];

export const DateFilterModal: React.FC<DateFilterModalProps> = ({
  onSelectPreset,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape || input.toLowerCase() === 'q') {
      onClose();
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : PRESETS.length - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => (prev < PRESETS.length - 1 ? prev + 1 : 0));
      return;
    }

    if (key.return) {
      onSelectPreset(PRESETS[selectedIndex].value);
      return;
    }

    // Direct key number shortcuts: 1-5
    const matched = PRESETS.find((p) => p.key === input);
    if (matched) {
      onSelectPreset(matched.value);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="magentaBright"
      paddingX={2}
      paddingY={1}
      width={46}
    >
      <Text bold color="magentaBright">
        📅 FILTER BY DATE PRESET
      </Text>
      <Text color="gray">Use ↑/↓ or 1-5 to select, Enter to apply, Esc to cancel:</Text>
      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        {PRESETS.map((preset, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={preset.value}>
              <Text color={isSelected ? 'magentaBright' : 'gray'} bold={isSelected}>
                {isSelected ? ' ▶ ' : '   '}
              </Text>
              <Text color={isSelected ? 'white' : 'gray'} bold={isSelected}>
                {preset.label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
