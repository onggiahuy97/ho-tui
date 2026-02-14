import React from 'react';
import { Box, Text } from 'ink';
import { TuiState } from '../state';

interface StatusBarProps {
  state: TuiState;
}

export const StatusBar: React.FC<StatusBarProps> = ({ state }) => {
  const truncatedSession = state.sessionId.length > 12
    ? state.sessionId.slice(0, 12) + '...'
    : state.sessionId;

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text bold>
        {state.profileName}
      </Text>
      <Text> | {state.activeProvider}/{state.activeModel}</Text>
      <Text> | {truncatedSession}</Text>
      <Text> | </Text>
      {state.streaming ? (
        <Text color="yellow">streaming...</Text>
      ) : (
        <Text color="green">idle</Text>
      )}
    </Box>
  );
};
