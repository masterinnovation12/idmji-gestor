/**
 * Página de Login — IDMJI Gestor de Púlpito
 *
 * Diseño Liquid Glass Premium (navy + dorado), responsive en móvil/tablet/desktop.
 * Mismo lenguaje visual que OfrendaLiquidShell y splash PWA.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Moon, Sun, LogIn } from 'lucide-react'
import { LanguageMenu } from '@/components/language/LanguageMenu'
import { LoginSuccessOverlay } from '@/components/login/LoginSuccessOverlay'
import { login } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import Image from 'next/image'

export default function LoginPage() {
    const router = useRouter()
    const { t, language, setLanguage } = useI18n()
    const { isDark, toggleTheme } = useTheme()

    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
        rememberMe: false,
    })
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [loginSuccess, setLoginSuccess] = useState(false)

    const setRememberMe = (rememberMe: boolean) => setCredentials(prev => ({ ...prev, rememberMe }))
    const emailRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)

    const { rememberMe } = credentials

    useEffect(() => {
        const savedEmail = localStorage.getItem('idmji_email')
        const savedPassword = localStorage.getItem('idmji_password')
        const savedRemember = localStorage.getItem('idmji_remember') === 'true'

        if (savedRemember && savedEmail && savedPassword) {
            setCredentials(prev => ({ ...prev, rememberMe: true }))
            const timer = setTimeout(() => {
                if (emailRef.current) emailRef.current.value = savedEmail
                if (passwordRef.current) passwordRef.current.value = savedPassword
            }, 0)
            return () => clearTimeout(timer)
        }
    }, [])

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
                if (rememberMe) {
                    localStorage.setItem('idmji_email', emailVal)
                    localStorage.setItem('idmji_password', passwordVal)
                    localStorage.setItem('idmji_remember', 'true')
                } else {
                    localStorage.removeItem('idmji_email')
                    localStorage.removeItem('idmji_password')
                    localStorage.removeItem('idmji_remember')
                }

                setLoginSuccess(true)
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
        <div className="login-liquid-root" data-testid="login-liquid-root">
            <div className="login-liquid-backdrop" aria-hidden />

            <LoginSuccessOverlay open={loginSuccess} />

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="login-liquid-stage"
            >
                <div className="login-liquid-toolbar">
                    <LanguageMenu
                        language={language}
                        setLanguage={setLanguage}
                        t={t}
                        variant="loginLiquid"
                    />
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        type="button"
                        onClick={toggleTheme}
                        data-testid="login-theme-toggle"
                        aria-label={isDark ? t('theme.activateLight') : t('theme.activateDark')}
                        title={isDark ? t('theme.activateLight') : t('theme.activateDark')}
                        className="login-liquid-tool-btn"
                    >
                        {isDark ? (
                            <Sun className="h-4 w-4 text-amber-300" />
                        ) : (
                            <Moon className="h-4 w-4 text-indigo-200" />
                        )}
                    </motion.button>
                </div>

                <div
                    className="ofrenda-liquid-card login-liquid-card"
                    data-testid="login-liquid-card"
                >
                    <div className="ofrenda-liquid-headbar login-liquid-headbar" data-testid="login-liquid-headbar">
                        <p className="login-liquid-eyebrow" suppressHydrationWarning>
                            {t('common.appName')}
                        </p>
                        <h1 className="login-liquid-headline" suppressHydrationWarning>
                            {t('common.appSubTitle')}
                        </h1>
                        <p className="login-liquid-subtitle" suppressHydrationWarning>
                            {t('login.welcomeSubtitle')}
                        </p>
                    </div>

                    <div className="login-liquid-body">
                        <div className="login-liquid-logo-wrap">
                            <div className="login-liquid-logo-badge" data-testid="login-liquid-logo-badge">
                                <div className="login-liquid-logo-inner">
                                    <Image
                                        src="/logo.jpg"
                                        alt=""
                                        width={160}
                                        height={160}
                                        className="h-[88%] w-[88%] object-contain"
                                        priority
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="login-liquid-church">
                            <p className="login-liquid-church-name" suppressHydrationWarning>
                                {t('login.churchName')}
                            </p>
                            <p className="login-liquid-church-loc" suppressHydrationWarning>
                                {t('login.churchLocation')}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate={false}>
                            <div className="login-liquid-field">
                                <label htmlFor="login-email" className="login-liquid-label" suppressHydrationWarning>
                                    {t('login.email')}
                                </label>
                                <input
                                    ref={emailRef}
                                    id="login-email"
                                    data-testid="login-email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    defaultValue={credentials.email}
                                    required
                                    className="login-liquid-input ofrenda-liquid-search"
                                    placeholder={t('login.emailPlaceholder')}
                                />
                            </div>

                            <div className="login-liquid-field">
                                <label htmlFor="login-password" className="login-liquid-label" suppressHydrationWarning>
                                    {t('login.password')}
                                </label>
                                <div className="login-liquid-input-wrap">
                                    <input
                                        ref={passwordRef}
                                        id="login-password"
                                        data-testid="login-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        defaultValue={credentials.password}
                                        required
                                        className="login-liquid-input ofrenda-liquid-search"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                                        title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                                        className="login-liquid-eye"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="login-liquid-remember">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={rememberMe}
                                    onChange={e => setRememberMe(e.target.checked)}
                                    className="login-liquid-checkbox"
                                />
                                <label htmlFor="remember" className="login-liquid-remember-label" suppressHydrationWarning>
                                    {t('login.remember')}
                                </label>
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        data-testid="login-error"
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        className="login-liquid-error"
                                        role="alert"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                data-testid="login-submit"
                                type="submit"
                                disabled={isLoading || loginSuccess}
                                whileHover={{ scale: isLoading || loginSuccess ? 1 : 1.01 }}
                                whileTap={{ scale: isLoading || loginSuccess ? 1 : 0.98 }}
                                className={`ofrenda-liquid-btn-primary login-liquid-submit${
                                    loginSuccess ? ' login-liquid-submit--success' : ''
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        {t('common.loading')}
                                    </>
                                ) : loginSuccess ? (
                                    t('login.success')
                                ) : (
                                    <>
                                        <LogIn className="mr-2 h-4 w-4" strokeWidth={2.5} />
                                        {t('login.submit')}
                                    </>
                                )}
                            </motion.button>

                            <Link
                                href="/forgot-password"
                                className="login-liquid-forgot"
                                data-testid="login-forgot-link"
                                suppressHydrationWarning
                            >
                                {t('login.forgot')}
                            </Link>
                        </form>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
