import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { IconEye, IconSquareRoundedX } from '@tabler/icons-react';
import CustomCard from '../../CustomComponents/CustomCard';
import {
  getRecommendationDetails,
  getRecommendations,
} from '../../common/Apis';
import { toast } from 'react-toastify';
import CustomModal from '../../CustomComponents/CustomModal';

export default function Recommendations() {
  // variables
  const [data, setData] = useState([]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const filteredData = data.filter((item) =>
    item.processName.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const columns = [
    { field: 'processName', headerName: 'Process Name', width: 250 },
    { field: 'initiatorUsername', headerName: 'Initiator', width: 180 },
    {
      field: 'recommendationText',
      headerName: 'Recommendation',
      width: 400,
      renderCell: (params) => (
        <span title={params.row.recommendationText}>
          {params.row.recommendationText.length > 50
            ? params.row.recommendationText.slice(0, 50) + '...'
            : params.row.recommendationText}
        </span>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      width: 200,
      valueGetter: (value) =>
        value ? moment(value).format('DD-MMM-YYYY hh:mm A') : '--',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <div className="flex space-x-2 m-1">
          <button
            className="p-2 bg-button-primary-default hover:bg-button-primary-hover rounded-lg"
            onClick={() => {
              handleView(params.row.recommendationId);
              console.log(params);
            }}
          >
            <IconEye color="white" />
          </button>
        </div>
      ),
    },
  ];
  const rows = filteredData.map((item, index) => ({
    id: index + 1,
    processId: item.processId,
    processName: item.processName,
    initiatorUsername: item.initiatorUsername,
    recommendationText: item.recommendationText,
    createdAt: item.createdAt,
    recommendationId: item.recommendationId,
  }));

  //   handlers
  const handleView = (id) => {
    navigate(`/recommendation/${id}`);
  };

  //   network
  const fetchProcesses = async () => {
    try {
      const res = await getRecommendations();
      setData(res?.data?.recommendations || []);
    } catch (error) {
      console.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  return (
    <div>
      {loading ? (
        <ComponentLoader />
      ) : (
        <CustomCard>
          <label className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            onChange={(e) => setSearchTerm(e.target.value)}
            required
            className="w-full p-2 border rounded mb-2 max-w-[200px]"
          />
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10]}
          />
        </CustomCard>
      )}
    </div>
  );
}
