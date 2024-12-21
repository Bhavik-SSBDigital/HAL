import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';
import { IconInfoTriangle } from '@tabler/icons-react';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function PdfContainer({
  url,
  documentId,
  workflow,
  maxReceiverStepNumber,
  processId,
  currentStep,
  controls,
}) {
  const username = sessionStorage.getItem('username');
  const initiator = sessionStorage.getItem('initiator') == 'true';
  const [numPages, setNumPages] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [coordinates, setCoordinates] = useState([]);
  const [openRemarksMenu, setOpenRemarksMenu] = useState(false);
  const [remark, setRemark] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [signAreas, setSignAreas] = useState([]); // NEW STATE
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('textSelection'); // NEW STATE
  const [drawing, setDrawing] = useState(false); // For sign area drawing
  const [currentSignArea, setCurrentSignArea] = useState(null); // For active rectangle
  const pageRefs = useRef([]);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const token = sessionStorage.getItem('accessToken');

  useEffect(() => {
    if (mode === 'signSelection') {
      document.addEventListener('dblclick', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('dblclick', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('dblclick', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [mode, drawing, currentSignArea]);

  useEffect(() => {
    const handleTextSelection = () => {
      if (mode !== 'textSelection') return; // Only handle text selection in text mode
      const selection = window.getSelection();
      const selectedText = selection.toString()?.trim() || '';
      if (selectedText.length > 0 && selectedText) {
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        const newCoordinates = [];
        let isOverlapDetected = false;

        for (const rect of rects) {
          const container = pageRefs.current.find((ref) =>
            ref.contains(range.commonAncestorContainer),
          );
          if (container) {
            const containerRect = container.getBoundingClientRect();
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
                      rectCoordinates.x <= hCoord.x + hCoord.width)),
              ),
            );

            if (isOverlap) {
              isOverlapDetected = true;
              break;
            } else {
              newCoordinates.push(rectCoordinates);
            }
          }
        }
        console.log(isOverlapDetected);
        if (isOverlapDetected) {
          toast.info('Selected text overlaps with existing highlights.');
        } else if (newCoordinates.length > 0) {
          setSelectedText(selectedText);
          setCoordinates([{ remark: '', coordinates: newCoordinates }]);
          setOpenRemarksMenu(true);
        }
      }
    };

    document.addEventListener('mouseup', handleTextSelection);

    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, [mode, highlights]);

  const handleMouseDown = (e) => {
    if (mode === 'signSelection') {
      // Start drawing rectangle
      setDrawing(true);
      const container = pageRefs.current.find((ref) => ref.contains(e.target));
      if (container) {
        const containerRect = container.getBoundingClientRect();
        setCurrentSignArea({
          page: pageRefs.current.indexOf(container) + 1,
          x: e.clientX - containerRect.left,
          y: e.clientY - containerRect.top,
          width: 0,
          height: 0,
        });
      }
    }
  };

  const handleMouseMove = (e) => {
    if (mode === 'signSelection' && drawing && currentSignArea) {
      const container = pageRefs.current[currentSignArea.page - 1];
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const width = Math.max(
          0,
          e.clientX - containerRect.left - currentSignArea.x,
        );
        const height = Math.max(
          0,
          e.clientY - containerRect.top - currentSignArea.y,
        );
        setCurrentSignArea({
          ...currentSignArea,
          width: width,
          height: height,
        });
      }
    }
  };

  const [userSignDialogOpen, setUserSignDialogOpen] = useState(false);
  const handleMouseUp = () => {
    setDrawing(false);
    if (mode === 'signSelection' && drawing) {
      setDrawing(false);
      if (currentSignArea.width > 0 && currentSignArea.height > 0) {
        setUserSignDialogOpen(true);
      }
    }
  };
  // dialog inputs for user sign area
  const [userSelected, setUserSelected] = useState(null);
  const submitSignArea = async () => {
    const url = backendUrl + '/storeSignCoordinates';
    try {
      await axios.post(
        url,
        {
          docId: documentId,
          processId,
          coordinates: [{ ...currentSignArea, stepNo: userSelected }],
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSignAreas((prev) => [
        ...prev,
        { ...currentSignArea, stepNo: userSelected },
      ]);
      setCurrentSignArea(null);
      setUserSignDialogOpen(false);
      setUserSelected(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };
  const onSignAreaDialogClose = () => {
    setCurrentSignArea(null);
    setUserSignDialogOpen(false);
    setUserSelected(null);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const removeSignArea = (index) => {
    setSignAreas((prev) => prev.filter((_, i) => i !== index));
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
                    }}
                  />
                </>
              )),
          )}
          {mode === 'signSelection' &&
            currentSignArea &&
            currentSignArea.page === i && (
              <Box
                sx={{
                  position: 'absolute',
                  top: currentSignArea.y,
                  left: currentSignArea.x,
                  width: currentSignArea.width,
                  height: currentSignArea.height,
                  border: '2px dashed red',
                  backgroundColor: 'rgba(255, 0, 0, 0.3)',
                }}
              />
            )}

          {signAreas
            ?.filter((signArea) => signArea.page === i)
            ?.map((signArea, index) => (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  top: signArea.y,
                  left: signArea.x,
                  width: signArea.width,
                  height: signArea.height,
                  border: '2px solid red',
                  backgroundColor: 'rgba(255, 0, 0, 0.3)',
                }}
              >
                {initiator ? (
                  <Button
                    onClick={() => removeSignArea(index)}
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      minWidth: '0',
                      padding: '0',
                      border: '2px solid red',
                    }}
                  >
                    X
                  </Button>
                ) : null}
              </Box>
            ))}
        </Box>,
      );
    }
    return pages;
  };

  function generateColor(num) {
    const hash = num * 123456789;
    const r = (hash & 0xff0000) >> 16;
    const g = (hash & 0x00ff00) >> 8;
    const b = hash & 0x0000ff;
    return `rgba(${r % 256}, ${g % 256}, ${b % 256}, 0.3)`;
  }
  const [remarkError, setRemarkError] = useState('');
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
  const getSignCoordinates = async () => {
    const url = backendUrl + '/getSignCoordinatesForCurrentStep';
    try {
      const res = await axios.post(
        url,
        {
          docId: documentId,
          processId: processId,
          stepNo: currentStep,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSignAreas(res?.data?.coordinates);
    } catch (error) {
      console.log(error?.response?.data?.message || error?.message);
    }
  };

  useEffect(() => {
    getFileHighlights();
    getSignCoordinates();
  }, []);
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

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        userSelect: mode === 'signSelection' ? 'none' : 'auto',
      }}
    >
      {controls ? (
        <Box
          sx={{
            background: 'white',
            position: 'sticky',
            top: '2px',
            zIndex: 21,
            padding: '10px',
            mb: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Button
              variant={mode === 'textSelection' ? 'contained' : 'outlined'}
              onClick={() => setMode('textSelection')}
            >
              Text Selection Mode
            </Button>

            {initiator && documentId ? (
              <Button
                variant={mode === 'signSelection' ? 'contained' : 'outlined'}
                onClick={() => setMode('signSelection')}
              >
                Sign Selection Mode
              </Button>
            ) : null}
          </Box>
        </Box>
      ) : null}
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
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
      <Dialog
        open={openRemarksMenu}
        onClose={() => setOpenRemarksMenu(false)}
      >
        <DialogTitle
          sx={{
            background: 'var(--themeColor)',
            margin: '5px',
            color: 'white',
          }}
        >
          Enter Remarks
        </DialogTitle>
        <Stack spacing={2} sx={{ p: 2 }}>
          <TextField
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
          <Button
            variant="contained"
            disabled={submitLoading}
            onClick={() => submitRemarks()}
          >
            {submitLoading ? <CircularProgress size={20} /> : 'Submit'}
          </Button>
        </Stack>
      </Dialog>
      <Dialog
        open={userSignDialogOpen}
        onClose={onSignAreaDialogClose}
      >
        <form>
          <DialogTitle
            sx={{ bgcolor: 'var(--themeColor)', margin: 1, color: 'white' }}
          >
            Select user you want sign of here
          </DialogTitle>
          <DialogContent>
            <Select
              value={userSelected}
              onChange={(e) => setUserSelected(e.target.value)}
              size="small"
              fullWidth
              sx={{ minWidth: '150px', color: '#333' }}
            >
              {workflow
                ?.filter(
                  (item) => !item.users.some((user) => user.user === username),
                )
                // .filter((item) => item.step > publishCheck.step)
                .filter((item) => item.step <= maxReceiverStepNumber)
                .map((item) => (
                  <MenuItem key={item.step} value={item.step}>
                    forward to{' '}
                    <b
                      style={{
                        marginRight: '3px',
                        marginLeft: '3px',
                      }}
                    >
                      {item.users.map((user) => user.user).join(',')}
                    </b>{' '}
                    for work{' '}
                    <b
                      style={{
                        marginRight: '3px',
                        marginLeft: '3px',
                      }}
                    >
                      {item.work}
                    </b>
                    (step - {item.step})
                  </MenuItem>
                ))}
            </Select>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="primary"
              onClick={submitSignArea}
            >
              Submit
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}

export default PdfContainer;
