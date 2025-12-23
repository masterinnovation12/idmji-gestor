'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react'
import { getCroppedImg } from '@/lib/utils/canvasUtils'

interface AvatarEditorProps {
    imageSrc: string
    isOpen: boolean
    onClose: () => void
    onSave: (file: Blob) => void
}

export default function AvatarEditor({ imageSrc, isOpen, onClose, onSave }: AvatarEditorProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleSave = async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
            if (croppedImage) {
                onSave(croppedImage)
                onClose()
            }
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Editar Foto de Perfil</DialogTitle>
                </DialogHeader>

                <div className="relative w-full h-[400px] bg-black rounded-xl overflow-hidden mt-4">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        cropShape="round"
                        showGrid={false}
                    />
                </div>

                <div className="space-y-6 mt-6">
                    {/* Controles de Zoom */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span className="flex items-center gap-1"><ZoomOut size={14} /> Zoom</span>
                            <span className="flex items-center gap-1"><ZoomIn size={14} /></span>
                        </div>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(value) => setZoom(value[0])}
                            className="w-full"
                        />
                    </div>

                    {/* Controles de Rotación */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span className="flex items-center gap-1"><RotateCw size={14} /> Rotación</span>
                            <span>{rotation}°</span>
                        </div>
                        <Slider
                            value={[rotation]}
                            min={0}
                            max={360}
                            step={90}
                            onValueChange={(value) => setRotation(value[0])}
                            className="w-full"
                        />
                    </div>
                </div>

                <DialogFooter className="mt-6 flex gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1 gap-2">
                        <X size={16} /> Cancelar
                    </Button>
                    <Button onClick={handleSave} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700">
                        <Check size={16} /> Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
