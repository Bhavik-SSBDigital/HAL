import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import Profile from './pages/Profile';
import BranchList from './pages/Branches/List';
import UserList from './pages/Users/List';
import RolesList from './pages/Roles/List';
import WorkList from './pages/Processes/List';
import PublishedList from './pages/Published/List';
import DepartmentList from './pages/Department/List';
import NewBranch from './pages/Branches/NewBranch';
import NewUser from './pages/Users/NewUser';
import NewRole from './pages/Roles/NewRole';
import NewDepartment from './pages/Department/NewDepartment';
// import FileSystem from './pages/FileSystem/MenuBar/FileSystem';
import FileSystem from './pages/FileSystem';
import SignIn from './pages/Authentication/SignIn';
import SignUp from './pages/Authentication/SignUp';
import ViewProcess from './pages/Processes/ViewProcess';
import MonitorView from './pages/Monitor/View';
import ProcessInitForm from './pages/Processes/InitiateProcess';
import Monitor from './pages/Monitor/Monitor';
import { useDispatch } from 'react-redux';
import { onReload } from './Slices/PathSlice';
import NotFoundPage from './pages/404/NotFoundPage';
import DefaultLayout from './layout/DefaultLayout';
import ForgotPass from './pages/Authentication/ForgotPass';
import PhysicalDocuments from './pages/PhysicalDocuments/PhysicalDocuments';
import SearchDocument from './pages/SearchDocuments/SearchDocument';
import MeetingManager from './pages/Meeting';
import MetaData from './pages/MetaData';
// import Editor from './pages/view/Editor';
// import History from './pages/Meeting/History';

// editors
// import DraftEditor from './pages/view/Editor/DraftEditor';
import ReactQuillEditor from './pages/view/Editor/ReactQuillEditor';
// import SlateEditor from './pages/view/Editor/SlateEditor';
import TinyMCEEditor from './pages/view/Editor/TinyMCEEditor';
// import DraftEditor from './pages/view/Editor/DraftEditor';
import SlateEditor from './pages/view/Editor/SlateEditor';
import Workflows from './pages/workflows';
import RecycleBin from './pages/RecycleBin';
import Recommendations from './pages/Recommendations';
import ViewRecommendation from './pages/Recommendations/ViewRecommendation';
import Logs from './pages/Logs/List';
import ViewLog from './pages/Logs/ViewLog';
import Dashboard from './pages/Dashboard';
import TimelinePage from './pages/Timeline/TimelinePage';
import Archive from './pages/Archive';

