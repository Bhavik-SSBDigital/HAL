import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { toast } from 'react-toastify';
import DocumentVersioning from '../DocumentVersioning';
import TopLoader from '../../common/Loader/TopLoader';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomCard from '../../CustomComponents/CustomCard';
import Title from '../../CustomComponents/Title';

export default function SimpleDocumentSearch() {
  const { register, handleSubmit, reset } = useForm();
  const [actionsLoading, setActionsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [documentsToCompare, setDocumentsToCompare] = useState([]);
  const [filesData, setFilesData] = useState([]);

  const onSubmit = async (data) => {
    setActionsLoading(true);
    try {
      // Replace this with your real API call
      const response = await fetch('/api/documents/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      setResults(result.documents || []);
    } catch (err) {
      toast.error('Failed to fetch documents');
    } finally {
      setActionsLoading(false);
    }
  };

  const handleCompare = () => {
    if (documentsToCompare.length !== 2) {
      return toast.info('Select 2 documents to compare');
    }
    setFilesData([
      { url: documentsToCompare[0].path },
      { url: documentsToCompare[1].path },
    ]);
  };

  const toggleSelect = (doc) => {
    setDocumentsToCompare((prev) => {
      const exists = prev.find((d) => d.documentId === doc.documentId);
      if (exists) {
        return prev.filter((d) => d.documentId !== doc.documentId);
      } else {
        return prev.length < 2 ? [...prev, doc] : prev;
      }
    });
  };

  return (
    <CustomCard className={'mx-auto'}>
      {actionsLoading && <TopLoader />}

      <Title text={'Deep Document Search'} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            Document Name
          </label>
          <input
            {...register('documentName')}
            placeholder="Enter document name"
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Branch</label>
          <input
            {...register('branch')}
            placeholder="Enter branch"
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <input
            {...register('department')}
            placeholder="Enter department"
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <input
            {...register('year')}
            placeholder="Enter year"
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-4">
          <CustomButton
            type="submit"
            text="Search"
            variant="primary"
            disabled={actionsLoading}
          />
          <CustomButton
            text="Clear"
            type={'button'}
            variant="none"
            disabled={actionsLoading}
            click={() => {
              reset();
              setResults([]);
              setDocumentsToCompare([]);
            }}
          />
        </div>
      </form>

      {/* Compare bar */}
      {documentsToCompare.length > 0 && (
        <div className="mt-6 flex items-center justify-between bg-gray-50 border px-4 py-3 rounded">
          <div className="flex gap-4">
            {documentsToCompare.map((doc) => (
              <div
                key={doc.documentId}
                className="px-3 py-1 bg-gray-200 rounded"
              >
                {doc.name}
              </div>
            ))}
          </div>
          <CustomButton
            text="Compare"
            variant="outlined"
            click={handleCompare}
          />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold">Results: {results.length}</h3>
          {results.map((doc) => (
            <CustomCard key={doc.documentId}>
              <div className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <input
                    type="checkbox"
                    checked={
                      !!documentsToCompare.find(
                        (d) => d.documentId === doc.documentId,
                      )
                    }
                    onChange={() => toggleSelect(doc)}
                  />
                  <div>
                    <h4 className="font-semibold">{doc.name}</h4>
                    <p className="text-gray-500 text-sm">{doc.path}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <CustomButton
                    text="View"
                    variant="text"
                    click={() => window.open(doc.path, '_blank')}
                  />
                  <CustomButton
                    text="Download"
                    variant="secondary"
                    click={() => {
                      const a = document.createElement('a');
                      a.href = doc.path;
                      a.download = doc.name;
                      a.click();
                    }}
                  />
                </div>
              </div>
            </CustomCard>
          ))}
        </div>
      )}

      {/* Document Compare Dialog */}
      {filesData.length === 2 && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl max-w-6xl w-full relative">
            <button
              className="absolute top-3 right-3 text-gray-600"
              onClick={() => setFilesData([])}
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Document Versioning</h2>
            <DocumentVersioning
              file1={filesData[0]?.url}
              file2={filesData[1]?.url}
              observations={[]}
            />
          </div>
        </div>
      )}
    </CustomCard>
  );
}
