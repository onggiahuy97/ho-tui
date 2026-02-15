import React from 'react';
import { Box, Text } from 'ink';
import { TranscriptEntry } from '../state';

interface TranscriptProps {
  entries: TranscriptEntry[];
}

export const Transcript: React.FC<TranscriptProps> = ({ entries }) => {
  return (
    <Box flexDirection="column" paddingX={1}>
      {entries.map((entry, index) => (
        <Box key={index} marginBottom={1}>
          {entry.role === 'user' && (
            <Text>
              <Text bold color="blue">You: </Text>
              {entry.content}
            </Text>
          )}
          {entry.role === 'assistant' && (
            <Text>
              <Text bold color="green">Assistant: </Text>
              {entry.content}
            </Text>
          )}
          {entry.role === 'error' && (
            <Text color="red">
              <Text bold>Error: </Text>
              {entry.content}
            </Text>
          )}
          {entry.role === 'system' && (
            <Text color="magenta" dimColor>
              <Text bold>⚙ </Text>
              {entry.content}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
};
