import { useState, useEffect } from 'react';

export const usePrinting = () => {
  const [printData, setPrintData] = useState(null);
  const [printMode, setPrintMode] = useState('EO');
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  const triggerLocalPrint = (data, mode = 'EO') => {
    setIsPreparingPrint(true);
    setPrintData(data);
    setPrintMode(mode);
  };

  useEffect(() => {
    if (isPreparingPrint && printData) {
      const handleAfterPrint = () => {
        setPrintData(null);
        setIsPreparingPrint(false);
        
        // Cleanup iframe
        const existingFrame = document.getElementById('print-iframe');
        if (existingFrame) existingFrame.remove();
        
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
    }
  }, [isPreparingPrint, printData]);

  return {
    printData,
    printMode,
    isPreparingPrint,
    triggerLocalPrint
  };
};
