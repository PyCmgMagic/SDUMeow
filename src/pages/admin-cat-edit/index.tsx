import { useParams } from 'react-router-dom'
import { MobileLayout } from './MobileLayout'

export default function AdminCatEditPage() {
  const { id } = useParams()
  return <MobileLayout key={id} />
}
