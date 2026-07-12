import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface TenantOption {
  id: string;
  name: string;
  active: boolean;
}

interface TenantContextState {
  selectedTenant: TenantOption | null;
  selectTenant: (t: TenantOption | null) => void;
}

const TenantContext = createContext<TenantContextState | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [selectedTenant, setSelectedTenant] = useState<TenantOption | null>(null);

  const selectTenant = useCallback((t: TenantOption | null) => {
    setSelectedTenant(t);
  }, []);

  return (
    <TenantContext.Provider value={{ selectedTenant, selectTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext(): TenantContextState {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenantContext must be used within TenantProvider");
  return ctx;
}
