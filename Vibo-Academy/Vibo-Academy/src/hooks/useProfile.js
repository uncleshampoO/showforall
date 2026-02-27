import { useState, useEffect } from 'react'
import { dbService } from '../services/supabase.service'
import { tmaService } from '../services/tma.service'

export function useProfile() {
    const [profile, setProfile] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    const ensureProfile = async () => {
        const telegramId = tmaService.user?.id || 777777
        const username = tmaService.user?.username || 'demo_user'

        try {
            console.log('[useProfile] Ensuring profile for ID:', telegramId);
            const userProfile = await dbService.getOrCreateProfile(telegramId, username)
            if (userProfile) {
                setProfile(userProfile)
            }
            return userProfile
        } catch (e) {
            console.error('[useProfile] Ensure profile error:', e);
            // Re-throw so App.jsx catch block can see the real cause (like missing columns)
            throw e;
        } finally {
            setIsLoading(false)
        }
    }

    const refreshProfile = async () => {
        const telegramId = tmaService.user?.id || 777777
        const updated = await dbService.getOrCreateProfile(telegramId)
        if (updated) setProfile(updated)
        return updated
    }

    const updateXP = async (xp) => {
        if (!profile) return
        await dbService.updateProfileStats(profile.id, xp)
        await refreshProfile()
    }

    const updateDisplayName = async (newName) => {
        if (!profile) return
        const updated = await dbService.updateProfileName(profile.id, newName)
        if (updated) setProfile(updated)
        return updated
    }

    useEffect(() => {
        tmaService.ready()
        tmaService.expand()
        ensureProfile()
    }, [])

    return { profile, isLoading, refreshProfile, ensureProfile, updateXP, updateDisplayName }
}
