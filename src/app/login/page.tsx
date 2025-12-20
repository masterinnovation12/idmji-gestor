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
import { Eye, EyeOff, Globe, Moon, Sun } from 'lucide-react'
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

            {/* Controles de idioma y tema */}
            <div className="absolute top-4 right-4 flex gap-3 z-10">
                {/* Selector de idioma */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setLanguage(language === 'es-ES' ? 'ca-ES' : 'es-ES')}
                    className="glass p-3 rounded-xl hover:bg-white/20 transition-colors"
                >
                    <Globe className="w-5 h-5" />
                    <span className="ml-2 text-sm font-medium">
                        {language === 'es-ES' ? 'ES' : 'CA'}
                    </span>
                </motion.button>

                {/* Toggle modo oscuro */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleTheme}
                    className="glass p-3 rounded-xl hover:bg-white/20 transition-colors"
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </motion.button>
            </div>

            {/* Card de login */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass rounded-3xl p-6 md:p-12 w-full max-w-md relative z-10 shadow-2xl"
            >
                {/* Logo más grande */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex justify-center mb-8"
                >
                    <div className="relative w-48 h-48">
                        <Image
                            src="/logo-idmji.jpeg"
                            alt="Logo IDMJI"
                            fill
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
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        className="w-full gradient-primary text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Iniciando sesión...' : t('login.submit')}
                    </motion.button>

                    {/* Link olvidé contraseña */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-center"
                    >
                        <a
                            href="/forgot-password"
                            className="text-sm text-primary hover:underline"
                        >
                            He olvidado mis credenciales
                        </a>
                    </motion.div>
                </form>
            </motion.div>
        </div>
    )
}
