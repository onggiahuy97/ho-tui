import React from 'react';
import { Box, Text } from 'ink';
import { SlashCommand } from '../state';

interface SlashMenuProps {
  commands: SlashCommand[];
  selectedIndex: number;
  filter: string;
}

export const SlashMenu: React.FC<SlashMenuProps> = ({ commands, selectedIndex, filter }) => {
  if (commands.length === 0) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
        <Text color="gray">No commands matching &quot;/{filter}&quot;</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
      <Text bold color="cyan">Commands</Text>
      {commands.map((cmd, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text
              color={isSelected ? 'black' : 'white'}
              backgroundColor={isSelected ? 'cyan' : undefined}
            >
              {isSelected ? ' ▸ ' : '   '}
              {cmd.name}
            </Text>
            <Text color="gray"> — {cmd.description}</Text>
          </Box>
        );
      })}
      <Text color="gray" dimColor>
        ↑↓ navigate · Enter select · Esc cancel
      </Text>
    </Box>
  );
};
