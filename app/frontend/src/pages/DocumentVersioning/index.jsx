import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from './DocumentVersioning.module.css';
import Typography from '@mui/material/Typography';

const DocumentVersioning = ({ file1, file2, observations }) => {
  const [numPages1, setNumPages1] = useState(null);
  const [numPages2, setNumPages2] = useState(null);
  const [scale, setScale] = useState(1); // Scale for responsiveness
  const [error1, setError1] = useState(null);
  const [error2, setError2] = useState(null);

  const onLoadSuccess1 = ({ numPages }) => setNumPages1(numPages);
  const onLoadSuccess2 = ({ numPages }) => setNumPages2(numPages);

  // Set scale based on window size for responsiveness
  useEffect(() => {
    const handleResize = () => {
      const newScale = Math.min(window.innerWidth / 800, 1); // Adjust '800' based on original PDF width
      setScale(newScale);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderHighlights = (pageNum, fileObservations, isAdded) => {
    const pageObservations = fileObservations.filter(
      (obs) => obs.pageNo === pageNum,
    );

    return pageObservations.flatMap((obs, obsIndex) =>
      obs.coordinates.map((coord, coordIndex) => {
        const style = {
          left: `${coord.x1 * scale}px`,
          top: `${coord.y1 * scale}px`,
          width: `${(coord.x2 - coord.x1) * scale}px`,
          height: `${(coord.y2 - coord.y1) * scale}px`,
          backgroundColor: isAdded
            ? 'rgba(0, 255, 0, 0.3)'
            : 'rgba(255, 0, 0, 0.3)',
        };
        return (
          <div
            key={`${obsIndex}-${coordIndex}`}
            style={style}
            className={styles.highlight}
          >
            {obs.text}
          </div>
        );
      }),
    );
  };

  return (
    <div className={styles.documentVersioning}>
      <div
        className={styles.colorContainer}
        style={{ backgroundColor: '#ffa5a5' }}
      />
      <Typography
        variant="body2"
        color="initial"
        sx={{ display: 'inline', mb: 1, mr: 2 }}
      >
        Removed
      </Typography>
      <div
        className={styles.colorContainer}
        style={{ backgroundColor: '#b2ffb2' }}
      />
      <Typography
        variant="body2"
        color="initial"
        sx={{ display: 'inline', mb: 1, mr: 2 }}
      >
        Added
      </Typography>
      <div className={styles.documentContainer}>
        {file1 && (
          <div className={styles.document}>
            <h3>Version 1</h3>
            {error1 && <p className={styles.error}>{error1}</p>}
            <Document file={file1} onLoadSuccess={onLoadSuccess1}>
              {Array.from(new Array(numPages1), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  className={styles.page}
                >
                  <div className={styles.pageOverlay}>
                    {renderHighlights(
                      index + 1,
                      observations[0].observations_for_file1,
                      false,
                    )}
                  </div>
                </Page>
              ))}
            </Document>
          </div>
        )}

        {file2 && (
          <div className={styles.document}>
            <h3>Version 2</h3>
            {error2 && <p className={styles.error}>{error2}</p>}
            <Document file={file2} onLoadSuccess={onLoadSuccess2}>
              {Array.from(new Array(numPages2), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  className={styles.page}
                >
                  <div className={styles.pageOverlay}>
                    {renderHighlights(
                      index + 1,
                      observations[0].observations_for_file2,
                      true,
                    )}
                  </div>
                </Page>
              ))}
            </Document>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVersioning;
