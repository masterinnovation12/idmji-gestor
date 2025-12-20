'use client'

import { useState, useRef } from 'react'
import { Camera, X, Check } from 'lucide-react'
import { uploadAvatar } from '@/app/dashboard/profile/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'

interface AvatarEditorProps {
    currentAvatar?: string | null
    userName: string
    onUpdate?: (newUrl: string) => void
}

export function AvatarEditor({ currentAvatar, userName, onUpdate }: AvatarEditorProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no puede superar 5MB')
            return
        }

        setSelectedFile(file)
        setPreviewUrl(URL.createObjectURL(file))
    }

    async function handleUpload() {
        if (!selectedFile) return

        setIsUploading(true)

        const formData = new FormData()
        formData.append('avatar', selectedFile)

        const result = await uploadAvatar(formData)

        if (result.success && result.data) {
            toast.success('Avatar actualizado')
            onUpdate?.(result.data)
            setPreviewUrl(null)
            setSelectedFile(null)
        } else {
            toast.error(result.error || 'Error al subir avatar')
        }

        setIsUploading(false)
    }

    function handleCancel() {
        setPreviewUrl(null)
        setSelectedFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const displayUrl = previewUrl || currentAvatar

    return (
        <div className="relative w-32 h-32 mx-auto group">
            {/* Avatar Display */}
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-accent p-1">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                    {displayUrl ? (
                        <img src={displayUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-3xl font-bold text-muted-foreground">{initials}</span>
                    )}
                </div>
            </div>

            {/* Upload Button */}
            {!previewUrl && (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                >
                    <Camera className="w-5 h-5" />
                </button>
            )}

            {/* Confirm/Cancel Buttons */}
            {previewUrl && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                    <button
                        onClick={handleCancel}
                        disabled={isUploading}
                        className="p-2 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:bg-destructive/90 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="p-2 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors"
                    >
                        {isUploading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                    </button>
                </div>
            )}

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    )
}
