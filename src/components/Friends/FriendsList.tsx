import React, { useState } from 'react';
import {
  Menu,
  Search,
  X,
  SquarePen,
  Users,
  UserPlus,
  Globe,
  Trash2,
  PlusCircle,
  MessageSquare,
  Bookmark,
} from 'lucide-react';
import { User, Group } from '../../types/chat';
import { ComposeModal } from './ComposeModal';
import { CreateGroupModal } from '../Groups/CreateGroupModal';
import { normalizeHandle } from '../../utils/chatStorage';

interface FriendsListProps {
  currentUser?: User | null;
  users: User[];
  allExistingUsers?: User[];
  groups?: Group[];
  unreadCounts?: Record<string, number>;
  onlineHandles?: string[];
  selectedUserId: string;
  selectedGroupId?: string | null;
  onOpenMenu?: () => void;
  onSelectUser: (user: User) => void;
  onSelectGroup?: (group: Group) => void;
  onCreateGroup?: (name: string, avatar: string, memberHandles: string[]) => void;
  onDeleteGroup?: (groupId: string) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({
  currentUser,
  users,
  allExistingUsers = [],
  groups = [],
  unreadCounts = {},
  onlineHandles = [],
  selectedUserId,
  selectedGroupId,
  onOpenMenu,
  onSelectUser,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
}) => {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups' | 'online'>('all');

  const cleanQuery = searchQuery.trim().toLowerCase().replace('@', '');

  const isUserOnline = (handle: string) => {
    return onlineHandles.some((h) => normalizeHandle(h).toLowerCase() === normalizeHandle(handle).toLowerCase());
  };

  // Filter users
  const matchedUsers = users.filter((u) => {
    if (activeTab === 'online' && !isUserOnline(u.handle)) return false;
    if (!cleanQuery) return true;
    return (
      u.handle.toLowerCase().replace('@', '').includes(cleanQuery) ||
      (u.name && u.name.toLowerCase().includes(cleanQuery)) ||
      (u.bio && u.bio.toLowerCase().includes(cleanQuery))
    );
  });
  const filteredUsers = cleanQuery ? matchedUsers.slice(0, 8) : matchedUsers;

  // Filter groups
  const matchedGroups = groups.filter((g) => {
    if (activeTab === 'online') return false;
    if (!cleanQuery) return true;
    return (
      g.name.toLowerCase().includes(cleanQuery) ||
      g.memberHandles.some((h) => h.toLowerCase().replace('@', '').includes(cleanQuery))
    );
  });
  const filteredGroups = cleanQuery ? matchedGroups.slice(0, 8) : matchedGroups;

  // Global search across all users
  const myHandle = normalizeHandle(currentUser?.handle || '').toLowerCase();
  const existingChatHandles = new Set(filteredUsers.map((u) => normalizeHandle(u.handle).toLowerCase()));

  const globalResults = cleanQuery
    ? allExistingUsers
        .filter((u) => {
          const targetHandle = normalizeHandle(u.handle).toLowerCase();
          if (targetHandle === myHandle) return false;
          if (existingChatHandles.has(targetHandle)) return false;
          return (
            targetHandle.replace('@', '').includes(cleanQuery) ||
            (u.name && u.name.toLowerCase().includes(cleanQuery)) ||
            (u.bio && u.bio.toLowerCase().includes(cleanQuery))
          );
        })
        .slice(0, 5)
    : [];

  return (
    <>
      <div className="w-80 sm:w-96 h-full flex flex-col bg-[#111216] border-r border-white/5 select-none shrink-0 relative overflow-hidden font-sans">
        {/* Telegram Top Bar: Hamburger Menu + Search */}
        <div className="p-3 pb-2 flex items-center space-x-2.5 bg-[#111216]">
          <button
            type="button"
            onClick={onOpenMenu}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Input */}
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats, contacts, groups..."
              className="w-full bg-[#1b1d24] focus:bg-[#22242d] border border-transparent focus:border-[#00ff73]/40 rounded-full pl-10 pr-8 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Telegram Navigation Tabs */}
        <div className="flex items-center px-3 border-b border-white/5 text-xs font-semibold overflow-x-auto custom-scrollbar">
          {(
            [
              { id: 'all', label: 'All Chats' },
              { id: 'direct', label: 'Personal' },
              { id: 'groups', label: 'Groups' },
              { id: 'online', label: 'Online' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#00ff73] text-[#00ff73]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chats & Contacts Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {/* Pinned Saved Messages in All Chats Tab */}
          {activeTab === 'all' && !searchQuery && currentUser && (
            <div
              onClick={() => onSelectUser(currentUser)}
              className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                selectedUserId === currentUser.id && !selectedGroupId
                  ? 'bg-[#00ff73]/15 border border-[#00ff73]/40 shadow-sm'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-full bg-[#00ff73]/20 border border-[#00ff73]/40 flex items-center justify-center text-[#00ff73] shrink-0">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white tracking-tight">Saved Messages</span>
                  </div>
                  <span className="text-xs text-[#00ff73] font-mono truncate">Cloud Storage</span>
                </div>
              </div>
            </div>
          )}

          {/* Group Chats */}
          {(activeTab === 'all' || activeTab === 'groups') &&
            filteredGroups.map((group) => {
              const isSelected = selectedGroupId === group.id;
              const unread = unreadCounts[group.id] || 0;
              return (
                <div
                  key={group.id}
                  onClick={() => onSelectGroup && onSelectGroup(group)}
                  className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#00ff73]/15 border border-[#00ff73]/40 shadow-sm'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className="relative w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-full overflow-hidden border border-white/10 shrink-0 bg-gray-800">
                      <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00ff73] text-black flex items-center justify-center text-[8px] font-bold border border-[#111216]">
                        <Users className="w-2 h-2" />
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white truncate tracking-tight">{group.name}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono truncate">
                        {group.memberHandles.length} members
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {unread > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#00ff73] text-black text-xs font-extrabold shadow-[0_0_8px_#00ff73]">
                        {unread}
                      </span>
                    )}

                    {onDeleteGroup && group.creatorHandle === normalizeHandle(currentUser?.handle || '') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete group "${group.name}"?`)) {
                            onDeleteGroup(group.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Delete Group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {/* User Chats */}
          {(activeTab === 'all' || activeTab === 'direct' || activeTab === 'online') &&
            filteredUsers.map((user) => {
              const isSelected = selectedUserId === user.id && !selectedGroupId;
              const online = isUserOnline(user.handle);
              const unread = unreadCounts[normalizeHandle(user.handle)] || unreadCounts[user.id] || 0;

              return (
                <div
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#00ff73]/15 border border-[#00ff73]/40 shadow-sm'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    {/* Fixed Avatar Container */}
                    <div className="relative w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-full overflow-hidden border border-white/10 shrink-0 bg-gray-800">
                      <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
                      <div
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#111216] ${
                          online ? 'bg-[#00ff73] shadow-[0_0_6px_#00ff73]' : 'bg-gray-500'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white truncate tracking-tight">
                          {user.name || user.handle}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 truncate">
                        {user.bio || (online ? 'online' : 'offline')}
                      </span>
                    </div>
                  </div>

                  {/* Status / Unread Counter */}
                  <div className="flex flex-col items-end shrink-0 space-y-1">
                    {unread > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#00ff73] text-black text-xs font-extrabold shadow-[0_0_8px_#00ff73] animate-pulse">
                        {unread}
                      </span>
                    ) : (
                      <span
                        className={`text-[11px] font-mono ${
                          online ? 'text-[#00ff73] font-medium' : 'text-gray-500'
                        }`}
                      >
                        {online ? 'online' : 'offline'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Global Directory Search Header & Items */}
          {cleanQuery && globalResults.length > 0 && (
            <div className="pt-3 border-t border-white/5">
              <div className="flex items-center space-x-1.5 px-3 py-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <Globe className="w-3 h-3 text-[#00ff73]" />
                <span>Global Search</span>
              </div>
              {globalResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 cursor-pointer transition-all"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className="w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-full overflow-hidden border border-white/10 shrink-0">
                      <img src={user.avatar} alt={user.handle} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-white truncate">{user.name || user.handle}</span>
                      <span className="text-xs text-[#00ff73] font-mono truncate">{user.handle}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#00ff73] bg-[#00ff73]/10 px-2.5 py-1 rounded-xl font-bold">
                    Chat
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Empty States */}
          {activeTab === 'groups' && filteredGroups.length === 0 && (
            <div className="text-center py-12 px-4 text-xs text-gray-500">
              <Users className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="font-semibold text-gray-400">No Groups Found</p>
              <p className="mt-1 text-gray-500">Create a new group to collaborate with friends.</p>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(true)}
                className="mt-3 px-4 py-2 bg-[#00ff73]/15 text-[#00ff73] hover:bg-[#00ff73] hover:text-black text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                + Create Group
              </button>
            </div>
          )}

          {filteredUsers.length === 0 && filteredGroups.length === 0 && globalResults.length === 0 && activeTab !== 'groups' && (
            <div className="text-center py-12 px-4 text-xs text-gray-500">
              <p className="font-semibold text-gray-400">No chats found</p>
              <p className="mt-1 text-gray-500">Search for people by handle or start a new conversation.</p>
            </div>
          )}
        </div>

        {/* Telegram Floating Pencil FAB Action Button */}
        <div className="absolute bottom-5 right-5 z-20">
          {showFabMenu && (
            <div className="absolute bottom-16 right-0 bg-[#1b1d24] border border-white/10 p-2 rounded-2xl shadow-2xl space-y-1 w-44 animate-scale-up backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setShowFabMenu(false);
                  setIsComposeOpen(true);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#00ff73]" />
                <span>New Direct Chat</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFabMenu(false);
                  setIsGroupModalOpen(true);
                }}
                className="w-full flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#00ff73]" />
                <span>New Group</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowFabMenu(!showFabMenu)}
            className="w-13 h-13 rounded-full bg-[#00ff73] hover:bg-[#1aff85] text-black shadow-[0_4px_20px_rgba(0,255,115,0.4)] flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title="New Chat"
          >
            <SquarePen className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Direct Chat Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        existingUsers={allExistingUsers}
        currentUserHandle={currentUser?.handle}
        onClose={() => setIsComposeOpen(false)}
        onSelectUser={(user) => {
          onSelectUser(user);
          setIsComposeOpen(false);
        }}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        existingUsers={allExistingUsers}
        currentUserHandle={currentUser?.handle}
        onClose={() => setIsGroupModalOpen(false)}
        onCreateGroup={(name, avatar, members) => {
          if (onCreateGroup) onCreateGroup(name, avatar, members);
          setIsGroupModalOpen(false);
        }}
      />
    </>
  );
};
