import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onClose: () => void;
  title?: string;
}

export default function SignaturePad({ onSave, onClose, title = "請在下方簽名" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set actual size in memory (scaled to account for extra pixel density)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0f1115'; // Dark ink for light theme
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
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

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

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
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/40 backdrop-blur-sm">
      <div className="flex justify-between items-center p-4 text-white pt-safe">
        <h3 className="text-lg font-bold drop-shadow-md">{title}</h3>
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors backdrop-blur-md">
          ❌
        </button>
      </div>
      
      <div className="flex-1 p-4 flex flex-col justify-center">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.1)] relative">
          <div className="absolute top-4 left-4 right-4 text-center text-slate-400 text-sm font-medium pointer-events-none">
            請在此區域內簽名
          </div>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-72 touch-none cursor-crosshair bg-slate-50/50"
          />
          <div className="absolute bottom-4 left-4 right-4 flex justify-between">
            <button onClick={clear} className="px-4 py-2 bg-white border border-slate-200/60 text-slate-600 rounded-xl font-medium flex items-center space-x-2 shadow-sm active:scale-95 transition-transform hover:bg-slate-50">
              <span>清除</span>
            </button>
            <button onClick={save} className="px-6 py-2 bg-cyan-600 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(8,145,178,0.2)] active:scale-95 transition-transform hover:bg-cyan-700">
              確認簽名
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
