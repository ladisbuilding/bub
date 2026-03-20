import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Form from '../components/Form'
import Input from '../components/Input'
import Button from '../components/Button'
import { signIn } from '../server/auth'

export const Route = createFileRoute('/sign-in')({
  beforeLoad: ({ context }) => {
    if ((context as any).user) throw redirect({ to: '/' })
  },
  component: SignIn,
})

function SignIn() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string

    try {
      await signIn({ data: { email, password } })
      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form
      title="Sign in"
      description="Welcome back to Bub.ai"
      error={error}
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/create-account" className="text-blue-400 hover:text-blue-300">
            Create account
          </Link>
        </>
      }
      onSubmit={handleSubmit}
    >
      <Input label="Email" id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      <Input label="Password" id="password" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </Button>
    </Form>
  )
}
