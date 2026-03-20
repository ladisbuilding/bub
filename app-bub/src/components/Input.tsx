interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  theme?: 'dark' | 'light'
}

const themes = {
  dark: {
    label: 'text-gray-300',
    input: 'bg-slate-800 border-slate-700 text-white placeholder-gray-500',
  },
  light: {
    label: 'text-gray-700',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
  },
}

export default function Input({ label, id, type = 'text', theme = 'dark', className = '', ...props }: InputProps) {
  const t = themes[theme]
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`text-sm font-medium ${t.label}`}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${t.input} ${className}`}
        {...props}
      />
    </div>
  )
}
