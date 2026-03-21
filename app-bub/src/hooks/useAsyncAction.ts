import { useState } from 'react'

export function useAsyncAction() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function execute(action: () => Promise<void>) {
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      await action()
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return { error, loading, success, execute, setError, setSuccess }
}
