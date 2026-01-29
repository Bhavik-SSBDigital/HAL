import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { IconTrash, IconPencil } from '@tabler/icons-react';
import { GetDraftedProcessList, DeleteProcessDraft } from '../../common/Apis';
import CustomCard from '../../CustomComponents/CustomCard';
import { toast } from 'react-toastify';

export default function DraftedProcesses() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const navigate = useNavigate();

  const fetchProcesses = async () => {
    try {
      const res = await GetDraftedProcessList();
      setData(res?.data?.data || []);
      setMeta(res?.data?.meta || {});
    } catch (error) {
      toast.error('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleView = (draft) => {
    if (draft.type === 'INITIATE') {
      navigate(`/processes/initiate/${draft.draftId}`);
    }

    if (draft.type === 'REOPEN') {
      navigate(`/process/view/${draft.processId}?completed=true`, {
        state: {
          openReopenModal: true,
          reopenDraftId: draft.draftId,
        },
      });
    }
  };

  const handleDelete = async (draftId, e) => {
    e.stopPropagation();

    if (!window.confirm('Delete this draft?')) return;

    setDeleteLoading((p) => ({ ...p, [draftId]: true }));
    try {
      const res = await DeleteProcessDraft(draftId);
      toast.success(res?.data?.message || 'Draft deleted');
      fetchProcesses();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteLoading((p) => ({ ...p, [draftId]: false }));
    }
  };

  const filteredData = data.filter((d) =>
    `${d.name || ''} ${d.description || ''} ${d.type || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const columns = [
    {
      field: 'name',
      headerName: 'Draft Name',
      width: 300,
      renderCell: ({ row }) => (
        <div>
          <div className="font-medium">{row.name || 'Untitled Draft'}</div>
          <div className="text-xs text-gray-500">
            {row.description || 'No description'}
          </div>
        </div>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: ({ value }) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            value === 'INITIATE'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {value}
        </span>
      ),
    },
    {
      field: 'workflow',
      headerName: 'Workflow / Process',
      width: 260,
      valueGetter: (params) => {
        console.log(params);
        if (!params) return '—';

        return params?.name || '—';
      },
    },
    {
      field: 'documentCount',
      headerName: 'Drafted Documents',
      width: 120,
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      valueGetter: (value) =>
        value ? moment(value).format('DD-MMM-YYYY hh:mm A') : '—',
    },
    {
      field: 'updatedAt',
      headerName: 'Last Updated',
      width: 180,
      valueGetter: (value) =>
        value ? moment(value).format('DD-MMM-YYYY hh:mm A') : '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex p-1 gap-2">
          <button
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
            onClick={() => handleView(row)}
            title="Edit Draft"
          >
            <IconPencil size={16} color="white" />
          </button>

          <button
            className="p-2 bg-red-500 hover:bg-red-600 rounded"
            onClick={(e) => handleDelete(row.draftId, e)}
            disabled={deleteLoading[row.draftId]}
            title="Delete Draft"
          >
            {deleteLoading[row.draftId] ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <IconTrash size={16} color="white" />
            )}
          </button>
        </div>
      ),
    },
  ];

  const rows = filteredData.map((item) => ({
    id: item.draftId, // DataGrid requirement
    ...item,
  }));

  return (
    <div>
      {loading ? (
        <ComponentLoader />
      ) : (
        <CustomCard>
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Drafted Processes</h2>
              <p className="text-sm text-gray-600">
                Total: {meta.total || 0} — {meta.initiateDrafts || 0}{' '}
                Initiation, {meta.reopenDrafts || 0} Reopen
              </p>
            </div>

            <input
              type="text"
              placeholder="Search drafts..."
              className="p-2 border rounded w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {data.length === 0
                ? 'No drafts found.'
                : 'No drafts match your search.'}
            </div>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              pageSizeOptions={[10]}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#f9fafb',
                },
              }}
            />
          )}
        </CustomCard>
      )}
    </div>
  );
}
