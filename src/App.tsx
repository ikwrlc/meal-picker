import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import OrderPage from './pages/OrderPage'
import SelectPage from './pages/SelectPage'
import PreviewPage from './pages/PreviewPage'
import ShoppingPage from './pages/ShoppingPage'
import DishesPage from './pages/DishesPage'
import AddDishPage from './pages/AddDishPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/order" element={<OrderPage />} />
                <Route path="/select" element={<SelectPage />} />
                <Route path="/preview" element={<PreviewPage />} />
                <Route path="/shopping" element={<ShoppingPage />} />
                <Route path="/dishes" element={<DishesPage />} />
                <Route path="/dishes/add" element={<AddDishPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/stats" element={<Navigate to="/history" replace />} />
                <Route path="/settings" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
