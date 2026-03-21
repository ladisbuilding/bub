interface ContentProps {
  src?: string
}

export default function Content({ src }: ContentProps) {
  return (
    <div className="flex-1 h-full py-3 pr-3">
      {src ? (
        <iframe
          src={src}
          className="w-full h-full border-none rounded-xl"
          title="Content"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 rounded-xl bg-white">
          No content loaded
        </div>
      )}
    </div>
  )
}
