import React, { useState } from 'react';
import { SquarePen, Users, Search, X, Trash2, Globe } from 'lucide-react';
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

  const cleanQuery = searchQuery.trim().toLowerCase().replace('@', '');

  // 1. Direct active chats (capped to max 3 on search)
  const matchedUsers = users.filter((u) => {
    if (!cleanQuery) return true;
    return (
      u.handle.toLowerCase().replace('@', '').includes(cleanQuery) ||
      (u.name && u.name.toLowerCase().includes(cleanQuery)) ||
      (u.bio && u.bio.toLowerCase().includes(cleanQuery))
    );
  });
  const filteredUsers = cleanQuery ? matchedUsers.slice(0, 3) : matchedUsers;

  // 2. Groups (capped to max 3 on search)
  const matchedGroups = groups.filter((g) => {
    if (!cleanQuery) return true;
    return (
      g.name.toLowerCase().includes(cleanQuery) ||
      g.memberHandles.some((h) => h.toLowerCase().replace('@', '').includes(cleanQuery))
    );
  });
  const filteredGroups = cleanQuery ? matchedGroups.slice(0, 3) : matchedGroups;

  // 3. Global Search: Registered users across website not in existing active filtered chats (capped to max 3)
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
        .slice(0, 3)
    : [];

  return (
    <>
      <div className="w-72 flex flex-col py-5 px-3.5 border-r border-[#26282f] bg-[#16171b] select-none shrink-0 overflow-hidden">
        {/* Header with "Chats", Group Create & Compose */}
        <div className="flex items-center justify-between px-1 mb-3.5">
          <h2 className="text-lg font-bold text-white tracking-tight">Chats</h2>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(true)}
              className="text-gray-400 hover:text-[#00ff73] p-1.5 rounded-lg hover:bg-[#252830] transition-colors cursor-pointer"
              title="Create group chat"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsComposeOpen(true)}
              className="text-[#00ff73] hover:text-[#39ff8e] p-1.5 rounded-lg hover:bg-[#252830] transition-colors cursor-pointer"
              title="Start direct chat"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Global Search Bar */}
        <div className="relative flex items-center mb-3">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats & all users..."
            className="w-full bg-[#1b1d24] border border-[#272a34] focus:border-[#00ff73] rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
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

        {/* Chats, Groups & Global Search Results List */}
        <div className="flex flex-col space-y-1.5 overflow-y-auto custom-scrollbar pr-1 flex-1">
          {/* Groups Section */}
          {filteredGroups.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Groups ({filteredGroups.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredGroups.map((group) => {
                  const isSelected = selectedGroupId === group.id;
                  return (
                    <div
                      key={group.id}
                      onClick={() => onSelectGroup && onSelectGroup(group)}
                      className={`group/item flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-[#2d2f37] text-white shadow-sm border border-[#00ff73]/30'
                          : 'hover:bg-[#202228] text-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <img
                            src={group.avatar}
                            alt={group.name}
                            className="w-9 h-9 rounded-full object-cover border border-gray-700 bg-gray-800"
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00ff73] text-black flex items-center justify-center text-[8px] font-bold border border-[#16171b]">
                            <Users className="w-2.5 h-2.5" />
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold text-white truncate">{group.name}</span>
                          <span className="text-[10px] text-gray-400 truncate">
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
                          className="opacity-0 group-hover/item:opacity-100 p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer shrink-0 ml-1"
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
          <div>
            {filteredGroups.length > 0 && (
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Direct Chats ({filteredUsers.length})
              </div>
            )}
            {filteredUsers.length === 0 && filteredGroups.length === 0 && globalResults.length === 0 ? (
              <div className="text-xs text-gray-500 italic p-3 text-center">
                {searchQuery ? 'No users found matching search' : 'No chats yet'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => {
                  const isSelected = !selectedGroupId && user.id === selectedUserId;
                  return (
                    <div
                      key={user.id}
                      onClick={() => onSelectUser(user)}
                      className={`group/useritem flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-[#2d2f37] text-white shadow-sm border border-[#00ff73]/30'
                          : 'hover:bg-[#202228] text-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        {/* Avatar with status dot badge */}
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar}
                            alt={user.handle}
                            className="w-9 h-9 rounded-full object-cover border border-gray-700 bg-gray-800"
                          />
                          {/* Dynamic badge indicator */}
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#16171b] ${
                              user.status === 'Online'
                                ? 'bg-[#00ff73] shadow-[0_0_6px_#00ff73]'
                                : user.status === 'Away'
                                ? 'bg-yellow-400 shadow-[0_0_6px_#facc15]'
                                : user.status === 'Busy'
                                ? 'bg-red-400 shadow-[0_0_6px_#f87171]'
                                : 'bg-gray-400 shadow-[0_0_6px_rgba(156,163,175,0.5)]'
                            }`}
                            title={user.status}
                          />
                        </div>

                        {/* Contact Info */}
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-semibold truncate text-white">
                              {user.name || user.handle}
                            </span>
                            {user.statusEmoji && (
                              <span className="text-[10px] shrink-0">{user.statusEmoji}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 truncate">
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

          {/* Global Search Results (Registered Website Users) */}
          {cleanQuery && globalResults.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-[#26282f]">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#00ff73] tracking-wider flex items-center space-x-1.5">
                <Globe className="w-3 h-3" />
                <span>Global Search</span>
              </div>
              <div className="space-y-1 mt-1">
                {globalResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      setSearchQuery('');
                    }}
                    className="group/global flex items-center justify-between p-2.5 rounded-2xl cursor-pointer hover:bg-[#202228] text-gray-300 hover:text-white transition-all border border-transparent hover:border-[#00ff73]/30"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.handle}
                          className="w-9 h-9 rounded-full object-cover border border-[#00ff73]/40 bg-gray-800"
                        />
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#16171b] ${
                            user.status === 'Online'
                              ? 'bg-[#00ff73]'
                              : user.status === 'Away'
                              ? 'bg-yellow-400'
                              : user.status === 'Busy'
                              ? 'bg-red-400'
                              : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-semibold truncate text-white">
                            {user.name || user.handle}
                          </span>
                          {user.statusEmoji && (
                            <span className="text-[10px] shrink-0">{user.statusEmoji}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#00ff73] font-mono truncate">
                          {user.handle}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-black bg-[#00ff73] px-2 py-1 rounded-lg opacity-90 group-hover/global:opacity-100 shadow-neon-sm shrink-0">
                      Chat
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Direct Chat Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        users={allExistingUsers.length > 0 ? allExistingUsers : users}
        onClose={() => setIsComposeOpen(false)}
        onSelectUser={onSelectUser}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        friends={users}
        onClose={() => setIsGroupModalOpen(false)}
        onCreateGroup={(name, avatar, memberHandles) => {
          if (onCreateGroup) onCreateGroup(name, avatar, memberHandles);
        }}
      />
    </>
  );
};
