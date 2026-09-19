import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import { CartProvider } from './context/CartContext';
import './styles/styles.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CartProvider><HomePage /></CartProvider>} />
        <Route path="/gestion-iplay" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App
