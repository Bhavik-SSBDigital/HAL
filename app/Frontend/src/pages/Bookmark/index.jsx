import { useEffect, useState } from 'react';
import {
  IconSquareLetterX,
  IconDotsVertical,
  IconSettings,
  IconArchiveOff,
  IconBookmarkFilled,
} from '@tabler/icons-react';
import ViewFile from '../view/View';
import CustomCard from '../../CustomComponents/CustomCard';
import TopLoader from '../../common/Loader/TopLoader';
import CustomModal from '../../CustomComponents/CustomModal';
import { ImageConfig } from '../../config/ImageConfig';
import CustomButton from '../../CustomComponents/CustomButton';
import folderIcon from '../../assets/images/folder.png';
import moment from 'moment';
import { toast } from 'react-toastify';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import CustomTextField from '../../CustomComponents/CustomTextField';

// Bookmark APIs
import {
  GetBookmarkedDocuments,
  RemoveBookmark,
  ViewDocument,
} from '../../common/Apis';

const Bookmark = () => {
  const [loading, setLoading] = useState(false);
  const [bookmarkedDocs, setBookmarkedDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [fileView, setFileView] = useState();

  // Fetch bookmarked docs
  const getData = async () => {
    setLoading(true);
    try {
      const response = await GetBookmarkedDocuments();
      setBookmarkedDocs(response?.data?.documents || []);
    } catch (error) {
      console.error(error?.response?.data?.message || error?.message);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  // Remove bookmark
  const removeBookmark = async (item) => {
    setActionsLoading(true);
    try {
      await RemoveBookmark(item.id);
      setBookmarkedDocs(bookmarkedDocs.filter((doc) => doc.id !== item.id));
      toast.success('Bookmark removed');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  // View file handler
  const handleViewFile = async (name, path, fileId, type, isEditing) => {
    setActionsLoading(true);
    try {
      const fileData = await ViewDocument(name, path, type, fileId);
      setFileView(fileData);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    getData();
  }, []);

  // Search filter
  useEffect(() => {
    if (searchTerm.trim()) {
      setFilteredDocs(
        bookmarkedDocs.filter((file) =>
          file.name.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    } else {
      setFilteredDocs(bookmarkedDocs);
    }
  }, [searchTerm, bookmarkedDocs]);

  if (loading) return <ComponentLoader />;

  return (
    <>
      {actionsLoading && <TopLoader />}

      {/* Search bar */}
      <div className="flex items-center gap-2 mt-3 mb-2">
        <CustomTextField
          type="text"
          placeholder="Search bookmarked documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full outline-none text-sm"
        />
      </div>

      {/* Bookmarked docs grid */}
      <div className="flex-1 max-h-[calc(100vh-160px)] overflow-auto mt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((item) => (
              <div key={item.id} className="relative">
                <CustomCard
                  className="flex flex-row items-center justify-center p-4 hover:shadow-lg cursor-pointer relative"
                  onDoubleClick={() =>
                    handleViewFile(
                      item?.name,
                      item?.path,
                      item?.id,
                      item?.type,
                      false,
                    )
                  }
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                      setIsMenuOpen(true);
                    }}
                    className="absolute top-1 right-0 hover:bg-blue-50 p-1 rounded-[50%]"
                  >
                    <IconDotsVertical size={22} />
                  </button>
                  <img
                    src={
                      item.type !== 'folder'
                        ? ImageConfig[item.type] || ImageConfig['default']
                        : folderIcon
                    }
                    className="h-12 p-2"
                    alt={item.type}
                  />
                  <h2 className="cursor-text font-semibold truncate w-full text-center">
                    {item.name}
                  </h2>
                </CustomCard>
              </div>
            ))
          ) : (
            <CustomCard className="w-full text-center">
              <h2 className="font-semibold">No bookmarks found</h2>
            </CustomCard>
          )}
        </div>
      </div>

      {/* Actions Modal */}
      {selectedItem && (
        <CustomModal isOpen={isMenuOpen}>
          <h3 className="font-semibold mb-3">{selectedItem.name}</h3>
          <div className="flex flex-col gap-2">
            {selectedItem.type !== 'folder' && (
              <CustomButton
                variant="none"
                text={
                  <>
                    <IconBookmarkFilled size={18} /> Remove Bookmark
                  </>
                }
                className="w-full flex items-center gap-2"
                click={() => {
                  setIsMenuOpen(false);
                  removeBookmark(selectedItem);
                }}
                disabled={actionsLoading}
              />
            )}
            <CustomButton
              variant="none"
              text={
                <>
                  <IconSettings size={18} /> Properties
                </>
              }
              className="w-full flex items-center gap-2"
              click={() => {
                setIsMenuOpen(false);
                setShowProperties(true);
              }}
              disabled={actionsLoading}
            />
          </div>
          <CustomButton
            variant="danger"
            text={
              <>
                <IconSquareLetterX size={18} /> Close
              </>
            }
            className="w-full flex items-center gap-2 mt-4"
            click={() => setIsMenuOpen(false)}
          />
        </CustomModal>
      )}

      {/* Properties Modal */}
      <CustomModal isOpen={showProperties}>
        <div className="flex justify-between items-center border-b pb-2 mb-4 gap-3">
          <h2 className="text-lg font-semibold">
            {selectedItem?.name} Properties
          </h2>
          <button
            onClick={() => setShowProperties(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <IconSquareLetterX className="hover:text-red-500" />
          </button>
        </div>
        <div className="space-y-2">
          <p className="flex justify-between">
            <span className="font-medium">Name:</span> {selectedItem?.name}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Path:</span> {selectedItem?.path}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Type:</span> {selectedItem?.type}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Size:</span> {selectedItem?.size}{' '}
            bytes
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Created On:</span>{' '}
            {moment(selectedItem?.createdOn).format('DD-MM-YYYY')}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Last Updated:</span>{' '}
            {moment(selectedItem?.lastUpdated).format('DD-MM-YYYY')}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Last Accessed:</span>{' '}
            {moment(selectedItem?.lastAccessed).format('DD-MM-YYYY')}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Rejected:</span>{' '}
            {selectedItem?.isRejected ? 'Yes' : 'No'}
          </p>
        </div>
      </CustomModal>

      {/* View File Modal */}
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

export default Bookmark;
