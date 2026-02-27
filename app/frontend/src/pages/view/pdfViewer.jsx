'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

import {
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconZoomIn,
  IconZoomOut,
  IconRotate,
  IconRefresh,
} from '@tabler/icons-react';

import { toast } from 'react-toastify';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomTextField from '../../CustomComponents/CustomTextField';
import CustomCard from '../../CustomComponents/CustomCard';

pdfjs.GlobalWorkerOptions.workerSrc = '/worker.js';

export default function PdfContainer({ url, contentHigh, refPage }) {
  const [numPages, setNumPages] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const pageRefs = useRef([]);
  const renderedPages = useRef(new Set());

  const targetPage = refPage - 1 || 1;

  /* ---------------- HELPERS ---------------- */

  const escapeRegex = (text = '') =>
    text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /* ---------------- PDF LOAD ---------------- */

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleRenderSuccess = (pageNumber) => {
    renderedPages.current.add(pageNumber);
    if (pageNumber === targetPage) {
      pageRefs.current[pageNumber - 1]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  /* ---------------- HIGHLIGHT LOGIC ---------------- */

  const highlightMatches = (term) => {
    const spans = document.querySelectorAll(
      '.react-pdf__Page__textContent span',
    );

    if (!term && !contentHigh) {
      spans.forEach((el) => {
        el.innerHTML = el.textContent;
      });
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const found = [];
    const safeTerm = escapeRegex(term);
    const safeContent = escapeRegex(contentHigh);

    spans.forEach((span) => {
      const text = span.textContent || '';
      span.innerHTML = text;

      let html = text;

      if (term) {
        const regex = new RegExp(`(${safeTerm})`, 'gi');
        if (regex.test(text)) {
          html = html.replace(regex, `<mark class="pdf-term">$1</mark>`);
          found.push(span);
        }
      }

      if (contentHigh) {
        const regex2 = new RegExp(`(${safeContent})`, 'gi');
        if (regex2.test(text)) {
          html = html.replace(regex2, `<mark class="pdf-content">$1</mark>`);
          found.push(span);
        }
      }

      span.innerHTML = html;
    });

    if (found.length) {
      found[0].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }

    setMatches(found);
    setCurrentMatchIndex(0);
  };

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    const t = setTimeout(() => highlightMatches(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm, numPages, scale, rotation]);

  /* ---------------- MATCH NAV ---------------- */

  const goToMatch = (dir) => {
    if (!matches.length) return;

    let index = currentMatchIndex + dir;
    if (index < 0) index = matches.length - 1;
    if (index >= matches.length) index = 0;

    setCurrentMatchIndex(index);
    matches[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  /* ---------------- ZOOM & ROTATE ---------------- */

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const resetZoom = () => setScale(1);

  const rotateRight = () => setRotation((r) => (r + 90) % 360);
  const resetRotation = () => setRotation(0);

  /* ---------------- RENDER ---------------- */

  return (
    <CustomCard className="p-0">
      {/* TOOLBAR */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-2 bg-background px-4 py-3">
        {/* <IconSearch size={18} className="text-muted-foreground" />
        <CustomTextField
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search text..."
          className="max-w-xs"
        />

        <CustomButton
          variant="icon"
          size="icon"
          click={() => goToMatch(-1)}
          disabled={!matches.length}
        >
          <IconChevronLeft size={18} />
        </CustomButton>

        <CustomButton
          variant="icon"
          size="icon"
          click={() => goToMatch(1)}
          disabled={!matches.length}
        >
          <IconChevronRight size={18} />
        </CustomButton>

        <h3 size="sm" className="min-w-[80px] text-center">
          {matches.length
            ? `${currentMatchIndex + 1}/${matches.length}`
            : '0 matches'}
        </h3> */}

        <div className="ml-auto flex items-center gap-1">
          <CustomButton variant="icon" size="icon" click={zoomOut}>
            <IconZoomOut size={18} />
          </CustomButton>

          <h3 size="sm">{Math.round(scale * 100)}%</h3>

          <CustomButton variant="icon" size="icon" click={zoomIn}>
            <IconZoomIn size={18} />
          </CustomButton>

          <CustomButton
            title={'Reset Zoom'}
            variant="icon"
            size="icon"
            click={resetZoom}
          >
            <IconRefresh size={18} />
          </CustomButton>

          <CustomButton
            title={'Rotate'}
            variant="icon"
            size="icon"
            click={rotateRight}
          >
            <IconRotate size={18} />
          </CustomButton>

          <CustomButton
            title={'Reset Rotate'}
            variant="icon"
            size="icon"
            click={resetRotation}
          >
            <IconRefresh size={18} />
          </CustomButton>
        </div>
      </div>

      {/* PDF */}
      <div>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(e) => {
            console.error(e);
            toast.error('Failed to load PDF');
          }}
        >
          {Array.from({ length: numPages || 0 }, (_, i) => (
            <div
              key={i}
              ref={(el) => (pageRefs.current[i] = el)}
              className="mb-6 flex justify-center"
            >
              <Page
                pageNumber={i + 1}
                scale={scale}
                rotate={rotation}
                renderTextLayer
                renderAnnotationLayer={false}
                onRenderSuccess={() => handleRenderSuccess(i + 1)}
              />
            </div>
          ))}
        </Document>
      </div>

      {/* HIGHLIGHT STYLES */}
      <style>
        {`
          mark.pdf-term {
            background: rgba(255, 230, 0, 0.75);
            padding: 0;
          }
          mark.pdf-content {
            background: rgba(0, 140, 255, 0.45);
            padding: 0;
          }
        `}
      </style>
    </CustomCard>
  );
}
