import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

interface InputBoxProps {
  disabled: boolean;
  onSubmit: (value: string) => void;
  onInputChange?: (value: string) => void;
}

export const InputBox: React.FC<InputBoxProps> = ({ disabled, onSubmit, onInputChange }) => {
  const [input, setInput] = useState('');

  const updateInput = useCallback((newValue: string) => {
    setInput(newValue);
    onInputChange?.(newValue);
  }, [onInputChange]);

  useInput(useCallback((ch: string, key) => {
    if (disabled) {
      return;
    }

    if (key.return) {
      const trimmed = input.trim();
      if (trimmed) {
        onSubmit(trimmed);
        updateInput('');
      }
      return;
    }

    if (key.backspace || key.delete) {
      updateInput(input.slice(0, -1));
      return;
    }

    if (ch && !key.ctrl && !key.meta) {
      updateInput(input + ch);
    }
  }, [disabled, input, onSubmit, updateInput]));

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text bold color="cyan">&gt; </Text>
      <Text>{disabled ? '(waiting for response...)' : input}</Text>
      {!disabled && <Text color="gray">█</Text>}
    </Box>
  );
};
