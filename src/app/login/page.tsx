/**
 * Página de Login - IDMJI Gestor de Púlpito
 * 
 * Características:
 * - Login como página principal (no hay registro público)
 * - Selector de idioma (ES/CA)
 * - Toggle modo oscuro
 * - Visibilidad de contraseña
 * - Recordar credenciales (localStorage)
 * - Logo y textos configurables desde Supabase
 * - Diseño glassmorphism con animaciones
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Globe, Moon, Sun, ChevronRight } from 'lucide-react'
import { login, getPublicConfig } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import Image from 'next/image'

export default function LoginPage() {
    const router = useRouter()
    const { t, language, setLanguage } = useI18n()
    const { isDark, toggleTheme } = useTheme()

    // Estados del formulario
    const [config, setConfig] = useState({
        title: 'IDMJI Gestor de Púlpito',
        subtitle: 'Iglesia de Dios Ministerial de Jesucristo Internacional',
        location: 'Sabadell, España',
        colorClass: 'from-primary to-accent'
    })

    useEffect(() => {
        getPublicConfig().then(data => {
            if (data) {
                setConfig({
                    title: data.app_name || 'IDMJI Gestor de Púlpito',
                    subtitle: data.church_name || 'Iglesia de Dios Ministerial de Jesucristo Internacional',
                    location: data.church_location || 'Sabadell, España',
                    colorClass: data.login_title_color || 'from-primary to-accent'
                })
            }
        })
    }, [])

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    // Cargar credenciales guardadas al montar
    useEffect(() => {
        const savedEmail = localStorage.getItem('idmji_email')
        const savedPassword = localStorage.getItem('idmji_password')
        const savedRemember = localStorage.getItem('idmji_remember') === 'true'

        if (savedRemember && savedEmail && savedPassword) {
            setEmail(savedEmail)
            setPassword(savedPassword)
            setRememberMe(true)
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

                router.push('/dashboard')
                router.refresh()
            }
        } catch (err) {
            setError('Error al iniciar sesión')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Fondo con gradiente animado */}
            <div className="absolute inset-0 gradient-mesh opacity-30" />
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10" />

            {/* Contenedor Principal Centrado (Envuelve controles y card para que estén apilados) */}
            <div className="flex flex-col items-center w-full max-w-md relative z-10">

                {/* Controles de idioma y tema (Ahora para todos los dispositivos: Arriba y Centrado) */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex gap-4 mb-6 z-50 pointer-events-auto"
                >
                    <motion.button
                        whileHover={{ scale: 1.05, translateY: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setLanguage(language === 'es-ES' ? 'ca-ES' : 'es-ES')}
                        className="glass px-4 py-2.5 rounded-2xl hover:bg-white/30 transition-all font-bold shadow-lg backdrop-blur-md border-white/20 flex items-center gap-2 group text-foreground"
                    >
                        <Globe className="w-5 h-5 group-hover:text-primary transition-colors" />
                        <span className="text-sm font-black tracking-wide">
                            {language === 'es-ES' ? 'ES' : 'CA'}
                        </span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05, translateY: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleTheme}
                        className="glass px-4 py-2.5 rounded-2xl hover:bg-white/30 transition-all shadow-lg backdrop-blur-md border-white/20 flex items-center gap-2 group"
                    >
                        {isDark ? (
                            <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-90 transition-transform duration-500" />
                        ) : (
                            <Moon className="w-5 h-5 text-indigo-400 group-hover:-rotate-12 transition-transform duration-500" />
                        )}
                    </motion.button>
                </motion.div>

                {/* Card de login */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="glass rounded-4xl p-8 md:p-12 w-full relative shadow-2xl border-white/20"
                >
                    {/* Logo más grande */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="flex justify-center mb-4"
                    >
                        <div className="relative w-48 h-48">
                            <Image
                                src="/logo-idmji.jpeg"
                                alt="Logo IDMJI"
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-contain rounded-2xl"
                                priority
                            />
                        </div>
                    </motion.div>




                    {/* Título configurable desde Supabase */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center mb-8"
                    >
                        <h1 className={`text-3xl font-bold mb-2 bg-linear-to-r ${config.colorClass} bg-clip-text text-transparent`}>
                            {config.title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {config.subtitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {config.location}
                        </p>
                    </motion.div>

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label className="block text-sm font-medium mb-2">
                                {t('login.email')}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder="ejemplo@idmji.org"
                            />
                        </motion.div>

                        {/* Contraseña */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <label className="block text-sm font-medium mb-2">
                                {t('login.password')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-lg transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                            <label htmlFor="remember" className="text-sm cursor-pointer">
                                Recordar credenciales
                            </label>
                        </motion.div>

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        {/* Botón de login */}
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            whileHover={{ scale: 1.02, translateY: -2 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 relative group overflow-hidden rounded-2xl font-black text-white bg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/25 border border-white/10"
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-primary via-accent to-primary bg-size-[200%_100%] group-hover:bg-[100%_0] transition-all duration-700 opacity-0 group-hover:opacity-100" />
                            <span className="relative z-10 flex items-center justify-center gap-2 tracking-widest uppercase text-xs text-white font-black">
                                {isLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
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
