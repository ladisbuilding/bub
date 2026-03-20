interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  title: string
  description?: string
  footer?: React.ReactNode
  error?: string
}

export default function Form({ title, description, footer, error, children, className = '', ...props }: FormProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          {description && <p className="mt-2 text-gray-400">{description}</p>}
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        <form className={`space-y-4 ${className}`} {...props}>
          {children}
        </form>
        {footer && <div className="mt-6 text-center text-sm text-gray-400">{footer}</div>}
      </div>
    </div>
  )
}
