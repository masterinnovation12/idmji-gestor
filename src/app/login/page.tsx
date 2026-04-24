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

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Moon, Sun, LogIn, CheckCircle, Sparkles } from 'lucide-react'
import { LanguageMenu } from '@/components/language/LanguageMenu'
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

    const setRememberMe = (rememberMe: boolean) => setCredentials(prev => ({ ...prev, rememberMe }))
    const emailRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)

    const { rememberMe } = credentials

    // Cargar credenciales guardadas al montar (inputs no controlados para E2E/Playwright)
    useEffect(() => {
        const savedEmail = localStorage.getItem('idmji_email')
        const savedPassword = localStorage.getItem('idmji_password')
        const savedRemember = localStorage.getItem('idmji_remember') === 'true'

        if (savedRemember && savedEmail && savedPassword) {
            setCredentials(prev => ({ ...prev, rememberMe: true }))
            const t = setTimeout(() => {
                if (emailRef.current) emailRef.current.value = savedEmail
                if (passwordRef.current) passwordRef.current.value = savedPassword
            }, 0)
            return () => clearTimeout(t)
        }
    }, [])

    // Manejar submit del formulario (lee del DOM para compatibilidad con E2E/Playwright fill())
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        const form = e.currentTarget
        const emailField = form.elements.namedItem('email') as HTMLInputElement | null
        const passwordField = form.elements.namedItem('password') as HTMLInputElement | null
        const emailVal = emailField?.value?.trim() ?? ''
        const passwordVal = passwordField?.value?.trim() ?? ''

        try {
            const formData = new FormData()
            formData.append('email', emailVal)
            formData.append('password', passwordVal)

            const result = await login(formData)

            if (result?.error) {
                setError(result.error)
                setIsLoading(false)
            } else if (result?.success) {
                // Guardar credenciales si "recordar" está activo
                if (rememberMe) {
                    localStorage.setItem('idmji_email', emailVal)
                    localStorage.setItem('idmji_password', passwordVal)
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
            setError(t('login.errorGeneric'))
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-dvh flex flex-col items-center justify-center p-3 sm:p-4 relative">
            {/* Fondos: overflow acotado aquí para no recortar menús/popovers del contenido (p. ej. idioma). */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 gradient-mesh opacity-30" />
                <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10" />
            </div>

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

            {/* Contenedor principal: controles y card son hermanos para que el menú de idioma no quede bajo la tarjeta (stacking / pointer-events). */}
            <div className="relative z-10 flex w-full flex-col items-center">
                {/* Controles de idioma y tema */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="relative z-30 mb-4 flex w-full max-w-sm items-center justify-center gap-2 overflow-visible"
                >
                    <LanguageMenu language={language} setLanguage={setLanguage} t={t} variant="login" />

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleTheme}
                        aria-label={isDark ? t('theme.activateLight') : t('theme.activateDark')}
                        title={isDark ? t('theme.activateLight') : t('theme.activateDark')}
                        className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/80 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
                    className="glass relative z-0 w-full max-w-sm rounded-3xl p-5 shadow-2xl sm:p-6"
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
                                alt="IDMJI Sabadell Logo"
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
                                ref={emailRef}
                                data-testid="login-email"
                                name="email"
                                type="email"
                                defaultValue={credentials.email}
                                required
                                className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                placeholder={t('login.emailPlaceholder')}
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
                                    ref={passwordRef}
                                    data-testid="login-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    defaultValue={credentials.password}
                                    required
                                    className="w-full bg-background/50 border border-border rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                                    title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
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
                                    data-testid="login-error"
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
                            data-testid="login-submit"
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
