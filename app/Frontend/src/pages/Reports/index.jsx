import React, { useState } from 'react';
import CustomButton from '../../CustomComponents/CustomButton';
import TopLoader from '../../common/Loader/TopLoader';
import { downloadLoginLogoutReport, exportFileLogs } from '../../common/Apis';
import CustomCard from '../../CustomComponents/CustomCard';
import CustomModal from '../../CustomComponents/CustomModal';
import CustomTextField from '../../CustomComponents/CustomTextField';
import { toast } from 'react-toastify';

const reports = [
  {
    title: 'Login / Logout Report',
    description:
      'Download detailed report of user login and logout activities.',
    type: 'auth',
  },
  {
    title: 'File Logs Report',
    description: 'Download detailed report of file logs',
    type: 'file_logs',
  },
];

const AdminReportsPage = () => {
  const [actionsLoading, setActionsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleDownload = async (type) => {
    setActionsLoading(true);
    try {
      let response = null;

      // Add 1 day to toDate if it exists
      let adjustedToDate = toDate
        ? new Date(new Date(toDate).getTime() + 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10)
        : toDate;

      if (type === 'auth') {
        response = await downloadLoginLogoutReport(fromDate, adjustedToDate);
      } else if (type === 'file_logs') {
        response = await exportFileLogs(fromDate, adjustedToDate);
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${type}-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error(
        error?.response?.data?.message ||
          'No data found between selected dates',
      );
    } finally {
      setActionsLoading(false);
      setModalOpen(false);
      setFromDate('');
      setToDate('');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      {actionsLoading && <TopLoader />}
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Reports</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <CustomCard key={report.type}>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {report.title}
            </h2>
            <p className="text-gray-600 text-sm mb-4">{report.description}</p>
            <CustomButton
              click={() => {
                setSelectedReport(report);
                setModalOpen(true);
              }}
              className="w-full"
              text="Download Report"
            />
          </CustomCard>
        ))}
      </div>

      {/* Date Selection Modal */}
      <CustomModal isOpen={modalOpen}>
        <h2 className="text-lg font-semibold mb-4">
          Select Date Range for {selectedReport?.title}
        </h2>
        <div className="flex flex-col gap-4">
          <CustomTextField
            type="date"
            label="From Date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <CustomTextField
            type="date"
            label="To Date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <CustomButton
            text={actionsLoading ? 'Downloading...' : 'Download'}
            click={() => handleDownload(selectedReport.type)}
            disabled={actionsLoading || !fromDate || !toDate}
            className="w-full"
          />
          <CustomButton
            text="Cancel"
            variant="danger"
            click={() => setModalOpen(false)}
            className="w-full"
            disabled={actionsLoading}
          />
        </div>
      </CustomModal>
    </div>
  );
};

export default AdminReportsPage;
