import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";
import { localStorageDb } from "@/lib/db/localStorageDb";
import type { UserProfile } from "@/lib/db/localStorageDb";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const [user, setUserState] = useState<UserProfile | null>(() => localStorageDb.getUser());
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback((name: string) => {
    setIsLoading(true);
    const profile = { name: name.trim() };
    localStorageDb.setUser(profile);
    setUserState(profile);
    
    // Initialize default progress if not exists
    localStorageDb.getProgress(); 
    
    setIsLoading(false);
    navigate("/dashboard");
  }, [navigate]);

  const logout = useCallback(() => {
    setIsLoading(true);
    localStorageDb.setUser(null);
    setUserState(null);
    setIsLoading(false);
    navigate(redirectPath);
  }, [navigate, redirectPath]);

  const refetchUser = useCallback(() => {
    setUserState(localStorageDb.getUser());
  }, []);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = window.location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      logout,
      login,
      refresh: refetchUser,
    }),
    [user, isLoading, logout, login, refetchUser]
  );
}
