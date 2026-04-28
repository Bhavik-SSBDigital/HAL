'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  IconZoomIn,
  IconZoomOut,
  IconRotate,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import { toast } from 'react-toastify';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomCard from '../../CustomComponents/CustomCard';

pdfjs.GlobalWorkerOptions.workerSrc = '/worker.js';

const PAGE_BATCH = 5; // 👈 controls lazy rendering

export default function PdfContainer({ url, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [visiblePages, setVisiblePages] = useState(PAGE_BATCH);

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [username, setUsername] = useState('');

  const containerRef = useRef(null);

  /* ---------------- USER ---------------- */
  useEffect(() => {
    setUsername(sessionStorage.getItem('username') || 'UNKNOWN USER');
  }, []);

  /* ---------------- LOAD ---------------- */
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  /* ---------------- LAZY LOAD ---------------- */
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setVisiblePages((prev) =>
        Math.min(prev + PAGE_BATCH, numPages || prev)
      );
    }
  }, [numPages]);

  /* ---------------- CONTROLS ---------------- */
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const resetZoom = () => setScale(1);

  const rotateRight = () => setRotation((r) => (r + 90) % 360);
  const resetRotation = () => setRotation(0);

  /* ---------------- RENDER ---------------- */

  return (
    <CustomCard className="p-0">

      {/* TOOLBAR */}
      <div className="sticky top-0 z-50 flex items-center justify-end gap-2 bg-background px-4 py-3 shadow-sm">

        <CustomButton variant="icon" size="icon" click={zoomOut}>
          <IconZoomOut size={18} />
        </CustomButton>

        <span className="min-w-[60px] text-center text-sm">
          {Math.round(scale * 100)}%
        </span>

        <CustomButton variant="icon" size="icon" click={zoomIn}>
          <IconZoomIn size={18} />
        </CustomButton>

        <CustomButton variant="icon" size="icon" click={resetZoom}>
          <IconRefresh size={18} />
        </CustomButton>

        <CustomButton variant="icon" size="icon" click={rotateRight}>
          <IconRotate size={18} />
        </CustomButton>

        <CustomButton variant="icon" size="icon" click={resetRotation}>
          <IconRefresh size={18} />
        </CustomButton>

        {/* CLOSE */}
        {onClose && (
          <>
            <div className="mx-2 h-6 w-px bg-gray-300" />
            <CustomButton
              variant="icon"
              size="icon"
              click={onClose}
              className="text-red-500 hover:bg-red-100"
            >
              <IconX size={18} />
            </CustomButton>
          </>
        )}
      </div>

      {/* PDF CONTAINER */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[80vh] overflow-auto flex flex-col items-center"
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={() => toast.error('Failed to load PDF')}
        >
          {Array.from(new Array(visiblePages), (_, i) => (
            <div key={i} className="mb-6">

              {/* TRANSFORM WRAPPER (🔥 NO RE-RENDER) */}
              <div
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                }}
                className="relative inline-block"
              >
                {/* PDF PAGE (FIXED SCALE = 1) */}
                <Page
                  pageNumber={i + 1}
                  scale={1}
                  renderTextLayer={false} // ⚡ BIG BOOST
                  renderAnnotationLayer={false}
                />

                {/* WATERMARK */}
                {username && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      style={{
                        transform: 'rotate(-45deg)',
                        fontSize: '1.5rem',
                        opacity: 0.25,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        width: '140%',
                      }}
                    >
                      <p>UNCONTROLLED COPY</p>
                      <p>{username}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </Document>

        {/* LOAD MORE INDICATOR */}
        {visiblePages < (numPages || 0) && (
          <div className="py-4 text-sm text-gray-500">
            Loading more pages...
          </div>
        )}
      </div>
    </CustomCard>
  );
}