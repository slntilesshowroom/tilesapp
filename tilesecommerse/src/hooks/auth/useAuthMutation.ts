import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const useAuthMutation = () => {
  const router = useRouter();

  const signIn = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });

      if (result.error) {
        throw new Error((result.error as any)?.message || "Invalid email or password");
      }

      return result;
    },
    onSuccess: (result) => {
      // Redirect based on user role
      const user = result.data;

      if (user?.role === 'admin') {
        toast.success("Welcome Admin!");
        router.push("/admin");
      } else {
        toast.success("Login successful!");
        router.push("/");
      }

      router.refresh();
    },
    onError: (error: any) => {
      console.error(error);
      const msg = error?.message || "";
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("password") || msg.toLowerCase().includes("credentials")) {
        toast.error("Incorrect email or password. Please try again.");
      } else if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no account")) {
        toast.error("No account found with this email. Please sign up first.");
      } else if (msg) {
        toast.error(msg);
      } else {
        toast.error("Sign in failed. Please check your connection and try again.");
      }
    },
  });

  const signUp = useMutation({
    mutationFn: async ({
      email,
      password,
      name,
      gender,
    }: {
      email: string;
      password: string;
      name: string;
      gender?: string;
    }) => {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
        gender,
        callbackURL: "/",
      });

      if (result.error) {
        throw new Error((result.error as any)?.message || "Error creating account");
      }

      return result;
    },
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (error: any) => {
      console.error(error);
      const msg = error?.message || "";
      if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("email taken")) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else if (msg.toLowerCase().includes("password")) {
        toast.error("Password must be at least 8 characters long.");
      } else if (msg) {
        toast.error(msg);
      } else {
        toast.error("Could not create account. Please check your details and try again.");
      }
    },
  });

  const signInWithGoogle = useMutation({
    mutationFn: async () => {
      return await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    },
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || "Google sign in failed. Please try again or use email and password.");
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || "Sign out failed. Please refresh the page and try again.");
    },
  });

  return {
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };
};
