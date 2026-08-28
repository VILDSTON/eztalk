import React, { useState } from 'react';
import {
  Menu,
  Search,
  X,
  SquarePen,
  Users,
  CheckCheck,
  Globe,
  Trash2,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups' | 'online'>('all');

  const cleanQuery = searchQuery.trim().toLowerCase().replace('@', '');

  // Filter users
  const matchedUsers = users.filter((u) => {
    if (activeTab === 'online' && u.status !== 'Online') return false;
    if (!cleanQuery) return true;
    return (
      u.handle.toLowerCase().replace('@', '').includes(cleanQuery) ||
      (u.name && u.name.toLowerCase().includes(cleanQuery)) ||
      (u.bio && u.bio.toLowerCase().includes(cleanQuery))
    );
  });
  const filteredUsers = cleanQuery ? matchedUsers.slice(0, 6) : matchedUsers;

  // Filter groups
  const matchedGroups = groups.filter((g) => {
    if (activeTab === 'online') return false;
    if (!cleanQuery) return true;
    return (
      g.name.toLowerCase().includes(cleanQuery) ||
      g.memberHandles.some((h) => h.toLowerCase().replace('@', '').includes(cleanQuery))
    );
  });
  const filteredGroups = cleanQuery ? matchedGroups.slice(0, 6) : matchedGroups;

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
        .slice(0, 4)
    : [];

  return (
    <>
      <div className="w-88 sm:w-96 h-full flex flex-col bg-[#111216] border-r border-white/5 select-none shrink-0 relative overflow-hidden font-sans">
        {/* Telegram Top Bar: Hamburger Menu + Search */}
        <div className="p-3 pb-2 flex items-center space-x-2.5">
          {/* Hamburger Menu Button */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Input Box */}
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-[#1c1e24] focus:bg-[#22252d] border border-transparent focus:border-[#00ff73]/40 rounded-full pl-9.5 pr-8 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
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

        {/* Telegram Folder Tabs: All Chats / Direct / Groups / Online */}
        {!searchQuery && (
          <div className="flex items-center px-3 border-b border-white/5 overflow-x-auto custom-scrollbar">
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
                className={`py-2 px-3 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#00ff73] text-[#00ff73] font-bold'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Chat List Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
          {/* Groups Section */}
          {(activeTab === 'all' || activeTab === 'groups') &&
            filteredGroups.map((group) => {
              const isSelected = selectedGroupId === group.id;
              return (
                <div
                  key={group.id}
                  onClick={() => onSelectGroup && onSelectGroup(group)}
                  className={`group/item flex items-center px-3 py-2.5 cursor-pointer transition-colors relative ${
                    isSelected
                      ? 'bg-[#1a2e23] border-l-3 border-[#00ff73]'
                      : 'hover:bg-white/5 border-l-3 border-transparent'
                  }`}
                >
                  {/* Group Avatar */}
                  <div className="relative shrink-0 mr-3">
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="w-13 h-13 rounded-full object-cover border border-white/10 bg-gray-800"
                    />
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#00ff73] text-black flex items-center justify-center text-[9px] font-bold border border-[#111216]">
                      <Users className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  {/* Group Details */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white truncate">{group.name}</span>
                      <span className="text-[11px] text-gray-400 font-mono shrink-0 ml-2">Group</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-400 truncate">
                        {group.memberHandles.length} members ({group.memberHandles.slice(0, 2).join(', ')}...)
                      </span>
                      {onDeleteGroup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteGroup(group.id);
                          }}
                          className="opacity-0 group-hover/item:opacity-100 p-1 text-gray-400 hover:text-red-400 rounded cursor-pointer transition-opacity ml-1"
                          title="Delete group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Direct Chats */}
          {(activeTab === 'all' || activeTab === 'direct' || activeTab === 'online') &&
            filteredUsers.map((user) => {
              const isSelected = !selectedGroupId && user.id === selectedUserId;
              return (
                <div
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className={`group/user flex items-center px-3 py-2.5 cursor-pointer transition-colors relative ${
                    isSelected
                      ? 'bg-[#1a2e23] border-l-3 border-[#00ff73]'
                      : 'hover:bg-white/5 border-l-3 border-transparent'
                  }`}
                >
                  {/* User Avatar with Status */}
                  <div className="relative shrink-0 mr-3">
                    <img
                      src={user.avatar}
                      alt={user.handle}
                      className="w-13 h-13 rounded-full object-cover border border-white/10 bg-gray-800"
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#111216] ${
                        user.status === 'Online'
                          ? 'bg-[#00ff73] shadow-[0_0_6px_#00ff73]'
                          : user.status === 'Away'
                          ? 'bg-amber-400'
                          : user.status === 'Busy'
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  {/* User Details */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white truncate">
                        {user.name || user.handle}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono shrink-0 ml-2">
                        {user.status === 'Online' ? (
                          <span className="text-[#00ff73]">online</span>
                        ) : (
                          user.status.toLowerCase()
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-400 truncate">{user.bio || user.handle}</span>
                      {user.statusEmoji && (
                        <span className="text-xs shrink-0 ml-1.5">{user.statusEmoji}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Empty State */}
          {filteredUsers.length === 0 && filteredGroups.length === 0 && globalResults.length === 0 && (
            <div className="py-16 px-4 text-center text-gray-500 text-xs">
              <p className="font-semibold text-gray-300">No chats found</p>
              <p className="mt-1 text-gray-500">Tap the pencil button below to start a conversation.</p>
            </div>
          )}

          {/* Global Search Results */}
          {cleanQuery && globalResults.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5 px-3">
              <div className="px-1 py-1 text-[11px] font-bold text-[#00ff73] uppercase tracking-wider flex items-center space-x-1.5 mb-1">
                <Globe className="w-3.5 h-3.5 animate-spin" />
                <span>Global Search</span>
              </div>
              {globalResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user);
                    setSearchQuery('');
                  }}
                  className="flex items-center px-2 py-2 rounded-2xl hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <img
                    src={user.avatar}
                    alt={user.handle}
                    className="w-10 h-10 rounded-full object-cover border border-[#00ff73]/30 mr-3"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{user.name || user.handle}</span>
                    <span className="text-[11px] text-[#00ff73] font-mono block truncate">{user.handle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Telegram Floating Action Button (FAB - New Chat / Compose) */}
        <button
          type="button"
          onClick={() => setIsComposeOpen(true)}
          className="absolute bottom-6 right-6 w-13 h-13 rounded-full bg-[#00ff73] hover:bg-[#1aff85] text-black shadow-[0_4px_20px_rgba(0,255,115,0.45)] hover:shadow-[0_4px_30px_rgba(0,255,115,0.65)] transition-all hover:scale-108 active:scale-95 flex items-center justify-center cursor-pointer z-20 border border-[#00ff73]"
          title="New Message"
        >
          <SquarePen className="w-6 h-6" />
        </button>
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
      {onCreateGroup && (
        <CreateGroupModal
          isOpen={isGroupModalOpen}
          existingUsers={allExistingUsers}
          currentUserHandle={currentUser?.handle}
          onClose={() => setIsGroupModalOpen(false)}
          onCreateGroup={(name, avatar, members) => {
            onCreateGroup(name, avatar, members);
            setIsGroupModalOpen(false);
          }}
        />
      )}
    </>
  );
};
