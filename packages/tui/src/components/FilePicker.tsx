import React from 'react';
import { Box, Text } from 'ink';

interface FilePickerProps {
  files: string[];
  selectedIndex: number;
  filter: string;
}

const MAX_VISIBLE = 8;

export const FilePicker: React.FC<FilePickerProps> = ({ files, selectedIndex, filter }) => {
  if (files.length === 0) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
        <Text color="gray">No files matching &quot;{filter}&quot;</Text>
      </Box>
    );
  }

  const visible = files.slice(0, MAX_VISIBLE);

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
      <Text bold color="cyan">
        Files {filter ? `matching "${filter}"` : ''}
      </Text>
      {visible.map((file, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={file}>
            <Text
              color={isSelected ? 'black' : 'white'}
              backgroundColor={isSelected ? 'cyan' : undefined}
            >
              {isSelected ? ' ▸ ' : '   '}
              {file}
            </Text>
          </Box>
        );
      })}
      <Text color="gray" dimColor>
        ↑↓ navigate · Enter select · Esc cancel
      </Text>
    </Box>
  );
};
