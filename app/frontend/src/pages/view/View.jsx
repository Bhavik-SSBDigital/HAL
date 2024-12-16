import React, { useEffect, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { pdfjs } from 'react-pdf';
import PdfContainer from './pdfViewer';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PdfViewer = ({
  docu,
  handleViewClose,
  workflow,
  maxReceiverStepNumber,
  processId,
  currentStep,
  controls,
}) => {
  const [excelData, setExcelData] = useState([]);
  const closeIconStyle = {
    position: 'absolute',
    top: '10px',
    right: '20px',
    zIndex: '9999999',
  };

  useEffect(() => {
    if (docu.type === 'xlsx' || docu.type === 'xls') {
      fetch(docu.url)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();

          reader.onload = (evt) => {
            const bstr = evt.target.result;
            const workbook = XLSX.read(bstr, {
              type: 'binary',
              cellDates: true,
            });
            const sheetName = workbook.SheetNames[0]; // First sheet
            const sheet = workbook.Sheets[sheetName];

            // Convert to JSON format
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // `header: 1` keeps it in an array format

            // Normalize and store data
            const maxLength = jsonData.reduce(
              (max, row) => Math.max(max, row.length),
              0,
            );
            const normalizedData = jsonData.map((row) =>
              Array.from({ length: maxLength }, (_, i) => row[i] || ''),
            );

            setExcelData(normalizedData);
          };

          reader.readAsBinaryString(blob);
        })
        .catch((error) => console.error('Error reading Excel file:', error));
    }
    if (docu.type !== 'pdf' || docu.type !== 'xlsx' || docu.type !== 'xls') {
      toast.warn('Unsupported file type');
      handleViewClose();
      return;
    }
  }, [docu]);

  return (
    <div
      style={{
        position: 'fixed',
        left: '0px',
        top: '0px',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'lightgray',
        zIndex: '99',
      }}
    >
      <IconButton sx={closeIconStyle} onClick={handleViewClose}>
        <CloseIcon />
      </IconButton>
      {docu && (
        <>
          {docu.type === 'pdf' ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                height: '100%',
              }}
            >
              <PdfContainer
                url={docu.url}
                documentId={docu.fileId}
                workflow={workflow}
                maxReceiverStepNumber={maxReceiverStepNumber}
                processId={processId}
                currentStep={currentStep}
                controls={controls}
              />
            </div>
          ) : docu.type === 'xls' || docu.type === 'xlsx' ? (
            <div
              style={{
                overflowY: 'auto',
                maxHeight: '100vh',
                background: 'white',
              }}
            >
              <table
                border="1"
                style={{ borderCollapse: 'collapse', width: '100%' }}
              >
                {excelData?.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => {
                      // Check if the cell value is empty or not and apply styles accordingly
                      const isEmpty = cell === '';
                      return (
                        <td
                          key={cellIndex}
                          style={{
                            padding: '8px',
                            border: '1px solid',
                            textAlign: 'left',
                            fontWeight: rowIndex === 0 ? 700 : 'normal',
                            color: rowIndex === 0 ? 'black' : '',
                            backgroundColor: isEmpty
                              ? '#f0f0f0'
                              : 'transparent', // Highlight empty cells if needed
                          }}
                        >
                          {isEmpty ? ' ' : cell}{' '}
                          {/* Show empty string as space */}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default PdfViewer;
