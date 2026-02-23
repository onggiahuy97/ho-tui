import React, { useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

interface InputBoxProps {
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export const InputBox: React.FC<InputBoxProps> = ({ disabled, value, onChange, onSubmit }) => {
  useInput(useCallback((ch: string, key) => {
    if (disabled) {
      return;
    }

    if (key.return) {
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit(trimmed);
        onChange('');
      }
      return;
    }

    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }

    if (ch && !key.ctrl && !key.meta) {
      onChange(value + ch);
    }
  }, [disabled, value, onChange, onSubmit]));

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text bold color="cyan">&gt; </Text>
      <Text>{disabled ? '(waiting for response...)' : value}</Text>
      {!disabled && <Text color="gray">█</Text>}
    </Box>
  );
};
