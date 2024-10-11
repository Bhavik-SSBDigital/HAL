import CoverOne from '../assets/images/cover-01.png';
import { Box, Modal, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import sessionData from '../Store';
import ComponentLoader from '../common/Loader/ComponentLoader';
import styles from './Profile.module.css'

const signatureModalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const Profile = () => {

  const { profileImage, setProfileImage } = sessionData();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [userDetails, setUserDetails] = useState({
    branch: '',
    departmentsInvolvedIn: [],
    email: '',
    role: '',
    specialUser: '',
    username: '',
  });
  // const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signatureViewModalOpen, setSignatureViewModalOpen] = useState(false);
  const closeSignatureViewModal = () => {
    setSignatureViewModalOpen(false);
  };
  const fileInputRef = useRef();
  const [signatureImage, setSignatureImage] = useState('');
  const fetchSingature = async () => {
    try {
      const url = backendUrl + '/getUserSignature';
      const accessToken = sessionStorage.getItem('accessToken');
      const response = await axios.post(url, null, {
        headers: {
          Authorization: ` Bearer ${accessToken}`,
        },
        responseType: 'blob',
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], {
          type: response.headers['content-type'],
        });
        const objectURL = URL.createObjectURL(blob);
        setSignatureImage(objectURL);
      } else {
        console.error('Error fetching profile picture:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error.message);
    }
  };
  const fetchProfilePic = async () => {
    try {
      const url = backendUrl + '/getUserProfilePic';
      const accessToken = sessionStorage.getItem('accessToken');
      const response = await axios.post(url, null, {
        headers: {
          Authorization: ` Bearer ${accessToken}`,
        },
        responseType: 'blob',
      });

      if (response.status === 200) {
        const blob = new Blob([response.data], {
          type: response.headers['content-type'],
        });
        const objectURL = URL.createObjectURL(blob);
        setProfileImage(objectURL);
      } else {
        console.error('Error fetching profile picture:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error.message);
    }
  };
  const handleUpload = async (purpose, e) => {
    const file = e.target.files[0];
    const filename = e.target.files[0].name;
    const fileExtension = filename.split(".").pop();
    if (purpose === 'signature') {
      const allowedFormats = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedFormats.includes(file.type)) {
        toast.warning('Unsupported File Type');
        return;
      }
    } else if (purpose === 'profilePic' && fileExtension.toLowerCase() !== "jpeg") {
      toast.warning('Only jpeg is allowed');
      return;
    }

    // Create a promise
    const uploadPromise = new Promise(async (resolve, reject) => {
      if (file) {
        try {
          const url = backendUrl + '/uploadSignature';
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
            if (purpose === 'signature') {
              fetchSingature();
            } else {
              fetchProfilePic();
            }
            resolve(`Image uploaded successfully for ${purpose}`);
          }
        } catch (error) {
          reject(`Error uploading image for ${purpose}`);
        }
      } else {
        reject('Please select an image to upload');
      }

      // Clear file input
      if (fileInputRef.current && fileInputRef.current.value !== null) {
        fileInputRef.current.value = null;
      }
    });

    // Use toast.promise to display toast messages
    toast.promise(uploadPromise, {
      pending: `Uploading image for ${purpose}...`,
      success: `Image uploaded successfully for ${purpose}`,
      error: `Error uploading image for ${purpose}`,
    });
  };


  const getProfileData = async () => {
    const url = backendUrl + '/getUserProfileData';
    const res = await axios.post(url, null, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
      },
    });
    setUserDetails(res.data.userdata);
    setLoading(false);
  };

  useEffect(() => {
    getProfileData();
    fetchSingature();
  }, []);
  return (
    <>
      {loading ? (
        <ComponentLoader />
      ) : (
        <div className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="relative h-35 md:h-65">
            <img
              src={CoverOne}
              alt="profile cover"
              className="h-full w-full rounded-tl-sm rounded-tr-sm object-cover object-center"
            />
          </div>
          <div className="px-4 pb-6 text-center lg:pb-8 xl:pb-11.5">
            <div className="relative mx-auto -mt-22 h-30 w-full max-w-30 rounded-full bg-white/20 p-1 backdrop-blur sm:h-44 sm:max-w-44 sm:p-3">
              <div className="relative drop-shadow-2">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="profile"
                    className={styles.profileImage}
                    style={{
                      width: '200px',
                      height: '150px',
                      borderRadius: '50%',
                    }}
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.noProfileImage}
                    style={{
                      width: '150px',
                      height: '150px',
                      borderRadius: '50%',
                      color: 'black',
                    }}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M12 2a5 5 0 1 1 -5 5l.005 -.217a5 5 0 0 1 4.995 -4.783z" />
                    <path d="M14 14a5 5 0 0 1 5 5v1a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-1a5 5 0 0 1 5 -5h4z" />
                  </svg>
                )}
                <label
                  htmlFor="profile"
                  className="absolute bottom-0 right-0 flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-full bg-primary text-white hover:bg-opacity-90 sm:bottom-2 sm:right-2"
                >
                  <svg
                    className="fill-current"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M4.76464 1.42638C4.87283 1.2641 5.05496 1.16663 5.25 1.16663H8.75C8.94504 1.16663 9.12717 1.2641 9.23536 1.42638L10.2289 2.91663H12.25C12.7141 2.91663 13.1592 3.101 13.4874 3.42919C13.8156 3.75738 14 4.2025 14 4.66663V11.0833C14 11.5474 13.8156 11.9925 13.4874 12.3207C13.1592 12.6489 12.7141 12.8333 12.25 12.8333H1.75C1.28587 12.8333 0.840752 12.6489 0.512563 12.3207C0.184375 11.9925 0 11.5474 0 11.0833V4.66663C0 4.2025 0.184374 3.75738 0.512563 3.42919C0.840752 3.101 1.28587 2.91663 1.75 2.91663H3.77114L4.76464 1.42638ZM5.56219 2.33329L4.5687 3.82353C4.46051 3.98582 4.27837 4.08329 4.08333 4.08329H1.75C1.59529 4.08329 1.44692 4.14475 1.33752 4.25415C1.22812 4.36354 1.16667 4.51192 1.16667 4.66663V11.0833C1.16667 11.238 1.22812 11.3864 1.33752 11.4958C1.44692 11.6052 1.59529 11.6666 1.75 11.6666H12.25C12.4047 11.6666 12.5531 11.6052 12.6625 11.4958C12.7719 11.3864 12.8333 11.238 12.8333 11.0833V4.66663C12.8333 4.51192 12.7719 4.36354 12.6625 4.25415C12.5531 4.14475 12.4047 4.08329 12.25 4.08329H9.91667C9.72163 4.08329 9.53949 3.98582 9.4313 3.82353L8.43781 2.33329H5.56219Z"
                      fill=""
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M7.00004 5.83329C6.03354 5.83329 5.25004 6.61679 5.25004 7.58329C5.25004 8.54979 6.03354 9.33329 7.00004 9.33329C7.96654 9.33329 8.75004 8.54979 8.75004 7.58329C8.75004 6.61679 7.96654 5.83329 7.00004 5.83329ZM4.08337 7.58329C4.08337 5.97246 5.38921 4.66663 7.00004 4.66663C8.61087 4.66663 9.91671 5.97246 9.91671 7.58329C9.91671 9.19412 8.61087 10.5 7.00004 10.5C5.38921 10.5 4.08337 9.19412 4.08337 7.58329Z"
                      fill=""
                    />
                  </svg>
                  <input
                    type="file"
                    name="profile"
                    id="profile"
                    ref={fileInputRef}
                    onChange={(e) => handleUpload('profile', e)}
                    accept=".jpeg, .jpg, .png"
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="mb-1.5 text-2xl font-semibold text-black dark:text-white">
                {userDetails?.username}
              </h3>
              {/* <p className="font-medium">{userDetails?.role}</p> */}
              <Box
                sx={{
                  flex: 2,
                  margin: '2px',
                  marginBottom: '1px',
                  marginRight: '2px',
                  padding: '10px',
                  borderRadius: '10px',
                }}
              >
                <Stack
                  flexDirection="row"
                  flexWrap="wrap"
                  sx={{ margin: '5px' }}
                  justifyContent="space-around"
                >
                  <Typography
                    variant="body1"
                    sx={{ marginY: '15px', width: '200px' }}
                  >
                    <b>Branch:</b>
                    <br /> {userDetails.branch ? userDetails.branch : '---'}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ marginY: '15px', width: '200px' }}
                  >
                    <b>Department:</b>
                    <br />{' '}
                    {userDetails?.departmentsInvolvedIn.length
                      ? userDetails?.departmentsInvolvedIn
                        ?.map((item) => item.departmentName)
                        .join(', ')
                      : '---'}
                  </Typography>
                </Stack>
                <Stack
                  flexDirection="row"
                  flexWrap="wrap"
                  sx={{ margin: '5px' }}
                  justifyContent="space-around"
                >
                  <Typography
                    variant="body1"
                    sx={{ marginY: '15px', width: '200px' }}
                  >
                    <b>Email:</b>
                    <br />
                    {userDetails.email ? userDetails.email : '---'}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ marginY: '15px', width: '200px' }}
                  >
                    <b>Role:</b>
                    <br /> {userDetails.role ? userDetails.role : '---'}
                  </Typography>
                </Stack>
                <Stack
                  flexDirection="row"
                  flexWrap="wrap"
                  sx={{ margin: '5px' }}
                  justifyContent="center"
                  alignItems="center"
                >
                  <Typography variant="body1" sx={{ marginY: '15px' }}>
                    <b>Signature:</b>
                    <br />
                    {signatureImage ? (
                      // <img src={signatureImage}></img>
                      <Button
                        sx={{ textTransform: 'none' }}
                        onClick={() => setSignatureViewModalOpen(true)}
                      >
                        View Signature
                      </Button>
                    ) : (
                      <p style={{ color: 'red' }}>
                        Please upload your signature
                      </p>
                    )}
                  </Typography>
                </Stack>

                <Stack alignItems="center" mt={3}>
                  <Typography variant="h5" sx={{ marginBottom: '15px' }}>
                    Upload Signature:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={(e) => handleUpload('signature', e)}
                      id="signature-upload-input"
                    />

                    <label htmlFor="signature-upload-input">
                      <Button variant="contained" component="span">
                        Choose File
                      </Button>
                    </label>
                    <Typography variant="body2" sx={{ marginLeft: '10px' }}>
                      (Image files only)
                    </Typography>
                  </Box>
                </Stack>

                {/* <div
                  style={{
                    padding: '10px',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <Alert severity="error" icon={<InfoOutlined />}>
                    <AlertTitle>{'Note :'}</AlertTitle>
                    <Typography sx={{ my: 0.4 }}>
                      Only the following file types are allowed for upload :
                    </Typography>
                    <Box>
                      <Chip
                        label={'JPEG'}
                        color="error"
                        // variant="outlined"
                        sx={{
                          padding: 0,
                          height: '22px',
                          mr: 0.6,
                          my: 0.4,
                        }}
                      />
                    </Box>
                  </Alert>
                </div> */}
              </Box>
            </div>
          </div>
        </div>
      )}
      <Modal
        open={signatureViewModalOpen}
        onClose={closeSignatureViewModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={signatureModalStyle}>
          <Stack justifyContent="center">
            <img width={170} src={signatureImage} alt="signature" />
          </Stack>
        </Box>
      </Modal>
    </>
  );
};

export default Profile;
