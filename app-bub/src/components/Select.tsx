interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string
  options: SelectOption[]
  theme?: 'dark' | 'light'
}

const themes = {
  dark: {
    label: 'text-gray-300',
    select: 'bg-slate-800 border-slate-700 text-white',
  },
  light: {
    label: 'text-gray-700',
    select: 'bg-white border-gray-300 text-gray-900',
  },
}

export default function Select({ label, id, options, theme = 'dark', className = '', ...props }: SelectProps) {
  const t = themes[theme]
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`text-sm font-medium ${t.label}`}>
        {label}
      </label>
      <select
        id={id}
        className={`cursor-pointer w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${t.select} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
