import { useState, useCallback } from 'react';

export const useConfirm = () => {
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const confirm = useCallback((title, message, onConfirm) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  return { confirmConfig, confirm, closeConfirm };
};
