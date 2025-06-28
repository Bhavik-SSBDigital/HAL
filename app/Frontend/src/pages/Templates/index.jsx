import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import {
  getWorkflowTemplates,
  createTemplateDocument,
  uploadTemplateFile,
  ViewDocument,
} from '../../common/Apis';
import CustomButton from '../../CustomComponents/CustomButton';
import { IconEye } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import ViewFile from '../view/View';

const supportedExtensions = [
  'docx',
  'xlsx',
  'pptx',
  'docm',
  'xlsm',
  'pptm',
  'dotx',
  'xltx',
  'potx',
];

const Templates = () => {
  const { id: workflowId } = useParams();
  const [file, setFile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [fileView, setFileView] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      templateName: '',
      extension: supportedExtensions[0],
    },
  });

  useEffect(() => {
    if (workflowId) {
      fetchTemplates(workflowId);
    }
  }, [workflowId]);

  const fetchTemplates = async (wfId) => {
    try {
      const res = await getWorkflowTemplates(wfId);
      setTemplates(res.data.templates);
    } catch (error) {
      console.error('Failed to fetch templates', error);
    }
  };

  const onCreateTemplate = async (data) => {
    if (!workflowId) return;
    setActionsLoading(true);
    try {
      const payload = { ...data, workflowId };
      const res = await createTemplateDocument(payload);
      toast.success(res?.data?.message);
      reset();
      fetchTemplates(workflowId);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file || !workflowId) return;

    setActionsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workflowId', workflowId);
      formData.append('purpose', 'template');

      const res = await uploadTemplateFile(formData);
      toast.success(res?.data?.message);
      setFile(null);
      fetchTemplates(workflowId);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleViewFile = async (name, path, fileId, type, isEditing) => {
    setActionsLoading(true);
    try {
      const fileData = await ViewDocument(name, path, type, fileId);
      setFileView(fileData);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-xl shadow mt-10 space-y-8">
        <h2 className="text-3xl font-bold text-gray-800">Template Manager</h2>

        {!workflowId ? (
          <p className="text-red-600">No workflow ID found in URL.</p>
        ) : (
          <>
            {/* Section 1: Create Template Entry */}
            <section className="p-4 border rounded-md shadow-sm bg-gray-50">
              <h3 className="text-xl font-semibold mb-4">
                Create Template Entry
              </h3>
              <form
                onSubmit={handleSubmit(onCreateTemplate)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Template Name
                  </label>
                  <input
                    {...register('templateName', {
                      required: 'Template name is required',
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Enter template name"
                  />
                  {errors.templateName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.templateName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Extension
                  </label>
                  <select
                    {...register('extension')}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {supportedExtensions.map((ext) => (
                      <option key={ext} value={ext}>
                        {ext.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <CustomButton
                    disabled={actionsLoading}
                    text="Create Template"
                    click={handleSubmit(onCreateTemplate)}
                  />
                </div>
              </form>
            </section>

            {/* Section 2: Upload File */}
            <section className="p-4 border rounded-md shadow-sm bg-gray-50">
              <h3 className="text-xl font-semibold mb-4">
                Upload Template File
              </h3>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0 file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <div className="mt-3">
                <CustomButton
                  disabled={actionsLoading || !file}
                  text="Upload File"
                  click={handleFileUpload}
                />
              </div>
            </section>

            {/* Section 3: Template List */}
            <section className="p-4 border rounded-md shadow-sm bg-gray-50">
              <h3 className="text-xl font-semibold mb-4">Uploaded Templates</h3>
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No templates found for this workflow.
                </p>
              ) : (
                <ul className="space-y-3">
                  {templates.map((tpl, idx) => {
                    const extension = tpl.name?.split('.').pop()?.toLowerCase();
                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm"
                      >
                        <div>
                          <div className="font-medium text-gray-800">
                            {tpl.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Path: {tpl.path}
                          </div>
                          <div className="text-sm text-gray-400">
                            Type: {extension}
                          </div>
                        </div>
                        <CustomButton
                          text={<IconEye size={18} />}
                          title="View File"
                          click={() =>
                            handleViewFile(
                              tpl.name,
                              tpl.path,
                              tpl.id,
                              extension,
                              false,
                            )
                          }
                          className="ml-4"
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {/* Section 4: File Viewer Modal */}
      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}
    </>
  );
};

export default Templates;
