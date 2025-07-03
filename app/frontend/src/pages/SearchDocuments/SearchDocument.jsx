import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomCard from '../../CustomComponents/CustomCard';
import Title from '../../CustomComponents/Title';
import TopLoader from '../../common/Loader/TopLoader';
import { IconEye, IconDownload } from '@tabler/icons-react';
import { ImageConfig } from '../../config/ImageConfig';
import DocumentVersioning from '../DocumentVersioning';
import ViewFile from '../view/View';

import {
  deepSearch,
  GetUsersWithDetails,
  ViewDocument,
} from '../../common/Apis';

export default function DocumentSearch() {
  // state
  const { register, handleSubmit, reset } = useForm();
  const [results, setResults] = useState([]);
  const [filesData, setFilesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [users, setUsers] = useState([]);
  const [fileView, setFileView] = useState(null);
  const [lastQuery, setLastQuery] = useState();

  // handlers
  const fetchDocuments = async (data, showToast) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(data).toString();
      const response = await deepSearch(queryParams);
      if (showToast) {
        toast.success(
          `${response?.data?.pagination?.totalCount} results found`,
        );
      }

      setResults(response?.data?.data || []);
      setPagination((prev) => ({
        ...prev,
        totalCount: response?.data?.pagination?.totalCount || 0,
        totalPages: response?.data?.pagination?.totalPages || 1,
      }));
    } catch (err) {
      toast.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data) => {
    setLastQuery(data); // Save the query
    fetchDocuments(data, true);
  };

  const handleViewFile = async (name, path, fileId, type, isEditing) => {
    setLoading(true);
    try {
      const fileData = await ViewDocument(name, path, type, fileId);
      setFileView(fileData);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  // const handleCompare = () => {
  //   const selected = results.filter((doc) => selectedDocs.includes(doc.id));
  //   if (selected.length !== 2) {
  //     toast.info('Select 2 documents to compare');
  //     return;
  //   }
  //   setFilesData([{ url: selected[0].path }, { url: selected[1].path }]);
  // };

  const handlePagination = (dir) => {
    const newPage = dir === 'next' ? pagination.page + 1 : pagination.page - 1;

    const updatedPagination = {
      ...pagination,
      page: Math.max(1, newPage),
    };

    setPagination(updatedPagination);

    fetchDocuments({
      ...lastQuery,
      page: Math.max(1, newPage),
      pageSize: pagination.pageSize,
    });
  };

  const getUsers = async () => {
    try {
      const response = await GetUsersWithDetails();
      setUsers(response?.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getUsers();
  }, []);
  return (
    <CustomCard className={'mx-auto'}>
      {loading && <TopLoader />}
      <Title text={'Deep Document Search'} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Name
          </label>
          <input
            {...register('name')}
            placeholder="Enter document name"
            className="w-full border p-2 rounded"
          />
        </div>

        {/* tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <input
            {...register('tags')}
            placeholder="Comma-separated tags"
            className="w-full border p-2 rounded"
          />
        </div>

        {/* partNumber */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Part Number
          </label>
          <input
            {...register('partNumber')}
            placeholder="Enter part number"
            className="w-full border p-2 rounded"
          />
        </div>

        {/* isArchived */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Archived
          </label>
          <select
            {...register('isArchived')}
            className="w-full border p-2 rounded"
          >
            <option value="">Select</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        {/* inBin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            In Bin
          </label>
          <select {...register('inBin')} className="w-full border p-2 rounded">
            <option value="">Select</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        {/* createdByUsername (dropdown static for now) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Created By
          </label>
          <select
            {...register('createdByUsername')}
            className="w-full border p-2 rounded"
          >
            <option value="">Select</option>
            {users?.map((user, index) => {
              const roles = user.roles?.join(', ') || 'No Roles';
              const departments = user.departments?.length
                ? `(${user.departments.join(', ')})`
                : '';

              return (
                <option key={user.id} value={user.username}>
                  {`${user.username} - ${roles} ${departments}`}
                </option>
              );
            })}
          </select>
        </div>

        {/* processName */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Process Name
          </label>
          <input
            {...register('processName')}
            placeholder="Enter process name"
            className="w-full border p-2 rounded"
          />
        </div>

        {/* processId */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Process ID
          </label>
          <input
            {...register('processId')}
            placeholder="Enter process ID"
            className="w-full border p-2 rounded"
          />
        </div>

        {/* description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            {...register('description')}
            placeholder="Enter description"
            className="w-full border p-2 rounded"
          />
        </div>

        {/* preApproved */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pre-Approved
          </label>
          <select
            {...register('preApproved')}
            className="w-full border p-2 rounded"
          >
            <option value="">Select</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        {/* superseding */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Superseding
          </label>
          <select
            {...register('superseding')}
            className="w-full border p-2 rounded"
          >
            <option value="">Select</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="md:col-span-2 flex justify-end gap-4 mt-2">
          <CustomButton type="submit" text="Search" />
          <CustomButton
            text="Clear"
            type="button"
            variant="none"
            click={() => {
              reset();
              setResults([]);
              setLastQuery(null);
              setPagination({
                page: 1,
                pageSize: 10,
                totalCount: 0,
                totalPages: 1,
              });
            }}
          />
        </div>
      </form>

      {/* {selectedDocs.length > 0 && (
        <div className="mt-4 flex justify-between items-center bg-gray-100 px-4 py-3 rounded">
          <div className="flex gap-4">
            {results
              .filter((d) => selectedDocs.includes(d.id))
              .map((doc) => (
                <span key={doc.id} className="bg-gray-200 px-3 py-1 rounded">
                  {doc.name}
                </span>
              ))}
          </div>
          <CustomButton text="Compare" click={handleCompare} />
        </div>
      )} */}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {results.map((doc) => {
          const extension = doc.name?.split('.').pop()?.toLowerCase();
          return (
            <CustomCard
              key={doc.id}
              className="relative flex flex-col justify-between"
            >
              {/* Status Badge */}
              <div className="absolute top-0 right-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shadow-sm ${
                    doc.inBin
                      ? 'bg-red-100 text-red-800'
                      : doc?.isArchived
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {doc.isArchived
                    ? 'Archived'
                    : doc?.inBin
                      ? 'Deleted'
                      : 'Active'}
                </span>
              </div>

              {/* Header */}
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <img
                    width={28}
                    src={ImageConfig[extension] || ImageConfig['default']}
                    alt="icon"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold break-words">{doc.name}</p>
                  <p className="text-sm text-gray-500">Type: {extension}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex justify-end gap-2">
                <CustomButton
                  text={<IconEye size={18} className="text-white" />}
                  title="View (Updated)"
                  click={() =>
                    handleViewFile(
                      doc.name,
                      doc.path,
                      doc.id,
                      doc.name.split('.').pop(),
                      false,
                    )
                  }
                />
              </div>
            </CustomCard>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <CustomButton
            text="Previous"
            disabled={pagination.page === 1}
            type={'button'}
            click={() => handlePagination('prev')}
          />
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <CustomButton
            text="Next"
            type={'button'}
            disabled={pagination.page === pagination.totalPages}
            click={() => handlePagination('next')}
          />
        </div>
      )}

      {/* Compare View */}
      {/* {filesData.length === 2 && (
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
              file1={filesData[0].url}
              file2={filesData[1].url}
              observations={[]}
            />
          </div>
        </div>
      )} */}

      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}
    </CustomCard>
  );
}
