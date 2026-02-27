import { useState } from 'react'
import { dbService } from '../services/supabase.service'

export function useRoadmap(profile) {
    const [careerPaths, setCareerPaths] = useState([])
    const [activePath, setActivePath] = useState(null)
    const [roadmap, setRoadmap] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const loadPaths = async (userId) => {
        const paths = await dbService.getCareerPaths(userId)
        setCareerPaths(paths)
        const active = paths.find(p => p.is_active)
        if (active) {
            setActivePath(active)
            await loadRoadmap(active.id)
        }
        return paths
    }

    const loadRoadmap = async (pathId) => {
        const rm = await dbService.getRoadmap(pathId)
        setRoadmap(rm.map(r => ({
            id: r.id,
            title: r.topic || 'Без названия',
            description: r.description,
            xp: r.xp_reward,
            status: r.status
        })))
    }

    const switchPath = async (pathId) => {
        if (!profile) return
        setIsLoading(true)
        try {
            await dbService.switchCareerPath(profile.id, pathId)
            await loadPaths(profile.id)
        } finally {
            setIsLoading(false)
        }
    }

    const deletePath = async (pathId) => {
        if (!profile) return
        await dbService.deleteCareerPath(pathId)
        const updatedPaths = await loadPaths(profile.id)

        if (activePath?.id === pathId) {
            const nextActive = updatedPaths[0]
            if (nextActive) {
                await switchPath(nextActive.id)
            } else {
                setActivePath(null)
                setRoadmap(null)
            }
        }
    }

    return {
        careerPaths, activePath, roadmap, isPathLoading: isLoading,
        loadPaths, switchPath, deletePath, setCareerPaths, setActivePath, setRoadmap
    }
}
