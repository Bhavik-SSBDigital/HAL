import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function PdfContainer({ url, documentId }) {
  const [numPages, setNumPages] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [coordinates, setCoordinates] = useState([]);
  const [openRemarksMenu, setOpenRemarksMenu] = useState(false);
  const [remark, setRemark] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const pageRefs = useRef([]);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const token = sessionStorage.getItem('accessToken');

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, [highlights]);
  const temp = window.getSelection();
  const selected = temp.toString();
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    if (selectedText == '' || selectedText == undefined) {
      return;
    }
    if (selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      const newCoordinates = [];
      let isOverlapDetected = false;

      if (rects.length > 0) {
        for (const rect of rects) {
          const container = pageRefs.current.find(
            (ref) => ref && ref.contains(range.commonAncestorContainer),
          );
          if (container) {
            const containerRect = container.getBoundingClientRect();
            if (rect.left - containerRect.left == 0 || rect.width == 0) {
              continue;
            }
            const rectCoordinates = {
              page: pageRefs.current.indexOf(container) + 1,
              x: rect.left - containerRect.left,
              y: rect.top - containerRect.top,
              width: rect.width,
              height: rect.height,
            };
            const isOverlap = highlights.some((highlight) =>
              highlight.coordinates.some(
                (hCoord) =>
                  hCoord.page === rectCoordinates.page &&
                  hCoord.y < rectCoordinates.y + rectCoordinates.height &&
                  hCoord.y + hCoord.height > rectCoordinates.y &&
                  ((hCoord.x >= rectCoordinates.x &&
                    hCoord.x <= rectCoordinates.x + rectCoordinates.width) ||
                    (rectCoordinates.x >= hCoord.x &&
                      rectCoordinates.x <= hCoord.x + hCoord.width) ||
                    (rectCoordinates.x <= hCoord.x &&
                      rectCoordinates.x + rectCoordinates.width >=
                        hCoord.x + hCoord.width) ||
                    (hCoord.x <= rectCoordinates.x &&
                      hCoord.x + hCoord.width >=
                        rectCoordinates.x + rectCoordinates.width)),
              ),
            );

            if (isOverlap) {
              isOverlapDetected = true;
              break;
            } else {
              newCoordinates.push(rectCoordinates);
              setCoordinates((prevCoordinates) => [
                ...prevCoordinates,
                { remark: '', coordinates: newCoordinates },
              ]);
            }
          }
        }

        if (isOverlapDetected) {
          toast.info('Selected text overlaps with existing highlights.');
        } else if (newCoordinates.length > 0) {
          setSelectedText(selectedText);
          setCoordinates([{ remark: '', coordinates: newCoordinates }]);
          setOpenRemarksMenu(true);
        }
      }
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = () => {
    setLoading(false);
  };
  const [openTooltip, setOpenTooltip] = useState(false);
  const renderPages = () => {
    const pages = [];
    for (let i = 1; i <= numPages; i++) {
      pages.push(
        <Box
          key={i}
          ref={(el) => (pageRefs.current[i - 1] = el)}
          className="pdf-page"
          position="relative"
          sx={{ zIndex: 99 }}
        >
          <Page pageNumber={i} renderTextLayer />
          {highlights.map((highlight, index1) =>
            highlight.coordinates
              .filter((coord) => coord.page === i)
              .map((coord, index2) => (
                <>
                  <Box
                    sx={{
                      display:
                        openTooltip?.x == coord?.x && openTooltip?.y == coord?.y
                          ? 'block'
                          : 'none',
                      position: 'absolute',
                      width: 'fit-content',
                      right: 10,
                      background: 'white',
                      boxShadow:
                        'rgba(6, 24, 44, 0.4) 0px 0px 0px 2px, rgba(6, 24, 44, 0.65) 0px 4px 6px -1px, rgba(255, 255, 255, 0.08) 0px 1px 0px inset',
                      padding: '2px',
                      top: coord.y + coord.height,
                      left: coord.x,
                      zIndex: 999,
                    }}
                  >
                    <Typography fontWeight={700} fontSize={14} color="black">
                      User : {highlight.createdBy}
                    </Typography>
                    <Typography fontWeight={700} fontSize={14} color="black">
                      Remarks : {highlight.remark}
                    </Typography>
                  </Box>
                  <div
                    onMouseEnter={() =>
                      setOpenTooltip({ x: coord.x, y: coord.y })
                    }
                    onMouseLeave={() => setOpenTooltip(null)}
                    style={{
                      userSelect: 'none',
                      position: 'absolute',
                      top: coord.y,
                      left: coord.x,
                      width: coord.width,
                      height: coord.height,
                      backgroundColor: generateColor(index1),
                      backgroundBlendMode: 'lighten',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      zIndex: 99,
                    }}
                  />
                </>
              )),
          )}
        </Box>,
      );
    }
    return pages;
  };

  const [remarkError, setRemarkError] = useState('');
  const submitRemarks = async () => {
    if (!remark) {
      setRemarkError('Enter Remarks');
      return;
    }
    setSubmitLoading(true);
    const url = `${backendUrl}/postHighlightInFile`;

    const data = {
      remark,
      coordinates: coordinates[0].coordinates,
      documentId,
    };

    try {
      const res = await axios.post(url, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success(res?.data?.message || 'Remarks Submitted');
      setOpenRemarksMenu(false);
      getFileHighlights();
      setRemark('');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getFileHighlights = async () => {
    const url = `${backendUrl}/getHighlightsInFile/${documentId}`;
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setHighlights(res.data.highlights);
    } catch (error) {
      console.log(error.message);
    }
  };
  useEffect(() => {
    getFileHighlights();
  }, []);

  function generateColor(num) {
    const hash = num * 123456789;
    const r = (hash & 0xff0000) >> 16;
    const g = (hash & 0x00ff00) >> 8;
    const b = hash & 0x0000ff;
    return `rgb(${r % 256}, ${g % 256}, ${b % 256}, 0.2)`;
  }

  return (
    <>
      <div style={{ height: '100%', overflow: 'auto' }}>
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
              }}
            >
              <CircularProgress size={40} />
            </Box>
          }
        >
          {renderPages()}
        </Document>
      </div>
      <Dialog
        open={openRemarksMenu}
        sx={{ zIndex: '999999' }}
        onClose={() => (submitLoading ? null : setOpenRemarksMenu(false))}
      >
        <DialogTitle
          sx={{
            background: '#34546E',
            width: '280px',
            margin: '10px',
            fontSize: '20px',
            fontWeight: 700,
            color: 'white',
          }}
        >
          Enter Remarks
        </DialogTitle>
        <Stack sx={{ padding: '10px', gap: 2 }}>
          <TextField
            error={!!remarkError}
            helperText={remarkError}
            value={remark}
            onChange={(e) => {
              setRemark(e.target.value);
              if (e.target?.value?.length > 0) {
                setRemarkError(null);
              }
            }}
          />
          <Button
            disabled={submitLoading}
            variant="contained"
            onClick={submitRemarks}
          >
            {submitLoading ? <CircularProgress size={26} /> : 'Submit'}
          </Button>
        </Stack>
      </Dialog>
    </>
  );
}
export default PdfContainer;
