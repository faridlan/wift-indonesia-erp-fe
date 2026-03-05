import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react"; // Import ikon mata

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // State baru
  const [showPassword, setShowPassword] = useState(false); // State show/hide
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { session, loading: authLoading } = useAuth();

  // Tambahkan state ini di atas
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fungsi helper untuk validasi
  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!email) newErrors.email = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Format email tidak valid";

    if (!password) newErrors.password = "Password wajib diisi";
    else if (password.length < 6) newErrors.password = "Password minimal 6 karakter";

    if (isSignUp) {
      if (!fullName) newErrors.fullName = "Nama lengkap wajib diisi";
      if (password !== confirmPassword) newErrors.confirmPassword = "Password tidak cocok";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (session) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi Confirm Password khusus Sign Up
    if (isSignUp && password !== confirmPassword) {
      toast({
        title: "Password tidak cocok",
        description: "Pastikan konfirmasi password sama dengan password Anda.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Berhasil", description: "Cek email untuk konfirmasi akun." });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold tracking-wider text-primary">WIFT INDONESIA</CardTitle>
          <CardDescription>{isSignUp ? "Buat akun baru" : "Masuk ke akun Anda"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validate()) handleSubmit(e);
            }}
            className="space-y-4"
            noValidate // Mematikan validasi default browser
          >
            {/* Field Nama Lengkap */}
            {isSignUp && (
              <div className="space-y-1">
                <Label htmlFor="fullName" className={errors.fullName ? "text-destructive" : ""}>
                  Nama Lengkap
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={errors.fullName ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.fullName && <p className="text-[11px] text-destructive font-medium">{errors.fullName}</p>}
              </div>
            )}

            {/* Field Email */}
            <div className="space-y-1">
              <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.email && <p className="text-[11px] text-destructive font-medium">{errors.email}</p>}
            </div>

            {/* Field Password */}
            <div className="space-y-1">
              <Label htmlFor="password" className={errors.password ? "text-destructive" : ""}>Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] text-destructive font-medium">{errors.password}</p>}
            </div>

            {/* Field Confirm Password */}
            {isSignUp && (
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className={errors.confirmPassword ? "text-destructive" : ""}>
                  Konfirmasi Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.confirmPassword && <p className="text-[11px] text-destructive font-medium">{errors.confirmPassword}</p>}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Memproses..." : isSignUp ? "Daftar Akun" : "Masuk Sekarang"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setConfirmPassword(""); // Reset confirm pass saat pindah mode
              }}
              className="text-primary font-semibold underline-offset-4 hover:underline"
            >
              {isSignUp ? "Masuk di sini" : "Daftar di sini"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;