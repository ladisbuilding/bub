interface ContentProps {
  src?: string
}

export default function Content({ src }: ContentProps) {
  return (
    <div className="flex-1 h-full bg-white">
      {src ? (
        <iframe
          src={src}
          className="w-full h-full border-none"
          title="Content"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          No content loaded
        </div>
      )}
    </div>
  )
}
