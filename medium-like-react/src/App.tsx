import {
  createBrowserRouter,
  RouterProvider,
  ScrollRestoration
} from 'react-router-dom';
import Layout from './components/Layout';
import FeedPage from './pages/FeedPage';
import ReadPage from './pages/ReadPage';
import ShortPage from './pages/ShortPage';
import SavedPage from './pages/SavedPage';
import ProfilePage from './pages/ProfilePage';
import WritePage from './pages/WritePage';
import LoginPage from './pages/LoginPage';
import { getHistoryScrollKey } from './hooks/useHistoryOverlay.ts';

// Route table. The Layout wraps every page and renders the shared
// header + an <Outlet/>; ScrollRestoration lives inside it so each
// page transition resets the scroll position UNLESS the user navigated
// via back/forward, in which case the previous scroll is restored
// (this fixes the Barba-era "back returns to top" bug).
const router = createBrowserRouter([
  {
    element: (
      <>
        <Layout />
        <ScrollRestoration getKey={getHistoryScrollKey} />
      </>
    ),
    children: [
      { path: '/',         element: <FeedPage /> },
      { path: '/feed',     element: <FeedPage /> },
      { path: '/read/:slug',  element: <ReadPage /> },
      { path: '/short/:slug', element: <ShortPage /> },
      { path: '/saved',    element: <SavedPage /> },
      { path: '/profile',  element: <ProfilePage /> },
      { path: '/write',    element: <WritePage /> },
      { path: '/login',    element: <LoginPage /> },
      { path: '*',         element: <FeedPage /> }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
