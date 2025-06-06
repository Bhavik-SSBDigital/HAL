import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getTimelineData } from '../../common/Apis';
import Timeline from './index';
import TopLoader from '../../common/Loader/TopLoader';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import { IconArrowLeft } from '@tabler/icons-react';
import CustomButton from '../../CustomComponents/CustomButton';

export default function TimelinePage() {
  // states
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [data, setData] = useState();

  // handlers
  const handleBack = () => {
    navigate(-1);
  };

  // network
  const getData = async () => {
    try {
      const response = await getTimelineData(id);
      setData(response?.data?.data);
    } catch (error) {
      console.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [id]);

  if (loading) return <ComponentLoader />;

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
        activities={data}
        setActionsLoading={setActionsLoading}
      />
    </div>
  );
}
