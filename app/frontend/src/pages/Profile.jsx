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
        <div className="flex flex-col gap-6 p-6 rounded-lg border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Cover Image */}
          <div className="relative h-48 md:h-64 w-full">
            <img
              src={CoverOne}
              alt="profile cover"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Profile & Details Container */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-19 px-10">
            {/* Profile Image */}
            <div className="flex flex-col items-center order-first md:order-none">
              <div className="relative h-39 w-39 rounded-full border bg-gray-200 shadow-lg overflow-hidden group">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No Image
                  </div>
                )}

                {/* File Input Overlay */}
                <label className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-sm">Change</span>
                  <input
                    type="file"
                    accept="image/jpeg"
                    onChange={(e) => handleUpload('profile', e)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
                {userDetails?.username || '---'}
              </h3>
            </div>

            {/* User Details */}
            <div className="flex-1 space-y-4 text-lg text-gray-700 dark:text-gray-300">
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
          </div>

          {/* Signature Upload */}
          <div className="flex flex-col items-center">
            <strong>Signature:</strong>
            {signatureImage ? (
              <button
                className="ml-2 text-blue-600 underline"
                onClick={() => setSignatureViewModalOpen(true)}
              >
                View Signature
              </button>
            ) : (
              <div className="flex items-center gap-2 text-red-600 bg-red-100 p-3 rounded-md border border-red-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.766-1.36 2.72-1.36 3.486 0l6.516 11.57c.746 1.324-.2 2.98-1.743 2.98H3.484c-1.543 0-2.49-1.656-1.743-2.98l6.516-11.57zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-3a1 1 0 011-1v-2a1 1 0 10-2 0v2a1 1 0 011 1z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="font-semibold">
                  Signature is required. Please upload your signature.
                </p>
              </div>
            )}
            <label className="mt-4 block text-lg font-semibold">
              Upload Signature:
            </label>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={(e) => handleUpload('signature', e)}
              className="mt-2 border rounded p-2 w-full"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
