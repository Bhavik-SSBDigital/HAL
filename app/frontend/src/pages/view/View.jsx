import React, { useEffect, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { toast } from 'react-toastify';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer'; // Import the library
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import * as XLSX from 'xlsx';
import PdfContainer from './pdfViewer';

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
    zIndex: '22',
  };

  useEffect(() => {
    const supportedTypes = [
      'bmp',
      'csv',
      'odt',
      'doc',
      'docx',
      'gif',
      'htm',
      'html',
      'jpg',
      'jpeg',
      'pdf',
      'png',
      'ppt',
      'pptx',
      'tiff',
      'txt',
      'xls',
      'xlsx',
      'mp4',
      'webp',
    ];
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
            const normalizedData = jsonData.map(
              (row) =>
                Array.from({ length: maxLength }, (_, i) => row[i] || ''), // Normalize Excel data
            );

            setExcelData(normalizedData);
          };

          reader.readAsBinaryString(blob);
        })
        .catch((error) => console.error('Error reading Excel file:', error));
    }

    if (!supportedTypes.includes(docu.type)) {
      toast.warn('Unsupported file type');
      handleViewClose();
      return;
    }
  }, [docu]);

  console.log(docu.url);
  return (
    <div
      style={{
        position: 'fixed',
        left: '0px',
        top: '0px',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'lightgray',
        zIndex: '21',
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
                signed={docu.signed}
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
                              : 'transparent',
                          }}
                        >
                          {isEmpty ? ' ' : cell}{' '}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </table>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'white',
              }}
            >
              <DocViewer
                documents={[{ uri: docu.url }]}
                pluginRenderers={DocViewerRenderers}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PdfViewer;