function App() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState<boolean>(true);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!pathname.includes('files')) {
      dispatch(onReload('..'));
    }
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const navigate = useNavigate();
  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      navigate('/auth/signin');
    }

    // Block right-click context menu
    const preventContextMenu = (e) => {
      e.preventDefault();
    };

    // Block PrintScreen and Ctrl/Cmd + P
    const handleKeyDown = (e) => {
      const key = e.key;

      // Block PrintScreen key
      if (key === 'PrintScreen') {
        e.preventDefault();
        alert('Screenshots are not allowed.');
        document.body.style.filter = 'blur(10px)';
        setTimeout(() => {
          document.body.style.filter = 'none';
        }, 1000);
      }

      // Block Ctrl/Cmd + P
      if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'p') {
        e.preventDefault();
        alert('Printing is disabled.');
      }
    };

    // Register events
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', preventContextMenu);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  return loading ? (
    <Loader />
  ) : (
    <>
      <Routes>
        <Route
          index
          element={
            <DefaultLayout>
              <PageTitle title="Dashboard | Overall" />
              <Dashboard />
            </DefaultLayout>
          }
        />
        <Route
          path="/timeline/:id"
          element={
            <DefaultLayout>
              <PageTitle title="Timeline" />
              <TimelinePage />
            </DefaultLayout>
          }
        />
        <Route
          path="/monitor"
          element={
            <DefaultLayout>
              <PageTitle title="Monitor Processes" />
              <Monitor />
            </DefaultLayout>
          }
        />
        <Route
          path="/monitor/view"
          element={
            <DefaultLayout>
              <PageTitle title="View Process" />
              <MonitorView />
            </DefaultLayout>
          }
        />
        <Route
          path="/files"
          element={
            <DefaultLayout>
              <PageTitle title="Files" />
              <FileSystem />
            </DefaultLayout>
          }
        />
        <Route
          path="/bin"
          element={
            <DefaultLayout>
              <PageTitle title="Recycle Bin" />
              <RecycleBin />
            </DefaultLayout>
          }
        />
        <Route
          path="/archive"
          element={
            <DefaultLayout>
              <PageTitle title="Archive Files" />
              <Archive />
            </DefaultLayout>
          }
        />
        <Route
          path="/Search"
          element={
            <DefaultLayout>
              <PageTitle title="Search Document" />
              <SearchDocument />
            </DefaultLayout>
          }
        />
        <Route
          path="/physicalDocuments"
          element={
            <DefaultLayout>
              <PageTitle title="Physical Documents" />
              <PhysicalDocuments />
            </DefaultLayout>
          }
        />
        <Route
          path="/branches/list"
          element={
            <DefaultLayout>
              <PageTitle title="Branches List" />
              <BranchList />
            </DefaultLayout>
          }
        />
        <Route
          path="/branches/createNew"
          element={
            <DefaultLayout>
              <PageTitle title="Create Branch" />
              <NewBranch />
            </DefaultLayout>
          }
        />
        <Route
          path="/branches/edit/:id"
          element={
            <DefaultLayout>
              <PageTitle title="Edit Branch" />
              <NewBranch />
            </DefaultLayout>
          }
        />
        <Route
          path="/users/list"
          element={
            <DefaultLayout>
              <PageTitle title="Users List" />
              <UserList />
            </DefaultLayout>
          }
        />
        <Route
          path="/users/edit/:id"
          element={
            <DefaultLayout>
              <PageTitle title="Edit User" />
              <NewUser />
            </DefaultLayout>
          }
        />
        <Route
          path="/users/createNew"
          element={
            <DefaultLayout>
              <PageTitle title="Create User" />
              <NewUser />
            </DefaultLayout>
          }
        />
        <Route
          path="/roles/list"
          element={
            <DefaultLayout>
              <PageTitle title="Roles List" />
              <RolesList />
            </DefaultLayout>
          }
        />
        <Route
          path="/roles/createNew"
          element={
            <DefaultLayout>
              <PageTitle title="Create role" />
              <NewRole />
            </DefaultLayout>
          }
        />
        <Route
          path="/roles/edit/:id"
          element={
            <DefaultLayout>
              <PageTitle title="Edit Role" />
              <NewRole />
            </DefaultLayout>
          }
        />
        <Route
          path="/departments/list"
          element={
            <DefaultLayout>
              <PageTitle title="Department List" />
              <DepartmentList />
            </DefaultLayout>
          }
        />
        <Route
          path="/departments/createNew"
          element={
            <DefaultLayout>
              <PageTitle title="Create Department" />
              <NewDepartment />
            </DefaultLayout>
          }
        />
        <Route
          path="/departments/edit/:id"
          element={
            <DefaultLayout>
              <PageTitle title="Edit Role" />
              <NewDepartment />
            </DefaultLayout>
          }
        />
        <Route
          path="/processes/work"
          element={
            <DefaultLayout>
              <PageTitle title="Work List" />
              <WorkList />
            </DefaultLayout>
          }
        />

        {/* logs */}
        <Route
          path="/logs"
          element={
            <DefaultLayout>
              <PageTitle title="Logs" />
              <Logs />
            </DefaultLayout>
          }
        />
        <Route
          path="/logs/:id"
          element={
            <DefaultLayout>
              <PageTitle title="View Log" />
              <ViewLog />
            </DefaultLayout>
          }
        />

        <Route
          path="/recommendations"
          element={
            <DefaultLayout>
              <PageTitle title="Recommendations" />
              <Recommendations />
            </DefaultLayout>
          }
        />
        <Route
          path="/recommendation/:id"
          element={
            <DefaultLayout>
              <PageTitle title="View Recommedation" />
              <ViewRecommendation />
            </DefaultLayout>
          }
        />
        <Route
          path="/process/view/:id"
          element={
            <DefaultLayout>
              <PageTitle title="View Process" />
              <ViewProcess />
            </DefaultLayout>
          }
        />
        <Route
          path="/processes/initiate"
          element={
            <DefaultLayout>
              <PageTitle title="Initiate Process" />
              <ProcessInitForm />
            </DefaultLayout>
          }
        />

        <Route
          path="/processes/published"
          element={
            <DefaultLayout>
              <PageTitle title="Published List" />
              <PublishedList />
            </DefaultLayout>
          }
        />
        <Route
          path="/auth/signin"
          element={
            <>
              <PageTitle title="Signin" />
              <SignIn />
            </>
          }
        />
        <Route
          path="/auth/signup"
          element={
            <>
              <PageTitle title="Signup" />
              <SignUp />
            </>
          }
        />
        <Route
          path="/auth/forgot"
          element={
            <>
              <PageTitle title="Forgot Password" />
              <ForgotPass />
            </>
          }
        />
        <Route
          path="/profile"
          element={
            <DefaultLayout>
              <PageTitle title="Profile" />
              <Profile />
            </DefaultLayout>
          }
        />
        <Route
          path="/meeting-manager"
          element={
            <DefaultLayout>
              <PageTitle title="Meeting" />
              <MeetingManager />
            </DefaultLayout>
          }
        />
        <Route
          path="/meta-data"
          element={
            <DefaultLayout>
              <PageTitle title="meta-data" />
              <MetaData />
            </DefaultLayout>
          }
        />
        {/* editors route */}
        {/* <Route
          path="/editor"
          element={
            <DefaultLayout>
              <PageTitle title="editor" />
              <Editor />
            </DefaultLayout>
          }
        /> */}
        {/* <Route
          path="/draft"
          element={
            <DefaultLayout>
              <PageTitle title="Draft.js Editor" />
              <DraftEditor />
            </DefaultLayout>
          }
        /> */}

        {/* Route for React Quill Editor */}
        <Route
          path="/react-quill"
          element={
            <DefaultLayout>
              <PageTitle title="React Quill Editor" />
              <ReactQuillEditor />
            </DefaultLayout>
          }
        />
        {/* Route for Slate Editor */}
        <Route
          path="/slate"
          element={
            <DefaultLayout>
              <PageTitle title="Slate Editor" />
              <SlateEditor />
            </DefaultLayout>
          }
        />
        {/* Route for TinyMCE Editor */}
        <Route
          path="/tinymce"
          element={
            <DefaultLayout>
              <PageTitle title="TinyMCE Editor" />
              <TinyMCEEditor />
            </DefaultLayout>
          }
        />

        <Route
          path="/workflows"
          element={
            <DefaultLayout>
              <PageTitle title="Workflows" />
              <Workflows />
            </DefaultLayout>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
export default App;
