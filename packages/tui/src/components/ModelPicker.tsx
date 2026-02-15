import React from 'react';
import { Box, Text } from 'ink';
import { ModelOption } from '../state';

interface ModelPickerProps {
  models: ModelOption[];
  selectedIndex: number;
  currentProfile: string;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({ models, selectedIndex, currentProfile }) => {
  if (models.length === 0) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
        <Text color="gray">No models available</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
      <Text bold color="yellow">Select Model</Text>
      {models.map((m, i) => {
        const isSelected = i === selectedIndex;
        const isCurrent = m.profileName === currentProfile;
        return (
          <Box key={m.profileName}>
            <Text
              color={isSelected ? 'black' : isCurrent ? 'green' : 'white'}
              backgroundColor={isSelected ? 'yellow' : undefined}
            >
              {isSelected ? ' ▸ ' : '   '}
              {m.provider}/{m.model}
            </Text>
            {isCurrent && <Text color="green"> (active)</Text>}
            {m.description && !isCurrent && <Text color="gray"> — {m.description}</Text>}
          </Box>
        );
      })}
      <Text color="gray" dimColor>
        ↑↓ navigate · Enter select · Esc cancel
      </Text>
    </Box>
  );
};
