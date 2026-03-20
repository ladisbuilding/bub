import { Link } from '@tanstack/react-router'
import Button from './Button'
import AccountDropdown from './AccountDropdown'

interface HeaderProps {
  user: { id: string; email: string } | null
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="fixed top-0 z-10 w-full flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
      <Link to="/" className="text-xl font-bold text-white">
        Bub.ai
      </Link>
      <div className="flex items-center gap-3">
        {user ? (
          <AccountDropdown />
        ) : (
          <>
            <Link to="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/create-account">
              <Button variant="primary">Create account</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
