import React, { useState } from 'react';
import CustomButton from '../../CustomComponents/CustomButton';
import TopLoader from '../../common/Loader/TopLoader';
import { downloadLoginLogoutReport } from '../../common/Apis';
import CustomCard from '../../CustomComponents/CustomCard';

const reports = [
  {
    title: 'Login / Logout Report',
    description:
      'Download detailed report of user login and logout activities.',
    type: 'auth',
  },
  // Later you can add more reports here...
];

const AdminReportsPage = () => {
  const [actionsLoading, setActionsLoading] = useState(false);

  const handleDownload = async (type) => {
    setActionsLoading(true);
    try {
      if (type === 'auth') {
        await downloadLoginLogoutReport(); // 🔹 call respective API
      }
      // Add more conditions for other types later...
    } catch (error) {
      console.error('Error downloading report:', error);
    } finally {
      setActionsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {actionsLoading && <TopLoader />} {/* 🔹 show loader */}
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Reports</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {reports.map((report) =>
          report.type === 'auth' ? ( // 🔹 condition: only show login/logout for now
            <CustomCard key={report.type}>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                {report.title}
              </h2>
              <p className="text-gray-600 text-sm mb-4">{report.description}</p>
              <CustomButton
                click={() => handleDownload(report.type)}
                className="w-full"
                disabled={actionsLoading}
                text={actionsLoading ? 'Downloading...' : 'Download Report'}
              ></CustomButton>
            </CustomCard>
          ) : null,
        )}
      </div>
    </div>
  );
};

export default AdminReportsPage;
