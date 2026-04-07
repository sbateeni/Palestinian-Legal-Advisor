const WORKER_SRC = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

type PdfjsNS = typeof import('pdfjs-dist');

let loadPromise: Promise<PdfjsNS> | null = null;

export function loadPdfjs(): Promise<PdfjsNS> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('PDF.js متاح في المتصفح فقط'));
    }
    if (!loadPromise) {
        loadPromise = import('pdfjs-dist').then((mod) => {
            mod.GlobalWorkerOptions.workerSrc = WORKER_SRC;
            return mod;
        });
    }
    return loadPromise;
}
