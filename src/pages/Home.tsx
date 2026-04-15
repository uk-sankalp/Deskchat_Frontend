import React, { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
import { ThemeToggle } from "../components/theme-toggle"
import { CreateRoomModal } from "../components/create-room-modal"
import { JoinRoomModal } from "../components/join-room-modal"
import { useNavigate } from "react-router-dom"

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)

  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const words = ["Create", "Share", "Talk"]

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % words.length)
        setIsVisible(true)
      }, 300)
    }, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [words.length])

  const handleCreateRoom = () => setIsCreateModalOpen(true)
  const handleJoinRoom = () => setIsJoinModalOpen(true)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-primary)]/60">
        <div className="container mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center">
            <span className="font-semibold text-xl tracking-tight">DeskChat</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/about')}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-semibold transition-colors"
            >
              About DeskChat
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-8 sm:py-12 md:py-20">
        <div className="max-w-2xl mx-auto text-center space-y-10 lg:space-y-12">
          {/* Hero Section */}
          <div className="space-y-8">
            <h1 className="text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl flex flex-col items-center justify-center mx-auto text-[var(--text-primary)] leading-[1.1] sm:leading-none">
              <span>Chat instantly.</span>
              <span>Share freely.</span>
            </h1>

            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-gray-600)] dark:text-[var(--color-gray-300)] min-h-[3.5rem] flex items-center justify-center mt-6">
              <span className={`transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
                {words[currentWordIndex]}
              </span>
            </div>

            <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-md md:max-w-lg mx-auto leading-relaxed md:leading-extra-relaxed mt-4 px-2 italic">
              Create a space, share the link, and start collaborating. <br className="hidden sm:block" /> Temporarily and securely.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              size="lg"
              className="w-full sm:w-auto px-10 text-base transition-all duration-200 hover:scale-105 hover:shadow-lg rounded-xl h-12 font-semibold"
              onClick={handleCreateRoom}
            >
              Create Room
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-10 text-base transition-all duration-200 hover:scale-105 rounded-xl h-12 font-semibold border-2"
              onClick={handleJoinRoom}
            >
              Join Room
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] text-center py-6 mt-auto">
        <div className="container mx-auto px-4">
          <p className="text-sm text-[var(--text-secondary)] font-medium">© DeskChat · Minimal • Private • Fast • UKS</p>
        </div>
      </footer>

      <CreateRoomModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <JoinRoomModal open={isJoinModalOpen} onOpenChange={setIsJoinModalOpen} />
    </div>
  )
}
