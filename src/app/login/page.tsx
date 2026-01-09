/**
 * Página de Login - IDMJI Gestor de Púlpito
 * 
 * Características:
 * - Login como página principal (no hay registro público)
 * - Selector de idioma (ES/CA)
 * - Toggle modo oscuro
 * - Visibilidad de contraseña
 * - Recordar credenciales (localStorage)
 * - Diseño compacto mobile-first (sin scroll)
 * - Animación de éxito al iniciar sesión
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Globe, Moon, Sun, LogIn, CheckCircle, Sparkles } from 'lucide-react'
import { login } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import Image from 'next/image'

export default function LoginPage() {
    const router = useRouter()
    const { t, language, setLanguage } = useI18n()
    const { isDark, toggleTheme } = useTheme()

    // Estados del formulario
    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
        rememberMe: false
    })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [loginSuccess, setLoginSuccess] = useState(false)

    const setEmail = (email: string) => setCredentials(prev => ({ ...prev, email }))
    const setPassword = (password: string) => setCredentials(prev => ({ ...prev, password }))
    const setRememberMe = (rememberMe: boolean) => setCredentials(prev => ({ ...prev, rememberMe }))

    const { email, password, rememberMe } = credentials

    // Cargar credenciales guardadas al montar
    useEffect(() => {
        const savedEmail = localStorage.getItem('idmji_email')
        const savedPassword = localStorage.getItem('idmji_password')
        const savedRemember = localStorage.getItem('idmji_remember') === 'true'

        if (savedRemember && savedEmail && savedPassword) {
            // Use timeout to avoid synchronous setState in effect (Next.js lint rule)
            const timeout = setTimeout(() => {
                setCredentials({
                    email: savedEmail,
                    password: savedPassword,
                    rememberMe: true
                })
            }, 0)
            return () => clearTimeout(timeout)
        }
    }, [])

    // Manejar submit del formulario
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const formData = new FormData()
            formData.append('email', email)
            formData.append('password', password)

            const result = await login(formData)

            if (result?.error) {
                setError(result.error)
                setIsLoading(false)
            } else if (result?.success) {
                // Guardar credenciales si "recordar" está activo
                if (rememberMe) {
                    localStorage.setItem('idmji_email', email)
                    localStorage.setItem('idmji_password', password)
                    localStorage.setItem('idmji_remember', 'true')
                } else {
                    localStorage.removeItem('idmji_email')
                    localStorage.removeItem('idmji_password')
                    localStorage.removeItem('idmji_remember')
                }

                // Mostrar animación de éxito
                setLoginSuccess(true)

                // Redirigir después de la animación
                setTimeout(() => {
                    router.push('/dashboard')
                    router.refresh()
                }, 1500)
            }
        } catch {
            setError('Error al iniciar sesión')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-dvh flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
            {/* Fondo con gradiente animado */}
            <div className="absolute inset-0 gradient-mesh opacity-30" />
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10" />

            {/* Animación de éxito al hacer login */}
            <AnimatePresence>
                {loginSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="flex flex-col items-center gap-6 p-8"
                        >
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="relative"
                            >
                                <div className="w-24 h-24 rounded-full bg-linear-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/40">
                                    <CheckCircle className="w-12 h-12 text-white" strokeWidth={3} />
                                </div>
                                <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
                            </motion.div>
                            <div className="text-center">
                                <h2 className="text-2xl font-black text-foreground mb-1">
                                    {t('login.success')}
                                </h2>
                                <p className="text-sm text-muted-foreground font-medium">
                                    {t('login.redirecting')}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Contenedor Principal - Compacto para móvil */}
            <div className="flex flex-col items-center w-full max-w-sm relative z-10">

                {/* Controles de idioma y tema */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-3 mb-4 z-50"
                >
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setLanguage(language === 'es-ES' ? 'ca-ES' : 'es-ES')}
                        className="glass px-3 py-2 rounded-xl hover:bg-white/30 transition-all font-bold shadow-lg backdrop-blur-md border-white/20 flex items-center gap-2 text-foreground"
                    >
                        <Globe className="w-4 h-4" />
                        <span className="text-xs font-black tracking-wide" suppressHydrationWarning>
                            {language === 'es-ES' ? 'ES' : 'CA'}
                        </span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleTheme}
                        className="glass px-3 py-2 rounded-xl hover:bg-white/30 transition-all shadow-lg backdrop-blur-md border-white/20 flex items-center gap-2"
                    >
                        {isDark ? (
                            <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                            <Moon className="w-4 h-4 text-indigo-400" />
                        )}
                    </motion.button>
                </motion.div>

                {/* Card de login - Más compacto */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="glass rounded-3xl p-5 sm:p-6 w-full relative shadow-2xl border-white/20"
                >
                    {/* Logo más pequeño para móvil */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="flex justify-center mb-3"
                    >
                        <div className="relative w-28 h-28 sm:w-36 sm:h-36">
                            <Image
                                src="/logo.jpg"
                                alt="Logo IDMJI"
                                fill
                                sizes="(max-width: 768px) 112px, 144px"
                                className="object-contain rounded-xl"
                                priority
                            />
                        </div>
                    </motion.div>

                    {/* Título - Más compacto y traducido */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center mb-4"
                    >
                        <p className="text-xs sm:text-sm text-muted-foreground leading-tight">
                            {t('login.churchName')}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-0.5">
                            {t('login.churchLocation')}
                        </p>
                    </motion.div>

                    {/* Formulario - Espaciado reducido */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Email */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label className="block text-xs font-medium mb-1.5">
                                {t('login.email')}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="ejemplo@idmji.org"
                            />
                        </motion.div>

                        {/* Contraseña */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <label className="block text-xs font-medium mb-1.5">
                                {t('login.password')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </motion.div>

                        {/* Recordar credenciales */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="flex items-center gap-2"
                        >
                            <input
                                type="checkbox"
                                id="remember"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                            />
                            <label htmlFor="remember" className="text-xs cursor-pointer">
                                {t('login.remember')}
                            </label>
                        </motion.div>

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-xs"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Botón de login con efecto de éxito */}
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading || loginSuccess}
                            className={`w-full h-12 relative group overflow-hidden rounded-xl font-black text-white transition-all disabled:cursor-not-allowed shadow-xl border border-white/20 ${loginSuccess
                                ? 'bg-linear-to-r from-green-500 to-emerald-600 shadow-green-500/40'
                                : 'bg-[#0660c6] shadow-blue-500/40'
                                }`}
                        >
                            {!loginSuccess && (
                                <div className="absolute inset-0 bg-linear-to-r from-[#0660c6] via-[#2563eb] to-[#0660c6] bg-size-[200%_100%] group-hover:bg-[100%_0] transition-all duration-700" />
                            )}
                            <span className="relative z-10 flex items-center justify-center gap-2 tracking-wider uppercase text-xs text-white font-black">
                                {loginSuccess ? (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        {t('login.success')}
                                    </>
                                ) : isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4" strokeWidth={3} />
                                        {t('login.submit')}
                                    </>
                                )}
                            </span>
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </div>
    )
}
