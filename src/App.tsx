// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import RunDetailsPage from './pages/RunDetailsPage';
import NamTrainerPage from './pages/NamTrainerPage';
import RunListPage from './pages/RunListPage';
import ThemeTestPage from './pages/ThemeTestPage';
function App() {
  return (
    <Routes>
      <Route path="/" element={<NamTrainerPage />} />
      <Route path="/runs" element={<RunListPage />} />
      <Route path="/runs/:id" element={<RunDetailsPage />} />
      <Route path="/theme-test" element={<ThemeTestPage />} />
      {/* add other routes here */}
    </Routes>
  );
}

export default App;
