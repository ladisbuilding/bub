import { useNavigate } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import DropdownMenu from './DropdownMenu'
import { signOut } from '../server/auth'

interface AccountDropdownProps {
  onNavigate?: (src: string) => void
}

export default function AccountDropdown({ onNavigate }: AccountDropdownProps) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate({ to: '/' })
  }

  return (
    <DropdownMenu
      trigger={
        <div className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-slate-800 transition-colors">
          Account
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      }
      items={[
        {
          label: 'Projects',
          onClick: () => onNavigate ? onNavigate('/projects') : navigate({ to: '/projects' }),
        },
        {
          label: 'Settings',
          onClick: () => onNavigate ? onNavigate('/settings') : navigate({ to: '/settings' }),
        },
        { label: 'Sign out', onClick: handleSignOut },
      ]}
    />
  )
}
