import React from 'react';
import { ArrowRight, BarChart3, CheckCircle2, Globe2, Layers, ShieldCheck, Users2 } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const featureCards = [
  {
    icon: Layers,
    title: 'Workspace Isolation',
    description: 'Each account runs in its own workspace. Your trainings, users, and reports stay private.',
  },
  {
    icon: Users2,
    title: 'Role-based Access',
    description: 'One super admin for global oversight, with admins and sub-admins managed per workspace.',
  },
  {
    icon: BarChart3,
    title: 'Attendance Analytics',
    description: 'Track participation in real time and export clean attendance records in seconds.',
  },
];

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 overflow-x-hidden" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        .landing-fade-up {
          animation: fadeUp 700ms ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .landing-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      <header className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
              TrainTrack
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onSignIn} className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.2),transparent_42%),radial-gradient(circle_at_90%_10%,rgba(251,191,36,0.2),transparent_38%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 lg:pt-16 lg:pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="landing-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure multi-workspace attendance platform
            </p>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
              Attendance that feels
              <span className="block text-cyan-700">effortless and modern.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-xl">
              Manage trainings, users, QR check-ins, and analytics in one fast dashboard. Built for organizations that run multiple
              programs and teams.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
              >
                Create Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onSignIn}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 hover:border-slate-400 transition-colors"
              >
                I already have an account
              </button>
            </div>
          </div>

          <div className="landing-fade-up [animation-delay:150ms]">
            <div className="landing-float rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/70 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 font-semibold">Live Workspace Snapshot</p>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Online</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Active Trainings</p>
                  <p className="text-2xl font-bold mt-1">24</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Check-ins Today</p>
                  <p className="text-2xl font-bold mt-1">1,284</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Workspaces</p>
                  <p className="text-2xl font-bold mt-1">17</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">Completion Rate</p>
                  <p className="text-2xl font-bold mt-1">93%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center landing-fade-up">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            Features built for real teams
          </h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            TrainTrack gives you control, speed, and clarity across every stage of your training lifecycle.
          </p>
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {featureCards.map((feature, idx) => (
            <div
              key={feature.title}
              className="landing-fade-up rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              style={{ animationDelay: `${idx * 120 + 100}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-700 flex items-center justify-center">
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div className="landing-fade-up">
            <p className="text-sm font-semibold text-cyan-700 uppercase tracking-wide">About TrainTrack</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
              Built for growing training operations
            </h2>
            <p className="mt-4 text-slate-600">
              From NGOs and academies to enterprise L&D teams, TrainTrack helps you scale attendance management without losing control.
              Every workspace is isolated, every role is intentional, and every report is export-ready.
            </p>
          </div>
          <div className="landing-fade-up [animation-delay:120ms] grid gap-4">
            <div className="rounded-xl bg-[#ecfeff] border border-cyan-100 p-4 flex gap-3">
              <Globe2 className="w-5 h-5 text-cyan-700 mt-0.5" />
              <div>
                <p className="font-semibold">Multi-organization ready</p>
                <p className="text-sm text-slate-600">Run independent workspaces under one platform with secure separation.</p>
              </div>
            </div>
            <div className="rounded-xl bg-[#fffbeb] border border-amber-100 p-4 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-700 mt-0.5" />
              <div>
                <p className="font-semibold">Clear governance</p>
                <p className="text-sm text-slate-600">Keep a single super admin for oversight while admins manage their teams.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-900 p-8 sm:p-10 text-white text-center landing-fade-up">
          <h3 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            Start your workspace in minutes
          </h3>
          <p className="mt-3 text-cyan-100 max-w-2xl mx-auto">
            Launch a modern training attendance workflow with role-based access, QR check-ins, and instant reporting.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors"
            >
              Get Started Free
            </button>
            <button
              onClick={onSignIn}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-cyan-200/40 text-cyan-100 font-semibold hover:bg-cyan-900/30 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-slate-600">
          © 2026 TrackTrain. All rights reserved.|by LexoGraphix Plus
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
