import { useParams } from 'react-router-dom'
import { MobileLayout } from './MobileLayout'

export default function AdminAnnouncementEditPage() {
  const { id } = useParams()
  return <MobileLayout key={id} />
}
