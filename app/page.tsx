import { redirect } from 'next/navigation'

export default function LaunchPage() {
  redirect('/auth/login')
}
