import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Form from '../components/Form'
import Input from '../components/Input'
import Button from '../components/Button'
import { createAccount } from '../server/auth'

export const Route = createFileRoute('/create-account')({
  beforeLoad: ({ context }) => {
    if ((context as any).user) throw redirect({ to: '/' })
  },
  component: CreateAccount,
})

function CreateAccount() {
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
    const confirmPassword = form.get('confirm-password') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      await createAccount({ data: { email, password } })
      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form
      title="Create account"
      description="Get started with Bub.ai"
      error={error}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </>
      }
      onSubmit={handleSubmit}
    >
      <Input label="Email" id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      <Input label="Password" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <Input label="Confirm password" id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </Button>
    </Form>
  )
}
