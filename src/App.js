// App.js  (updated — uses React Router v6 + AppRoutes)
// MBL QMS — Root app entry point
// AuthProvider wraps everything
// BrowserRouter enables URL-based navigation
// AppRoutes handles all route definitions

import { BrowserRouter } from "react-router-dom";
import { AuthProvider }  from "./context/AuthContext";
import AppRoutes         from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
