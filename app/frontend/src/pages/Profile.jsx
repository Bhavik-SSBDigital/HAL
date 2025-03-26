import CoverOne from '../assets/images/cover-01.png';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import sessionData from '../Store';
import ComponentLoader from '../common/Loader/ComponentLoader';
import { GetProfileData, GetProfilePic, GetSignature } from '../common/Apis';

const Profile = () => {
  const { profileImage, setProfileImage } = sessionData();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [userDetails, setUserDetails] = useState({
    departmentsInvolvedIn: [],
    email: '',
    roles: [],
    specialUser: '',
    username: '',
  });
  const [loading, setLoading] = useState(true);
  const [signatureViewModalOpen, setSignatureViewModalOpen] = useState(false);
  const fileInputRef = useRef();
  const [signatureImage, setSignatureImage] = useState('');

  const fetchSignature = async () => {
    try {
      const response = await GetSignature();
      if (response.status === 200) {
        const blob = new Blob([response.data], {
          type: response.headers['content-type'],
        });
        setSignatureImage(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error('Error fetching signature:', error.message);
    }
  };

  const fetchProfilePic = async () => {
    try {
      const response = await GetProfilePic();
      if (response.status === 200) {
        const blob = new Blob([response.data], {
          type: response.headers['content-type'],
        });
        setProfileImage(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error.message);
    }
  };

  const handleUpload = async (purpose, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedFormats =
      purpose === 'signature'
        ? ['image/jpeg', 'image/png', 'image/gif']
        : ['image/jpeg'];
    if (!allowedFormats.includes(file.type)) {
      toast.warning('Unsupported File Type');
      return;
    }

    try {
      const url = `${backendUrl}/uploadSignature`;
      const data = new FormData();
      data.append('purpose', purpose);
      data.append('file', file);

      const res = await axios.post(url, data, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.status === 200) {
        purpose === 'signature' ? fetchSignature() : fetchProfilePic();
        toast.success(`Image uploaded successfully for ${purpose}`);
      }
    } catch (error) {
      toast.error(`Error uploading image for ${purpose}`);
    }
  };

  useEffect(() => {
    (async () => {
      const res = await GetProfileData();
      setUserDetails(res.data.userdata);
      setLoading(false);
    })();
    fetchSignature();
  }, []);

  return (
    <>
      {loading ? (
        <ComponentLoader />
      ) : (
        <div className="overflow-hidden rounded border bg-white shadow dark:border-gray-700 dark:bg-gray-800">
          <div className="relative h-36 md:h-64">
            <img
              src={CoverOne}
              alt="profile cover"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="px-4 pb-6 text-center">
            <div className="relative mx-auto -mt-20 h-32 w-32 rounded-full bg-gray-200 p-1 shadow">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="profile"
                  className="rounded-full w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center h-full w-full text-gray-500">
                  No Image
                </div>
              )}
            </div>
            <h3 className="mt-4 text-2xl font-semibold">
              {userDetails?.username || '---'}
            </h3>
            <div className="mt-4 text-lg">
              <p>
                <strong>Department:</strong>{' '}
                {userDetails?.departmentsInvolvedIn
                  ?.map((d) => d.departmentName)
                  .join(', ') || '---'}
              </p>
              <p>
                <strong>Email:</strong> {userDetails.email || '---'}
              </p>
              <p>
                <strong>Role:</strong> {userDetails.roles?.join(', ') || '---'}
              </p>
            </div>
            <div className="mt-4">
              <strong>Signature:</strong>
              {signatureImage ? (
                <button
                  className="text-blue-600 underline"
                  onClick={() => setSignatureViewModalOpen(true)}
                >
                  View Signature
                </button>
              ) : (
                <p className="text-red-500">Please upload your signature</p>
              )}
            </div>
            <div className="mt-4">
              <label className="block text-lg font-semibold">
                Upload Signature:
              </label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) => handleUpload('signature', e)}
                className="mt-2 border rounded p-1 w-full"
              />
            </div>
          </div>
        </div>
      )}
      {signatureViewModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <img src={signatureImage} alt="Signature" className="max-w-xs" />
            <button
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
              onClick={() => setSignatureViewModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
