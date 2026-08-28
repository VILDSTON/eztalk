import React, { useState } from 'react';
import { SquarePen, Users, Search, X, Trash2, Globe, MessageSquare, Flame } from 'lucide-react';
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
  onSelectUser: (user: User) => void;
  onSelectGroup?: (group: Group) => void;
  onCreateGroup?: (name: string, avatar: string, memberHandles: string[]) => void;
  onDeleteGroup?: (groupId: string) => void;
}

function getStatusDotColor(status: string): string {
  switch (status) {
    case 'Online':
      return 'bg-[#00ff73] shadow-[0_0_8px_#00ff73]';
    case 'Away':
      return 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
    case 'Busy':
      return 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';
    case 'Offline':
    default:
      return 'bg-slate-500 shadow-[0_0_6px_rgba(148,163,184,0.4)]';
  }
}

export const FriendsList: React.FC<FriendsListProps> = ({
  currentUser,
  users,
  allExistingUsers = [],
  groups = [],
  selectedUserId,
  selectedGroupId,
  onSelectUser,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
}) => {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'groups' | 'online'>('all');

  const cleanQuery = searchQuery.trim().toLowerCase().replace('@', '');

  // 1. Direct active chats
  const matchedUsers = users.filter((u) => {
    if (filterTab === 'online' && u.status !== 'Online') return false;
    if (!cleanQuery) return true;
    return (
      u.handle.toLowerCase().replace('@', '').includes(cleanQuery) ||
      (u.name && u.name.toLowerCase().includes(cleanQuery)) ||
      (u.bio && u.bio.toLowerCase().includes(cleanQuery))
    );
  });
  const filteredUsers = cleanQuery ? matchedUsers.slice(0, 5) : matchedUsers;

  // 2. Groups
  const matchedGroups = groups.filter((g) => {
    if (filterTab === 'online') return false;
    if (!cleanQuery) return true;
    return (
      g.name.toLowerCase().includes(cleanQuery) ||
      g.memberHandles.some((h) => h.toLowerCase().replace('@', '').includes(cleanQuery))
    );
  });
  const filteredGroups = cleanQuery ? matchedGroups.slice(0, 5) : matchedGroups;

  // 3. Global Search: Registered users across website not in existing active filtered chats
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
      <div className="w-80 flex flex-col py-4 px-3.5 border-r border-white/5 bg-[#0d0e12] select-none shrink-0 overflow-hidden font-sans">
        {/* Header with "Chats", Group Create & Compose */}
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-white tracking-tight">Messages</h2>
            <span className="text-[11px] font-mono text-[#00ff73] bg-[#00ff73]/10 px-2 py-0.5 rounded-full font-bold border border-[#00ff73]/20">
              {filteredUsers.length + filteredGroups.length}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(true)}
              className="text-gray-400 hover:text-[#00ff73] p-1.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
              title="Create group chat"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsComposeOpen(true)}
              className="text-[#00ff73] hover:text-[#39ff8e] p-1.5 rounded-xl hover:bg-[#00ff73]/10 transition-all cursor-pointer border border-[#00ff73]/20"
              title="Start direct chat"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Global Search Bar */}
        <div className="relative flex items-center mb-3">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats & users..."
            className="w-full bg-[#13151b] border border-white/5 focus:border-[#00ff73]/50 rounded-xl pl-8.5 pr-7 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(0,255,115,0.15)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Tags */}
        {!searchQuery && (
          <div className="flex items-center space-x-1 mb-3 px-0.5">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'direct', label: 'Direct' },
                { id: 'groups', label: 'Groups' },
                { id: 'online', label: 'Online' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  filterTab === tab.id
                    ? 'bg-[#00ff73] text-black shadow-[0_0_10px_rgba(0,255,115,0.3)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Chats, Groups & Global Search Results List */}
        <div className="flex flex-col space-y-1 overflow-y-auto custom-scrollbar pr-1 flex-1">
          {/* Groups Section */}
          {(filterTab === 'all' || filterTab === 'groups') && filteredGroups.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Groups ({filteredGroups.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredGroups.map((group) => {
                  const isSelected = selectedGroupId === group.id;
                  return (
                    <div
                      key={group.id}
                      onClick={() => onSelectGroup && onSelectGroup(group)}
                      className={`group/item relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-150 border ${
                        isSelected
                          ? 'bg-[#181a22] text-white shadow-md border-[#00ff73]/40'
                          : 'hover:bg-white/5 text-gray-300 border-transparent hover:border-white/5'
                      }`}
                    >
                      {/* Active Indicator Line */}
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#00ff73] rounded-r-full shadow-[0_0_8px_#00ff73]" />
                      )}

                      <div className="flex items-center space-x-3 min-w-0 flex-1 pl-1">
                        <div className="relative shrink-0">
                          <img
                            src={group.avatar}
                            alt={group.name}
                            className="w-10 h-10 rounded-full object-cover border border-white/10 bg-gray-800"
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00ff73] text-black flex items-center justify-center text-[8px] font-bold border border-[#0d0e12]">
                            <Users className="w-2 h-2" />
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold text-white truncate">{group.name}</span>
                          <span className="text-[11px] text-gray-400 truncate">
                            {group.memberHandles.length} members
                          </span>
                        </div>
                      </div>

                      {/* Hover Delete Group button */}
                      {onDeleteGroup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteGroup(group.id);
                          }}
                          className="opacity-0 group-hover/item:opacity-100 p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer shrink-0 ml-1"
                          title="Delete group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Chats Section */}
          {(filterTab === 'all' || filterTab === 'direct' || filterTab === 'online') && (
            <div>
              {filteredGroups.length > 0 && filterTab === 'all' && (
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Direct Chats ({filteredUsers.length})
                </div>
              )}
              {filteredUsers.length === 0 && filteredGroups.length === 0 && globalResults.length === 0 ? (
                <div className="text-xs text-gray-500 italic p-6 text-center bg-white/2 rounded-2xl border border-white/5 mt-2">
                  {searchQuery ? 'No users found matching search' : 'No chats yet. Click + to start.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => {
                    const isSelected = !selectedGroupId && user.id === selectedUserId;
                    return (
                      <div
                        key={user.id}
                        onClick={() => onSelectUser(user)}
                        className={`group/useritem relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-150 border ${
                          isSelected
                            ? 'bg-[#181a22] text-white shadow-md border-[#00ff73]/40'
                            : 'hover:bg-white/5 text-gray-300 border-transparent hover:border-white/5'
                        }`}
                      >
                        {/* Active Indicator Line */}
                        {isSelected && (
                          <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#00ff73] rounded-r-full shadow-[0_0_8px_#00ff73]" />
                        )}

                        <div className="flex items-center space-x-3 min-w-0 flex-1 pl-1">
                          {/* Avatar with status dot badge */}
                          <div className="relative shrink-0">
                            <img
                              src={user.avatar}
                              alt={user.handle}
                              className="w-10 h-10 rounded-full object-cover border border-white/10 bg-gray-800"
                            />
                            {/* Dynamic badge indicator */}
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0e12] ${getStatusDotColor(
                                user.status
                              )}`}
                              title={user.status}
                            />
                          </div>

                          {/* Contact Info */}
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate text-white">
                                {user.name || user.handle}
                              </span>
                              {user.statusEmoji && (
                                <span className="text-xs shrink-0">{user.statusEmoji}</span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono truncate">
                              {user.handle}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Global Search Results (Registered Website Users) */}
          {cleanQuery && globalResults.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-white/5">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#00ff73] tracking-wider flex items-center space-x-1.5">
                <Globe className="w-3 h-3 animate-spin" />
                <span>Global Users Found</span>
              </div>
              <div className="space-y-1 mt-1">
                {globalResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#00ff73]/10 text-gray-300 hover:text-white cursor-pointer transition-colors border border-dashed border-[#00ff73]/30"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.handle}
                          className="w-8 h-8 rounded-full object-cover border border-[#00ff73]/40"
                        />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-white truncate">
                          {user.name || user.handle}
                        </span>
                        <span className="text-[10px] text-[#00ff73] font-mono truncate">
                          {user.handle}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-black bg-[#00ff73] px-2 py-0.5 rounded-lg shrink-0">
                      Message
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
