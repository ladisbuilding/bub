import { useState } from 'react'

export function useTabs<T extends string>(
  defaultTab: T,
  basePath: string,
  validTabs: T[],
): { activeTab: T; handleTabChange: (tab: T) => void } {
  const [activeTab, setActiveTab] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultTab
    const parentHash = window.parent !== window ? window.parent.location.hash : window.location.hash
    const match = parentHash.match(new RegExp(`${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(\\w+)`))
    if (match && validTabs.includes(match[1] as T)) return match[1] as T
    return defaultTab
  })

  function handleTabChange(tab: T) {
    setActiveTab(tab)
    const path = tab === defaultTab ? basePath : `${basePath}/${tab}`
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.location.hash = path
    }
  }

  return { activeTab, handleTabChange }
}
