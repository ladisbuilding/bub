interface AuthContentLayoutProps {
  children: React.ReactNode
}

export default function AuthContentLayout({ children }: AuthContentLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}
