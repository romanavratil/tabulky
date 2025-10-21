import { useCallback, useEffect, useRef, useState } from 'react';

type UseBarcodeScannerOptions = {
  onDetected: (code: string) => void;
};

type ScannerState = {
  isSupported: boolean;
  hasPermission: boolean;
  isActive: boolean;
  error?: string;
};

type QuaggaModule = {
  init: (
    config: Record<string, unknown>,
    callback: (error: Error | null | undefined) => void,
  ) => void;
  start: () => void;
  stop: () => void;
  onDetected: (callback: (result: { codeResult?: { code?: string | null } } | undefined) => void) => void;
  offDetected: (callback: (result: { codeResult?: { code?: string | null } } | undefined) => void) => void;
  CameraAccess?: {
    release: () => void;
  };
};

export function useBarcodeScanner({ onDetected }: UseBarcodeScannerOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quaggaRef = useRef<QuaggaModule | null>(null);
  const handlerRef = useRef<((result: { codeResult?: { code?: string | null } } | undefined) => void) | null>(null);
  const [state, setState] = useState<ScannerState>(() => ({
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    hasPermission: false,
    isActive: false,
    error: undefined,
  }));

  const cleanupDom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('video, canvas').forEach((node) => node.remove());
  }, []);

  const loadQuagga = useCallback(async () => {
    if (quaggaRef.current) return quaggaRef.current;
    if (typeof window === 'undefined') return null;
    try {
      const module = await import('@ericblade/quagga2');
      const quagga = (module.default ?? module) as QuaggaModule;
      quaggaRef.current = quagga;
      return quagga;
    } catch (error) {
      console.error('[useBarcodeScanner] Failed to load Quagga', error);
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    const quagga = quaggaRef.current;
    if (handlerRef.current && quagga) {
      quagga.offDetected(handlerRef.current);
      handlerRef.current = null;
    }
    if (quagga) {
      try {
        quagga.stop();
        quagga.CameraAccess?.release?.();
      } catch (error) {
        console.error('[useBarcodeScanner] Failed to stop Quagga', error);
      }
    }
    cleanupDom();
    setState((prev) => ({ ...prev, isActive: false }));
  }, [cleanupDom]);

  const start = useCallback(async () => {
    if (state.isActive) return;
    setState((prev) => ({ ...prev, error: undefined }));

    if (!containerRef.current) {
      setState((prev) => ({ ...prev, error: 'Camera preview unavailable.' }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to access camera. Please allow access or use manual entry.';
      setState((prev) => ({ ...prev, error: message, hasPermission: false }));
      return;
    }

    const quagga = await loadQuagga();
    if (!quagga) {
      setState((prev) => ({
        ...prev,
        error: 'Unable to load scanner. Please enter the barcode manually.',
      }));
      return;
    }

    await new Promise<void>((resolve, reject) => {
      quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            target: containerRef.current!,
            constraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          locator: {
            patchSize: 'large',
            halfSample: false,
          },
          decoder: {
            readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader'],
          },
          locate: true,
        },
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        },
      );
    }).catch((error) => {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to initialise camera stream. Please try again or enter manually.',
      }));
      cleanupDom();
      throw error;
    });

    quagga.start();
    setState((prev) => ({ ...prev, isActive: true, hasPermission: true }));

    const handler = (result: { codeResult?: { code?: string | null } } | undefined) => {
      const code = result?.codeResult?.code?.trim();
      if (code) {
        onDetected(code);
      }
    };
    handlerRef.current = handler;
    quagga.onDetected(handler);
  }, [cleanupDom, loadQuagga, onDetected, state.isActive]);

  useEffect(
    () => () => {
      stop();
    },
    [stop],
  );

  return {
    containerRef,
    start,
    stop,
    ...state,
  };
}
