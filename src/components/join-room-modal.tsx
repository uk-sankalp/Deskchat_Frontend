import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Modal } from "./ui/modal"
import { Button } from "./ui/button"
import { joinRoom } from "../services/api"
import { useChatStore } from "../store/useChatStore"
import { Loader2, Eye, EyeOff } from "lucide-react"

interface JoinRoomModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JoinRoomModal({ open, onOpenChange }: JoinRoomModalProps) {
  const [roomCode, setRoomCode] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  
  const navigate = useNavigate()
  const setRoom = useChatStore((state) => state.setRoom)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomCode.trim()) return

    try {
      setIsLoading(true)
      setError("")
      
      let sessionId = localStorage.getItem("sessionId")
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem("sessionId", sessionId)
      }
      
      const parsedCode = roomCode.trim().toUpperCase()
      const data = await joinRoom(parsedCode, sessionId, password || undefined)
      
      const isHostVal = data.host !== undefined ? data.host : (data.isHost || false);
      
      localStorage.setItem("participantId", data.participantId.toString())
      localStorage.setItem("nickname", data.nickName)
      localStorage.setItem("avatarColor", data.avatarColor)
      localStorage.setItem("isHost", String(isHostVal))
      localStorage.setItem("roomCode", parsedCode)
      // Save password keyed to room code so Room.tsx can re-join on page reload
      if (password) {
        localStorage.setItem(`roomPassword_${parsedCode}`, password)
      }
      
      setRoom(parsedCode, {
        id: data.participantId,
        nickName: data.nickName,
        avatarColor: data.avatarColor,
        isHost: isHostVal
      })
      onOpenChange(false)
      navigate(`/room/${parsedCode}`)
      
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid room code or full room.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Join Room">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">Room Code</label>
          <input
            type="text"
            required
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. AB12CD"
            className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--color-gray-400)] focus:outline-none uppercase placeholder:normal-case tracking-wider font-semibold"
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
               placeholder="If the room is private"
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
          <Button type="submit" className="w-full" disabled={isLoading || !roomCode.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Join Room
          </Button>
        </div>
      </form>
    </Modal>
  )
}
