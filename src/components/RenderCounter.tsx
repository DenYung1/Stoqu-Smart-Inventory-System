import React, { useEffect, useRef } from 'react';

interface RenderCounterProps {
  name: string;
}

const RenderCounter: React.FC<RenderCounterProps> = ({ name }) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    console.log(`${name} rendered ${renderCount.current} times`);
  });

  return (
    <div className="fixed bottom-4 left-4 bg-red-500 text-white p-2 rounded text-xs">
      {name}: {renderCount.current}
    </div>
  );
};

export default RenderCounter;
