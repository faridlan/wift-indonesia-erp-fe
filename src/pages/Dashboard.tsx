import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
      <p className="text-muted-foreground">Selamat datang, {user?.email}</p>
    </div>
  );
};

export default Dashboard;
