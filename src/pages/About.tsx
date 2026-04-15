import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, CheckCircle2, MessageSquare, Timer, Files, ShieldCheck, Keyboard, UserCircle } from "lucide-react"
import { ThemeToggle } from "../components/theme-toggle"
import { CreateRoomModal } from "../components/create-room-modal"
import { JoinRoomModal } from "../components/join-room-modal"

export const About: React.FC = () => {
  const navigate = useNavigate()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  const features = [
    {
      title: "Real-time Messaging",
      back: "Messages are delivered instantly using WebSocket-based communication.",
      icon: <MessageSquare className="w-6 h-6" strokeWidth={1.5} />
    },
    {
      title: "Temporary Rooms",
      back: "Rooms expire automatically, keeping interactions lightweight and private.",
      icon: <Timer className="w-6 h-6" strokeWidth={1.5} />
    },
    {
      title: "File Sharing",
      back: "Upload and share files seamlessly within conversations.",
      icon: <Files className="w-6 h-6" strokeWidth={1.5} />
    },
    {
      title: "Host Controls",
      back: "Moderate conversations with mute, kick, and room controls.",
      icon: <ShieldCheck className="w-6 h-6" strokeWidth={1.5} />
    },
    {
      title: "Typing Indicators",
      back: "See when participants are typing in real-time.",
      icon: <Keyboard className="w-6 h-6" strokeWidth={1.5} />
    },
    {
      title: "No Login Required",
      back: "Join instantly using session-based identity without creating accounts.",
      icon: <UserCircle className="w-6 h-6" strokeWidth={1.5} />
    }
  ]

  const howItWorks = [
    "Create or Join Room",
    "Connect via WebSocket",
    "Send messages instantly",
    "Share files and interact",
    "Room expires automatically"
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] antialiased transition-colors duration-300 selection:bg-[var(--border-color)]">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-screen-xl items-center justify-between px-6">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 max-w-5xl py-12 sm:py-20 space-y-24 sm:space-y-32">
        
        {/* SECTION 1 - HERO */}
        <section className="text-center space-y-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pt-4">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight">
            About DeskChat
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl font-medium tracking-tight text-[var(--text-secondary)]">
            A real-time, temporary collaboration platform built for seamless communication.
          </p>
          <p className="text-sm sm:text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed mt-6">
            Designed for instant, frictionless interaction without the overhead of permanent data storage or mandatory accounts.
          </p>
        </section>

        {/* SECTION 2 - WHAT IS DESKCHAT */}
        <section className="max-w-4xl mx-auto">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 sm:p-12 transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">What is DeskChat?</h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-medium mb-8">
              DeskChat is a no-login, real-time chat platform where users can create temporary rooms, communicate instantly, and share files without friction.
            </p>
            
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-[hsl(120,40%,55%)] shrink-0 mt-0.5" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">No authentication required</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-[hsl(120,40%,55%)] shrink-0 mt-0.5" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Instant room creation</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-[hsl(120,40%,55%)] shrink-0 mt-0.5" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Temporary and privacy-focused</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 - FEATURES (FLIP CARDS) */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Key Features</h2>
            <p className="text-[var(--text-secondary)]">Built specifically for speed and control.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group [perspective:1000px] h-44 sm:h-48 w-full cursor-pointer"
              >
                <div className="relative h-full w-full transition-all duration-500 ease-in-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] active:[transform:rotateY(180deg)] shadow-sm rounded-2xl">
                  
                  {/* FRONT SIDE */}
                  <div className="absolute inset-0 h-full w-full rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] active:bg-[var(--text-primary)] active:text-[var(--bg-primary)] group-hover:border-transparent [backface-visibility:hidden] border border-[var(--border-color)] flex flex-col items-center justify-center gap-4 p-6 text-center transition-all duration-500 ease-in-out">
                    <div className="p-4 rounded-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-sm group-hover:bg-[var(--bg-primary)] group-hover:text-[var(--text-primary)] transition-all duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight transition-transform duration-300">
                      {feature.title}
                    </h3>
                  </div>

                  {/* BACK SIDE */}
                  <div className="absolute inset-0 h-full w-full rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-primary)] brightness-[0.97] dark:brightness-110 [backface-visibility:hidden] [transform:rotateY(180deg)] border border-[var(--border-color)] flex items-center justify-center p-6 text-center transition-all duration-500">
                    <p className="text-xs sm:text-sm font-medium leading-relaxed">
                      {feature.back}
                    </p>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5 - HOW IT WORKS (SNAKE PATH) */}
        <section className="max-w-4xl mx-auto px-4 overflow-hidden relative">
          <div className="text-center mb-24">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How it works</h2>
            <p className="text-[var(--text-secondary)] mt-3 font-medium">Follow the flow of instant communication.</p>
          </div>
          
          <div className="relative flex flex-col items-center space-y-32">
            {howItWorks.map((step, idx) => {
              const isEven = idx % 2 === 0; // Even: 0, 2, 4 -> Left card. Odd: 1, 3 -> Right card.
              return (
                <div 
                  key={idx} 
                  className={`relative flex items-center w-full md:w-[800px] justify-center ${isEven ? 'md:justify-start' : 'md:justify-end'} group`}
                >
                  {/* The Card */}
                  <div className={`w-full md:w-[320px] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-8 shadow-sm group-hover:shadow-2xl group-hover:border-[var(--text-primary)] group-hover:-translate-y-2 transition-all duration-500 relative z-10 animate-in fade-in slide-in-from-bottom-4`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-black text-base shrink-0 shadow-sm border border-[var(--border-color)]">
                        {idx + 1}
                      </div>
                      <h4 className="font-bold text-xl text-[var(--text-primary)]">Step {idx + 1}</h4>
                    </div>
                    <p className="font-medium text-sm sm:text-base text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors leading-relaxed">
                      {step}
                    </p>
                  </div>

                  {/* Desktop Curved Snake Path SVG */}
                  {idx < howItWorks.length - 1 && (
                    <div className={`hidden md:block absolute top-[100%] h-32 w-[480px] z-0 pointer-events-none ${isEven ? 'left-[160px]' : 'right-[160px]'}`}>
                      <svg width="480" height="128" viewBox="0 0 480 128" fill="none">
                        <path 
                          d={isEven 
                            ? "M 0 0 C 0 80, 480 48, 480 128" 
                            : "M 480 0 C 480 80, 0 48, 0 128"
                          } 
                          stroke="currentColor" 
                          strokeWidth="3" 
                          strokeDasharray="12 8" 
                          className="text-[var(--border-color)] group-hover:text-[var(--text-primary)] transition-colors duration-700 opacity-40 group-hover:opacity-100"
                        />
                      </svg>
                    </div>
                  )}
                  
                  {/* Mobile connector */}
                  {idx < howItWorks.length - 1 && (
                     <div className="md:hidden absolute top-[100%] h-32 w-0.5 border-l-2 border-dashed border-[var(--border-color)] left-1/2 -translate-x-1/2 opacity-50" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 6 - CTA */}
        <section className="text-center pb-16 pt-12">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-10">Ready to chat?</h2>
          <div className="flex justify-center items-center">
            <button
              onClick={() => navigate("/")}
              className="w-full sm:w-64 h-16 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold text-xl border hover:scale-[1.05] hover:opacity-90 active:scale-95 transition-all duration-300 shadow-lg"
            >
              Get Started
            </button>
          </div>
        </section>

      </main>
      
      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] text-center py-8">
        <p className="text-sm text-[var(--text-secondary)] font-medium">© DeskChat · Minimal • Private • Fast</p>
      </footer>

      {/* Modals placed at root for clean mounting */}
      <CreateRoomModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <JoinRoomModal open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen} />
    </div>
  )
}
