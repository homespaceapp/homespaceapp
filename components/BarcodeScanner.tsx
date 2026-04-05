'use client';

import { useEffect, useRef, useState } from 'react';

interface ProductInfo {
  name: string;
  category: string;
}

interface Props {
  onScan: (product: ProductInfo) => void;
  onClose: () => void;
}

function detectCategory(tags: string[]): string {
  const t = tags.join(' ').toLowerCase();
  if (t.includes('meat') || t.includes('poultry') || t.includes('pork') || t.includes('beef') || t.includes('sausage')) return 'mięso';
  if (t.includes('dairy') || t.includes('milk') || t.includes('cheese') || t.includes('butter') || t.includes('cream') || t.includes('yogurt')) return 'nabiał';
  if (t.includes('vegetable') || t.includes('fruit') || t.includes('fresh')) return 'warzywa';
  if (t.includes('sweet') || t.includes('candy') || t.includes('chocolate') || t.includes('cookie') || t.includes('biscuit')) return 'słodycze';
  if (t.includes('pasta') || t.includes('rice') || t.includes('grain') || t.includes('bread') || t.includes('flour') || t.includes('cereal')) return 'suche';
  return 'inne';
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Uruchamiam kamerę...');
  const [error, setError] = useState('');
  const [found, setFound] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let done = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 } },
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if (!('BarcodeDetector' in window)) {
          setError('Skaner nie jest wspierany (potrzebny Chrome/Edge na Android lub Safari 17+).');
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
        });

        setStatus('Skieruj kamerę na kod kreskowy');

        intervalId = setInterval(async () => {
          if (done || !videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length === 0) return;
            done = true;
            if (intervalId) clearInterval(intervalId);

            const code = barcodes[0].rawValue;
            setFound(code);
            setStatus(`Kod: ${code} — szukam w bazie...`);

            // Open Food Facts lookup
            let name = code;
            let category = 'inne';
            try {
              const res = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${code}.json`,
                { signal: AbortSignal.timeout(5000) }
              );
              const data = await res.json();
              if (data.status === 1 && data.product) {
                const p = data.product;
                name =
                  p.product_name_pl ||
                  p.product_name ||
                  p.generic_name_pl ||
                  p.generic_name ||
                  code;
                // Trim brand prefix if product name starts with brand
                const brand = p.brands?.split(',')[0]?.trim();
                if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
                  name = name.slice(brand.length).trim().replace(/^[-,\s]+/, '');
                }
                category = detectCategory(p.categories_tags || []);
                setStatus(`Znaleziono: ${name}`);
              } else {
                setStatus(`Nie znaleziono produktu — wpisz nazwę ręcznie`);
              }
            } catch {
              setStatus(`Brak internetu — wpisz nazwę ręcznie`);
            }

            setTimeout(() => onScan({ name, category }), 600);
          } catch {
            // detector failed, retry
          }
        }, 400);
      } catch {
        setError('Brak dostępu do kamery. Zezwól na kamerę w ustawieniach przeglądarki.');
      }
    }

    start();

    return () => {
      done = true;
      if (intervalId) clearInterval(intervalId);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 bg-black/80">
        <p className="text-white font-semibold">Skanuj kod kreskowy</p>
        <button onClick={onClose} className="text-white text-2xl leading-none w-8 h-8 flex items-center justify-center">
          ✕
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <p className="text-4xl">📵</p>
          <p className="text-white text-center text-sm">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg text-sm"
          >
            Wróć
          </button>
        </div>
      ) : (
        <>
          {/* Camera */}
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Targeting overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-72 h-28">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                {/* Scan line */}
                {!found && (
                  <div className="absolute left-2 right-2 top-1/2 h-px bg-red-400 opacity-70" />
                )}
                {found && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl">✅</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className="px-4 py-4 bg-black/80 text-center">
            <p className="text-white text-sm">{status}</p>
            {found && <p className="text-zinc-400 text-xs mt-1">EAN: {found}</p>}
          </div>
        </>
      )}
    </div>
  );
}
