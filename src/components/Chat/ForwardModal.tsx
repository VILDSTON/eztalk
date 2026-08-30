import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Bookmark,
  Users,
  CornerUpRight,
  Send,
  Check,
} from 'lucide-react';
import { User, Group, Message } from '../../types/chat';
import { normalizeHandle } from '../../utils/chatStorage';

interface ForwardModalProps {
  isOpen: boolean;
  message: Message | null;
  currentUser: User;
  contacts: User[];
  groups: Group[];
  onlineHandles?: string[];
  onClose: () => void;
  onForward: (message: Message, targetUser?: User, targetGroup?: Group) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  message,
  currentUser,
  contacts,
  groups,
  onlineHandles = [],
  onClose,
  onForward,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<{ user?: User; group?: Group } | null>(null);

  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredContacts = useMemo(() => {
    return contacts.filter((u) => {
      if (normalizeHandle(u.handle) === normalizeHandle(currentUser.handle)) return false;
      if (!cleanQuery) return true;
      return (
        u.handle.toLowerCase().includes(cleanQuery) ||
        (u.name && u.name.toLowerCase().includes(cleanQuery))
      );
    });
  }, [contacts, currentUser.handle, cleanQuery]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (!cleanQuery) return true;
      return g.name.toLowerCase().includes(cleanQuery);
    });
  }, [groups, cleanQuery]);

  if (!isOpen || !message) return null;

  const handleConfirm = () => {
    if (!selectedTarget) return;
    onForward(message, selectedTarget.user, selectedTarget.group);
    onClose();
  };

  const handleSelect = (target: { user?: User; group?: Group }) => {
    setSelectedTarget(target);
    onForward(message, target.user, target.group);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-overlay animate-fade-in select-none font-sans">
      <div className="relative w-full max-w-md bg-ez-elevated border border-ez-border rounded-3xl shadow-glass-lg overflow-hidden flex flex-col max-h-[85vh] animate-scale-up backdrop-blur-xl">
        {/* Header */}
        <div className="p-4 border-b border-ez-border/50 flex items-center justify-between bg-ez-surface">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/20">
              <CornerUpRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Forward Message</h3>
              <p className="text-xs text-ez-muted">Choose where to forward this message</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-ez-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="px-4 py-2.5 bg-ez-base/60 border-b border-ez-border/30 flex items-center space-x-2 text-xs text-gray-300">
          <span className="font-bold text-neon-green truncate shrink-0">
            {message.senderHandle || 'Message'}:
          </span>
          <span className="italic truncate text-gray-400">
            {message.text || message.attachment?.name || 'Attachment'}
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-ez-border/40">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-ez-muted absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people and groups..."
              className="w-full bg-ez-surface focus:bg-ez-hover border border-ez-border/50 focus:border-neon-green/40 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-ez-muted outline-none transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* List of Contacts & Groups */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {/* Saved Messages */}
          {(!cleanQuery || 'saved messages'.includes(cleanQuery)) && (
            <div
              onClick={() => handleSelect({ user: currentUser })}
              className="flex items-center space-x-3 p-2.5 rounded-2xl hover:bg-white/[0.04] cursor-pointer transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-neon-green/15 border border-neon-green/25 flex items-center justify-center text-neon-green shrink-0">
                <Bookmark className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-white group-hover:text-neon-green transition-colors">
                  Saved Messages
                </span>
                <span className="text-[10px] text-neon-green font-mono">Your personal cloud notes</span>
              </div>
            </div>
          )}

          {/* Groups Section */}
          {filteredGroups.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold text-ez-muted uppercase tracking-wider">
                Groups
              </div>
              {filteredGroups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleSelect({ group: g })}
                  className="flex items-center space-x-3 p-2.5 rounded-2xl hover:bg-white/[0.04] cursor-pointer transition-colors group"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-ez-border bg-ez-surface shrink-0">
                    <img src={g.avatar} alt={g.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-white group-hover:text-neon-green transition-colors truncate">
                      {g.name}
                    </span>
                    <span className="text-[10px] text-ez-muted font-mono">{g.memberHandles.length} members</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contacts Section */}
          {filteredContacts.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold text-ez-muted uppercase tracking-wider">
                Contacts
              </div>
              {filteredContacts.map((u) => {
                const isOnline = onlineHandles.some(
                  (h) => normalizeHandle(h).toLowerCase() === normalizeHandle(u.handle).toLowerCase()
                );
                return (
                  <div
                    key={u.id || u.handle}
                    onClick={() => handleSelect({ user: u })}
                    className="flex items-center space-x-3 p-2.5 rounded-2xl hover:bg-white/[0.04] cursor-pointer transition-colors group"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-ez-border bg-ez-surface shrink-0">
                      <img src={u.avatar} alt={u.handle} className="w-full h-full object-cover" />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-neon-green border-2 border-ez-elevated shadow-neon-dot" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-white group-hover:text-neon-green transition-colors truncate">
                        {u.name || u.handle}
                      </span>
                      <span className="text-[10px] text-ez-muted font-mono truncate">{u.handle}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredContacts.length === 0 && filteredGroups.length === 0 && (
            <div className="py-8 text-center text-xs text-ez-muted">
              No contacts or groups found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
