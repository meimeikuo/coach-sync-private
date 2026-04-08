import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClose: () => void;
  title?: string;
}

export default function SignaturePad({ onSave, onClose, title = "請在下方簽名" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const checkOrientation = () => {
      setIsRotated(window.innerHeight > window.innerWidth);
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Use ResizeObserver to ensure canvas memory size perfectly matches its CSS size
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        
        // Only resize if dimensions changed to avoid clearing canvas unnecessarily
        if (canvas.width !== width * 2 || canvas.height !== height * 2) {
          // Save current drawing if any
          let tempCanvas: HTMLCanvasElement | null = null;
          if (canvas.width > 0 && canvas.height > 0) {
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) tempCtx.drawImage(canvas, 0, 0);
          }

          canvas.width = width * 2;
          canvas.height = height * 2;
          ctx.scale(2, 2);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#0f1115'; // Dark ink for light theme
          
          // Restore drawing
          if (tempCanvas) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to draw image correctly
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.restore();
          }
        }
      }
    });

    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const canvas = canvasRef.current;
    if (!canvas) return { x: clientX, y: clientY };
    
    const rect = canvas.getBoundingClientRect();

    if (isRotated) {
      return {
        x: rect.height - (clientY - rect.top),
        y: clientX - rect.left
      };
    } else {
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get image data to find bounding box
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    
    let hasPixels = false;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          hasPixels = true;
        }
      }
    }

    if (!hasPixels) {
      onSave(canvas.toDataURL('image/png'));
      return;
    }

    // Add some padding
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width, maxX + padding);
    maxY = Math.min(canvas.height, maxY + padding);

    const width = maxX - minX;
    const height = maxY - minY;

    // Create a new canvas to draw the cropped image
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    if (croppedCtx) {
      croppedCtx.putImageData(ctx.getImageData(minX, minY, width, height), 0, 0);
      onSave(croppedCanvas.toDataURL('image/png'));
    } else {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md overflow-hidden select-none"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <div 
        className="relative bg-white/95 backdrop-blur-xl flex flex-col rounded-3xl sm:rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.2)] overflow-hidden select-none" 
        style={isRotated ? {
          width: `${windowSize.height - 16}px`,
          maxWidth: '1000px',
          height: `${windowSize.width - 16}px`,
          maxHeight: '600px',
          transform: 'rotate(-90deg)',
          WebkitTouchCallout: 'none'
        } : {
          width: `${windowSize.width - 16}px`,
          maxWidth: '600px',
          height: `${windowSize.height - 16}px`,
          maxHeight: '1000px',
          WebkitTouchCallout: 'none'
        }}
      >
        <div className="px-4 pt-4 pb-2 sm:px-8 sm:pt-8 sm:pb-4 text-center text-slate-800 text-lg sm:text-xl font-bold z-10 shrink-0 select-none pointer-events-none">
          {title}
        </div>
        
        <div className="flex-1 relative mx-4 mb-3 sm:mx-8 sm:mb-4 rounded-2xl overflow-hidden border border-slate-200/60 bg-white shadow-inner">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="absolute inset-0 w-full h-full touch-none cursor-crosshair select-none"
          />
        </div>
        
        <div className="p-4 pt-2 sm:p-8 sm:pt-2 bg-transparent flex space-x-3 sm:space-x-4 z-10 shrink-0 select-none">
          <button onClick={onClose} className="flex-1 py-3 sm:py-4 bg-white border border-slate-200/60 text-slate-600 rounded-xl font-medium shadow-sm active:scale-95 transition-transform hover:bg-slate-50 select-none">
            取消
          </button>
          <button onClick={clear} className="flex-1 py-3 sm:py-4 bg-white border border-slate-200/60 text-slate-600 rounded-xl font-medium shadow-sm active:scale-95 transition-transform hover:bg-slate-50 select-none">
            清除
          </button>
          <button onClick={save} className="flex-[2] py-3 sm:py-4 bg-cyan-600 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(8,145,178,0.2)] active:scale-95 transition-transform hover:bg-cyan-700 select-none">
            確認簽名
          </button>
        </div>
      </div>
    </div>
  );
}
