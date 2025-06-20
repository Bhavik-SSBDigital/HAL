import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Editor = ({ documentId, fileType, accessToken, onError, readOnly = false }) => {
  const [editorUrl, setEditorUrl] = useState('');

  useEffect(() => {
    const fetchEditorUrl = async () => {
      try {
        console.log('Editor.jsx: Fetching WOPI token:', { documentId, fileType, readOnly });
        const tokenResponse = await axios.get(`http://localhost:8000/wopi/token/${documentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        console.log('Editor.jsx: WOPI token response:', tokenResponse.data);
        const wopiToken = tokenResponse.data.access_token;

        console.log('Editor.jsx: Fetching WOPI discovery');
        const discoveryResponse = await axios.get(`http://localhost:8000/wopi/discovery`);
        console.log('Editor.jsx: WOPI discovery actions:', discoveryResponse.data.actions);
        const action = discoveryResponse.data.actions.find(
          action => action.name === (readOnly ? 'view' : 'edit') && action.ext === fileType.toLowerCase()
        );

        if (!action) {
          throw new Error(`No ${readOnly ? 'view' : 'edit'} action found for file type: ${fileType}`);
        }

        const wopiSrc = `http://localhost:8000/wopi/files/${documentId}`;
        const url = `${action.url}WOPISrc=${encodeURIComponent(wopiSrc)}&access_token=${encodeURIComponent(wopiToken)}`;
        console.log('Editor.jsx: Generated editor URL:', url);
        setEditorUrl(url);
      } catch (err) {
        console.error('Editor.jsx: Error fetching editor URL:', err);
        toast.error(`Failed to load editor: ${err.message}`);
        if (onError) onError(err);
      }
    };

    if (documentId && accessToken && fileType) {
      console.log('Editor.jsx: Starting editor fetch:', { documentId, fileType, readOnly });
      fetchEditorUrl();
    } else {
      console.error('Editor.jsx: Missing required props:', { documentId, accessToken, fileType });
      toast.error('Editor configuration error');
    }
  }, [documentId, accessToken, fileType, onError, readOnly]);

  if (!editorUrl) {
    return <div>Loading Collabora Online editor...</div>;
  }

  return (
    <iframe
      src={editorUrl}
      style={{ width: '100%', height: '80vh', border: 'none' }}
      title="Collabora Online Editor"
      allowFullScreen
    />
  );
};

export default Editor;