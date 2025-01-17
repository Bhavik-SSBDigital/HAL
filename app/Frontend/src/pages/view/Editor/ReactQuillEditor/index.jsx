import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ReactQuillEditor = () => {
  const [editorValue, setEditorValue] = useState('');

  const handleChange = (value) => {
    setEditorValue(value);
  };

  return (
    <ReactQuill value={editorValue} onChange={handleChange} theme="snow" />
  );
};

export default ReactQuillEditor;
