'use client'
import ProviderMyJobsPage from '../../my-jobs/page'
import ChatPage from '../../../chat/[id]/page'

export default function ProviderChatRoute() {
  return (
    <>
      <ProviderMyJobsPage />
      <ChatPage />
    </>
  )
}
