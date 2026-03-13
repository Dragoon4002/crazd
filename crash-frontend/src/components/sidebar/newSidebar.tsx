'use client'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { ServerChat } from '../chat/ServerChat'

export function NewSidebar() {
  return (
    <Sidebar>
      <SidebarHeader title="Chat" className='h-15 flex justify-center pl-4 w-full text-2xl font-display'>
          CRAZD
      </SidebarHeader>
      <SidebarContent className='border-r'>
          <SidebarGroupContent className='h-full'>
            <ServerChat />
          </SidebarGroupContent>
      </SidebarContent>
    </Sidebar>
  )
}