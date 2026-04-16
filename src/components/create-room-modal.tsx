import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Modal } from "./ui/modal"
import { Button } from "./ui/button"
import { createRoom, joinRoom } from "../services/api"
import { useChatStore } from "../store/useChatStore"
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { getApiErrorMessage } from "../utils/api-error"

interface CreateRoomModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRoomModal({ open, onOpenChange }: CreateRoomModalProps) {
  const [maxUsers, setMaxUsers] = useState<number | "">(10)
  const [duration, setDuration] = useState<number | "">(60)
  const [password, setPassword] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [roomData, setRoomData] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  
  const navigate = useNavigate()
  const setRoom = useChatStore((state) => state.setRoom)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const parsedMaxUsers = typeof maxUsers === "number" ? maxUsers : 0;
    const parsedDuration = typeof duration === "number" ? duration : 0;

    if (parsedMaxUsers < 2 || parsedMaxUsers > 50) {
      setError("Max users must be between 2 and 50")
      return
    }

    if (parsedDuration < 5) {
      setError("Duration must be at least 5 minutes")
      return
    }

    if (password && password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    try {
      setIsLoading(true)
      setError("")
      
      const data = await createRoom(parsedMaxUsers, parsedDuration, password || undefined)
      
      // Namespace the host token by room code securely
      localStorage.setItem(`hostToken_${data.roomCode}`, data.hostToken)
      
      let sessionId = localStorage.getItem("sessionId")
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem("sessionId", sessionId)
      }
      
      // Call joinRoom explicitly so the Host gets registered as a real participant instantly
      const joinData = await joinRoom(data.roomCode, sessionId, password || undefined, data.hostToken)
      const isHostVal = joinData.host !== undefined ? joinData.host : (joinData.isHost || true);
      
      localStorage.setItem("participantId", joinData.participantId.toString())
      localStorage.setItem("nickname", joinData.nickName)
      localStorage.setItem("avatarColor", joinData.avatarColor)
      localStorage.setItem("isHost", String(isHostVal))
      localStorage.setItem("roomCode", data.roomCode)
      if (data.expiresAt) {
        localStorage.setItem(`expiresAt_${data.roomCode}`, data.expiresAt)
      }

      setRoom(data.roomCode, {
        id: joinData.participantId,
        nickName: joinData.nickName,
        avatarColor: joinData.avatarColor,
        isHost: isHostVal
      })
      
      setRoomData(data)
      setSuccess(true)
      
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to create room."))
      setIsLoading(false)
    }
  }

  const handleCopy = () => {
    if (roomData?.roomCode) {
      navigator.clipboard.writeText(roomData.roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1000)
    }
  }

  // Reset state when modal closes/opens
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSuccess(false)
        setRoomData(null)
        setIsLoading(false)
        setError("")
        setCopied(false)
        setCountdown(10)
      }, 300)
    }
  }, [open])

  React.useEffect(() => {
    if (success) {
      setCountdown(10)
      const interval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [success])

  // Navigate when countdown reaches 0
  React.useEffect(() => {
    if (success && countdown === 0 && roomData && open) {
      onOpenChange(false)
      navigate(`/room/${roomData.roomCode}`)
    }
  }, [success, countdown, roomData, open, navigate, onOpenChange])

  return (
    <Modal 
      open={open} 
      onOpenChange={onOpenChange} 
      title={success ? undefined : "Create Room"} 
      description={success ? undefined : "Set up a new temporary collaboration space."}
    >
      {success && roomData ? (
        <div className="flex flex-col items-center justify-center text-center py-4 space-y-5 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Room Created Successfully
          </h2>
          
          <div className="p-5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] w-full relative shadow-sm text-center">
             <p className="text-4xl font-extrabold tracking-widest text-green-600 dark:text-green-400 mb-2 uppercase">
               {roomData.roomCode}
             </p>
             <p className="text-sm font-medium text-[var(--text-secondary)]">
               Share this code with others to join
             </p>
          </div>

          <Button 
            onClick={handleCopy} 
            variant={copied ? "default" : "outline"}
            className="w-full h-12 text-base font-semibold shadow-sm transition-all"
          >
            {copied ? "Copied!" : "Copy Code"}
          </Button>

          <p className="text-sm font-medium text-[var(--text-secondary)] animate-pulse pt-2">
            Redirecting in {countdown} seconds...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">Max Users (2-50)</label>
          <input
            type="number"
            min="2"
            max="50"
            required
            value={maxUsers}
            onChange={(e) => setMaxUsers(e.target.value === "" ? "" : parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--color-gray-400)] focus:outline-none"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">Duration (minutes)</label>
          <input
            type="number"
            min="5"
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value === "" ? "" : parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--color-gray-400)] focus:outline-none"
            disabled={isLoading}
          />
        </div>

        <div>
           <label className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">
             Password <span className="font-normal text-[var(--text-secondary)]">(Optional)</span>
           </label>
           <div className="relative">
             <input
               type={showPassword ? "text" : "password"}
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder="Leave blank for public room"
               className="w-full px-3 py-2 pr-10 border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--color-gray-400)] focus:outline-none"
               disabled={isLoading}
             />
             <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
               disabled={isLoading}
               tabIndex={-1}
             >
               {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
             </button>
           </div>
        </div>

        <div className="pt-2">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create Room
          </Button>
        </div>
      </form>
      )}
    </Modal>
  )
}
