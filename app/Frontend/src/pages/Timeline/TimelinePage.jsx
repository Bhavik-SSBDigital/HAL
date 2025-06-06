import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTimelineData } from '../../common/Apis';
import Timeline from './index';
import TopLoader from '../../common/Loader/TopLoader';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { IconArrowLeft } from '@tabler/icons-react';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomCard from '../../CustomComponents/CustomCard';

export default function TimelinePage() {
  // states
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [data, setData] = useState();
  const [error, setError] = useState();
  const navigate = useNavigate();

  // handlers
  const handleBack = () => {
    navigate(-1);
  };

  // network
  const getData = async () => {
    try {
      const response = await getTimelineData(id);
      setData(response?.data);
    } catch (error) {
      console.error(error?.response?.data?.message || error?.message);
      setError(error?.response?.data?.error?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [id]);

  if (loading) return <ComponentLoader />;
  if (error)
    return (
      <CustomCard>
        <p className="text-lg font-semibold">Info: {error}</p>
        <div className="mt-4 flex space-x-4">
          <CustomButton click={handleBack} text={'Go Back'} />
        </div>
      </CustomCard>
    );

  return (
    <div>
      {actionsLoading && <TopLoader />}
      <div className="flex justify-end flex-row gap-2 flex-wrap">
        <CustomButton
          variant={'none'}
          text={
            <div className="flex items-center  gap-2">
              <IconArrowLeft size={18} /> List
            </div>
          }
          click={handleBack}
          disabled={actionsLoading}
        />
      </div>
      <Timeline
        actionsLoading={actionsLoading}
        activities={data?.process?.activities}
        setActionsLoading={setActionsLoading}
      />
    </div>
  );
}
