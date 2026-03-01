import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const SuperadminRoute = ({ children }: { children: React.ReactNode }) => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (role !== "superadmin") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default SuperadminRoute;
