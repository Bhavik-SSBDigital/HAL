import { useState } from 'react';
import {
  IconTrash,
  IconRestore,
  IconDownload,
  IconSquareLetterX,
  IconDotsVertical,
  IconSettings,
} from '@tabler/icons-react';
import CustomCard from '../../CustomComponents/CustomCard';
import TopLoader from '../../common/Loader/TopLoader';
import CustomModal from '../../CustomComponents/CustomModal';
import { ImageConfig } from '../../config/ImageConfig';
import CustomButton from '../../CustomComponents/CustomButton';
import moment from 'moment';

const RecycleBin = () => {
  const [deletedFiles, setDeletedFiles] = useState([
    { id: 1, name: 'Document1.pdf', type: 'pdf' },
    { id: 2, name: 'Image1.png', type: 'png' },
    { id: 3, name: 'Presentation.pptx', type: 'ppt' },
    { id: 4, name: 'Notes.txt', type: 'txt' },
  ]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProperties, setShowProperties] = useState(false);

  //  network calls
  const restoreFile = (item) => {
    setDeletedFiles(deletedFiles.filter((file) => file.id !== item.id));
    setIsMenuOpen(false);
  };

  const deletePermanently = (item) => {
    setDeletedFiles(deletedFiles.filter((file) => file.id !== item.id));
    setIsMenuOpen(false);
  };

  return (
    <>
      {actionsLoading && <TopLoader />}
      <div className="relative flex flex-col h-[calc(100vh-160px)] gap-1 mt-1">
        <div className="flex-1 max-h-[calc(100vh-160px)] overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            {deletedFiles?.length > 0 ? (
              deletedFiles?.map((item) => (
                <div key={item.id} className="relative">
                  <CustomCard
                    title={item.name}
                    className="flex flex-row items-center justify-center p-4 hover:shadow-lg cursor-pointer relative"
                    click={() => setSelectedItem(item)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setIsMenuOpen(true);
                      }}
                      className="absolute top-1 right-0 hover:bg-blue-50 p-1 rounded-full"
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
                    <h2 className="font-semibold truncate w-full text-center">
                      {item.name}
                    </h2>
                  </CustomCard>
                </div>
              ))
            ) : (
              <CustomCard className="w-full text-center">
                <h2 className="font-semibold">Recycle Bin is empty</h2>
              </CustomCard>
            )}
          </div>
        </div>
      </div>

      {selectedItem && (
        <CustomModal isOpen={isMenuOpen}>
          <h3 className="font-semibold mb-3">{selectedItem.name}</h3>
          <div className="flex flex-col gap-2">
            <CustomButton
              variant="none"
              text={
                <>
                  <IconRestore size={18} /> Restore
                </>
              }
              className="w-full flex items-center gap-2"
              click={() => restoreFile(selectedItem)}
            />
            <CustomButton
              variant="none"
              text={
                <>
                  <IconTrash size={18} /> Delete Permanently
                </>
              }
              className="w-full flex items-center gap-2"
              click={() => deletePermanently(selectedItem)}
            />
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
                setShowProperties(true); // Open properties modal
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

      <CustomModal isOpen={showProperties}>
        <div className="flex justify-between items-center border-b pb-2 mb-4">
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
    </>
  );
};

export default RecycleBin;
