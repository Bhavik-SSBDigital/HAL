import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from './DocumentVersioning.module.css'; // Import the CSS module

const DocumentVersioning = ({ file1, file2 }) => {
  const [numPages1, setNumPages1] = useState(null);
  const [numPages2, setNumPages2] = useState(null);

  const [error1, setError1] = useState(null);
  const [error2, setError2] = useState(null);

  const onLoadSuccess1 = ({ numPages }) => {
    console.log('ss');
    setNumPages1(numPages);
  };

  const onLoadSuccess2 = ({ numPages }) => {
    setNumPages2(numPages);
  };

  return (
    <div className={styles.documentVersioning}>
      <div className={styles.documentContainer}>
        {file1 && (
          <div className={styles.document}>
            <h3>Version 1</h3>
            {error1 && <p className={styles.error}>{error1}</p>}

            <Document
              file={file1}
              onLoadSuccess={onLoadSuccess1}
              onLoadError={(error) => {
                setError1('Failed to load document.');
                setLoading1(false);
              }}
            >
              {Array.from(new Array(numPages1), (el, index) => (
                <Page key={`page_${index + 1}`} pageNumber={index + 1} />
              ))}
            </Document>
          </div>
        )}

        {file2 && (
          <div className={styles.document}>
            <h3>Version 2</h3>
            {error2 && <p className={styles.error}>{error2}</p>}
            <Document
              file={file2}
              onLoadSuccess={onLoadSuccess2}
              onLoadError={(error) => {
                setError2('Failed to load document.');
              }}
            >
              {Array.from(new Array(numPages2), (el, index) => (
                <Page key={`page_${index + 1}`} pageNumber={index + 1} />
              ))}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVersioning;
