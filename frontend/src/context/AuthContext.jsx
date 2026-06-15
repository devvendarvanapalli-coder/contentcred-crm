import { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../api/medApi";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("med_token");
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => localStorage.removeItem("med_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function logout() {
    localStorage.removeItem("med_token");
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
