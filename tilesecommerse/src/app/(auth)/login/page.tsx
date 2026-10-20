"use client";

import { PasswordInput } from "@/components/ui/form/PasswordInput";
import Link from "next/link";
import { FaGoogle } from "react-icons/fa6";
import { MdError } from "react-icons/md";

import { useAuthMutation } from "@/hooks/auth";
import { FormEvent, useRef } from "react";
import LoadingButton from "@/components/ui/loadingButton";

const Login = () => {
  const { signIn, signInWithGoogle } = useAuthMutation();

  const emailRef = useRef<HTMLInputElement>(null!);
  const passwordRef = useRef<HTMLInputElement>(null!);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    signIn.mutate({
      email: emailRef.current.value,
      password: passwordRef.current.value,
    });
  };

  const error = signIn.error || signInWithGoogle.error;
  const isLoading = signIn.isPending || signInWithGoogle.isPending;

  return (
    <section className="min-h-screen relative overflow-hidden bg-black px-4 py-12 flex items-center justify-center">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-white mb-3 tracking-wide">
            Welcome Back
          </h1>
          <p className="text-gray-500 text-sm font-light tracking-wide">Sign in to your account</p>
        </div>

        {/* Form Card */}
        <div className="relative">
          {/* Subtle border glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-b from-zinc-700/50 via-zinc-800/30 to-zinc-900/10 rounded-2xl"></div>

          <div className="relative bg-zinc-950/90 backdrop-blur-sm rounded-2xl p-8 md:p-10 border border-zinc-800/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 flex items-start gap-3 animate-shake">
                  <MdError className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-300 font-light">
                    {error instanceof Error
                      ? error.message
                      : "Invalid email or password"}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 tracking-wider uppercase ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  ref={emailRef}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-all duration-200 font-light"
                  name="email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 tracking-wider uppercase ml-1">
                  Password
                </label>
                <PasswordInput
                  ref={passwordRef}
                  name="password"
                  required
                  disabled={isLoading}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700/50 transition-all duration-200 font-light"
                />
              </div>

              <LoadingButton
                type="submit"
                className="w-full bg-white text-black font-medium py-3.5 px-6 rounded-xl hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                loading={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </LoadingButton>

              <div className="relative flex items-center justify-center py-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative bg-zinc-950/90 px-4">
                  <span className="text-xs text-gray-600 font-light tracking-wide">OR</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signInWithGoogle.mutate()}
                disabled={signInWithGoogle.isPending}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-transparent border border-zinc-800 text-gray-300 font-light rounded-xl hover:bg-zinc-900/50 hover:border-zinc-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaGoogle className="w-4 h-4" />
                Continue with Google
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm font-light">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-white hover:text-gray-300 transition-colors font-normal"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </section>
  );
};

export default Login;
