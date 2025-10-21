import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getProductByBarcode } from '../api/openFoodFacts';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import ProductDetailSheet from './ProductDetailSheet';
import type { FoodProduct, MealType, ServingUnit } from '../types';
import { useLogsStore } from '../state/useLogsStore';
import { useProductsStore } from '../state/useProductsStore';

type BarcodeScannerProps = {
  onComplete?: () => void;
};

export default function BarcodeScanner({ onComplete }: BarcodeScannerProps = {}) {
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const startRequestRef = useRef(false);
  const upsertEntry = useLogsStore((state) => state.upsertEntry);
  const addProduct = useProductsStore((state) => state.addProduct);

  const productMutation = useMutation({
    mutationFn: async (code: string) => getProductByBarcode(code),
    onSuccess: (result) => {
      if (result) {
        addProduct(result);
        setProduct(result);
      }
    },
  });

  const fetchProduct = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      productMutation.mutate(trimmed);
    },
    [productMutation],
  );

  const handleDetected = useCallback(
    (code: string) => {
      fetchProduct(code);
    },
    [fetchProduct],
  );

  const {
    containerRef,
    start: startScanner,
    stop: stopScanner,
    isActive,
    isSupported,
    hasPermission,
    error: scannerError,
  } = useBarcodeScanner({ onDetected: handleDetected });

  const handleConfirm = ({
    product: selected,
    meal,
    portion,
  }: {
    product: FoodProduct;
    meal: MealType;
    portion: { value: number; unit: ServingUnit };
  }) => {
    upsertEntry({
      productId: selected.id,
      meal,
      portion,
      perServing: selected.perServing,
      productServing: selected.servingSize,
    });
    addProduct(selected);
    setProduct(null);
    onComplete?.();
  };

  useEffect(() => {
    if (showManual) {
      stopScanner();
      setHasStarted(false);
      setIsStarting(false);
      startRequestRef.current = false;
    }
  }, [showManual, stopScanner]);

  useEffect(
    () => () => {
      stopScanner();
      setHasStarted(false);
      setIsStarting(false);
      setStartError(null);
      startRequestRef.current = false;
    },
    [stopScanner],
  );

  const handleStart = useCallback(async () => {
    if (startRequestRef.current) return;
    startRequestRef.current = true;
    setIsStarting(true);
    try {
      await startScanner();
      setHasStarted(true);
      setStartError(null);
    } catch (error) {
      console.error('[BarcodeScanner] Failed to start camera', error);
      setStartError(
        error instanceof Error ? error.message : 'Unable to access camera. Please try again or enter manually.',
      );
      setHasStarted(false);
    } finally {
      setIsStarting(false);
      startRequestRef.current = false;
    }
  }, [startScanner]);

  const handleRescan = useCallback(async () => {
    setHasStarted(false);
    stopScanner();
    setStartError(null);
    await handleStart();
  }, [handleStart, stopScanner]);

  useEffect(() => {
    if (!showManual && !hasStarted && !isStarting && !startError) {
      void handleStart();
    }
  }, [showManual, hasStarted, isStarting, startError, handleStart]);

  const statusLabel = showManual
    ? 'Manual entry'
    : isActive
      ? 'Scanning…'
      : isStarting
        ? 'Starting camera…'
        : startError
          ? 'Camera paused'
          : hasStarted
            ? 'Paused'
            : 'Ready';

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-black/80"
        aria-live="polite"
        aria-busy={isActive}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-between p-4 text-white">
          <div className="flex w-full justify-between text-xs uppercase tracking-wide text-white/80">
            <span>{statusLabel}</span>
            {!isSupported && <span>Manual only</span>}
          </div>
          {!showManual && (
            <>
              <div className="pointer-events-none relative flex h-full w-full items-center justify-center">
                <div className="absolute inset-x-12 top-1/2 h-px -translate-y-1/2 bg-white/40" />
                <div className="absolute inset-y-12 left-1/2 w-px -translate-x-1/2 bg-white/40" />
                <div className="absolute inset-x-16 top-1/2 h-12 -translate-y-1/2 border border-white/50" />
              </div>
              <div className="flex w-full flex-col items-center gap-2 text-center text-xs text-white/80">
                <span className="text-sm font-semibold text-white">
                  {hasPermission ? 'Align barcode inside the frame' : 'Grant camera access to begin scanning'}
                </span>
                <span>Hold steady until the code is recognized.</span>
              </div>
            </>
          )}
        </div>
        {!showManual && !hasStarted && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            {startError ? (
              <button
                type="button"
                onClick={handleStart}
                className="pointer-events-auto rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg"
              >
                Retry scanning
              </button>
            ) : (
              <span className="rounded-full bg-black/70 px-4 py-2 text-sm text-white">Starting camera…</span>
            )}
          </div>
        )}
      </div>

      {!hasPermission && !scannerError && !showManual && hasStarted && (
        <p className="text-sm text-muted">
          Allow camera access to scan barcodes. You can always type it manually below.
        </p>
      )}

      {scannerError && <p className="text-sm text-red-500">{scannerError}</p>}
      {startError && <p className="text-sm text-red-500">{startError}</p>}

      {showManual ? (
        <form
          className="space-y-3 rounded-3xl bg-surface p-4 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            fetchProduct(manualCode);
          }}
        >
          <label className="text-sm font-semibold text-foreground" htmlFor="barcode-input">
            Manual barcode entry
          </label>
          <input
            id="barcode-input"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="Type barcode digits"
            className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm"
            inputMode="numeric"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!manualCode.trim()}
            >
              Lookup
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManual(false);
                setStartError(null);
                setHasStarted(false);
              }}
              className="flex-1 rounded-full border border-white/10 px-4 py-2 text-sm"
            >
              Back to scanner
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setShowManual(true);
            }}
            className="w-full rounded-full border border-white/10 px-4 py-3 text-sm"
          >
            Enter barcode manually
          </button>
          <button
            type="button"
            onClick={handleRescan}
            className="w-full rounded-full bg-surface px-4 py-3 text-sm font-medium text-foreground"
            disabled={!hasStarted}
          >
            Rescan
          </button>
          {!isSupported && (
            <p className="text-xs text-muted">
              Your browser does not support barcode scanning, please enter the digits manually.
            </p>
          )}
        </div>
      )}

      {productMutation.isPending && <p className="text-sm text-muted">Looking up product…</p>}
      {productMutation.isError && <p className="text-sm text-red-500">Could not find that barcode.</p>}

      <ProductDetailSheet
        product={product}
        open={Boolean(product)}
        onClose={() => setProduct(null)}
        onConfirm={({ product: confirmed, meal, portion }) =>
          handleConfirm({ product: confirmed, meal, portion })
        }
      />
    </div>
  );
}
