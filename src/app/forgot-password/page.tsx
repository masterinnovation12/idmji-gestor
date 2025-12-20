'use client'

import { useState } from 'react'
import { resetPassword } from './actions'
import { motion } from 'framer-motion'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)
        setSuccess(null)

        const result = await resetPassword(formData)

        if (result?.error) {
            setError(result.error)
        } else if (result?.success) {
            setSuccess(result.success)
        }
        setIsLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 gradient-mesh -z-10" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass w-full max-w-md p-8 rounded-3xl relative"
            >
                <Link href="/login" className="absolute top-8 left-8 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="text-center mb-8 mt-8">
                    <h1 className="text-2xl font-bold">Recuperar Contraseña</h1>
                    <p className="text-muted-foreground mt-2">
                        Ingresa tu email para recibir instrucciones
                    </p>
                </div>

                {success ? (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-lg font-medium">{success}</p>
                        <p className="text-sm text-muted-foreground">
                            Revisa tu bandeja de entrada y sigue el enlace.
                        </p>
                        <Link
                            href="/login"
                            className="block w-full bg-secondary text-white font-semibold py-3 rounded-xl mt-6"
                        >
                            Volver al Login
                        </Link>
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full bg-white/50 dark:bg-black/20 border border-white/20 rounded-xl px-10 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    placeholder="nombre@ejemplo.com"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-primary to-accent text-white font-semibold py-3 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Enviar Instrucciones'
                            )}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    )
}
