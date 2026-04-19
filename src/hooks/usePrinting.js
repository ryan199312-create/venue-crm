import { useState, useEffect } from 'react';

export const usePrinting = () => {
  const [printData, setPrintData] = useState(null);
  const [printMode, setPrintMode] = useState('EO');
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  const triggerLocalPrint = (data, mode) => {
    setIsPreparingPrint(true);
    setPrintData(data);
    setPrintMode(mode);
  };

  useEffect(() => {
    if (isPreparingPrint && printData) {
      const handleAfterPrint = () => {
        setPrintData(null);
        setIsPreparingPrint(false);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);

      requestAnimationFrame(() => {
        setTimeout(() => window.print(), 50);
      });
    }
  }, [isPreparingPrint, printData]);

  return {
    printData,
    printMode,
    isPreparingPrint,
    triggerLocalPrint
  };
};
