import React from 'react';
import { Box, Text } from 'ink';
import { SessionUsageTotals } from '@hotui/core';

interface UsageStatsProps {
  totals: SessionUsageTotals;
}

export const UsageStats: React.FC<UsageStatsProps> = ({ totals }) => {
  const parts = [
    `input ${totals.inputTokens}`,
    `output ${totals.outputTokens}`,
    `turns ${totals.turns}`,
  ];
  if (totals.cost != null) {
    parts.push(`cost ${totals.cost.toFixed(4)}`);
  }

  return (
    <Box paddingX={1}>
      <Text dimColor>Session usage: {parts.join(' | ')}</Text>
    </Box>
  );
};
