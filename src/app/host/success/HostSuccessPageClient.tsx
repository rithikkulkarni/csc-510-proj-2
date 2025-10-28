'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

export default function HostSuccessPageClient() {
    const searchParams = useSearchParams()

    const code = useMemo(() => searchParams?.get('code') ?? 'N/A', [searchParams])
    const expiresAt = useMemo(() => {
        const raw = searchParams?.get('expiresAt')
        return raw ? new Date(raw) : null
    }, [searchParams])

    const [timeLeft, setTimeLeft] = useState('')
    const [timeColor, setTimeColor] = useState('text-green-600 font-bold')

    useEffect(() => {
        if (!expiresAt) return

        function updateCountdown() {
            const now = new Date()
            if (!expiresAt) return
            const diff = expiresAt.getTime() - now.getTime()

            if (diff <= 0) {
                setTimeLeft('Expired')
                setTimeColor('text-red-600 font-bold')
                return
            }

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)

            if (hours >= 1) setTimeColor('text-green-600 font-bold')
            else if (minutes >= 5) setTimeColor('text-yellow-500 font-bold')
            else setTimeColor('text-red-600 font-bold')
        }

        updateCountdown()
        const interval = setInterval(updateCountdown, 1000)
        return () => clearInterval(interval)
    }, [expiresAt])

    if (!expiresAt) return <p>Error: Missing expiration time.</p>

    return (
        <main className="min-h-screen bg-green-100 flex flex-col items-center px-4 py-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-black mb-2 text-center">
                Session Created!
            </h1>
            <p className="text-black text-lg md:text-xl mb-8 text-center">
                Share this code with your group so they can join
            </p>

            <div className="w-full max-w-md bg-yellow-50 rounded-2xl p-6 shadow-md flex flex-col items-center gap-6">
                <p className="text-2xl font-bold text-black">Session Code</p>
                <p className="text-5xl font-mono font-bold text-black bg-white px-6 py-3 rounded-lg">
                    {code}
                </p>

                <p className="text-lg text-black text-center">
                    Expires at:{' '}
                    <span className="font-semibold">
                        {expiresAt.toLocaleString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                        })}
                    </span>
                </p>

                <p className={`text-xl ${timeColor}`}>Time remaining: {timeLeft}</p>

                <a
                    href={`/join/${encodeURIComponent(code)}`}
                    className="w-full text-center bg-green-800 text-white font-bold py-3 px-6 rounded-2xl shadow-md hover:bg-green-900 transition transform duration-150 hover:scale-105"
                >
                    Join Session
                </a>
            </div>
        </main>
    )
}
