import { User, Message } from '../types/chat';

export const INITIAL_USERS: User[] = [
  {
    id: 'user_a',
    name: 'User A',
    handle: '@User_A',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'Online',
    bio: 'Product Designer & UI enthusiast at EzTalk.',
  },
  {
    id: 'user_b',
    name: 'User B',
    handle: '@User_B',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'Online',
    bio: 'Frontend engineer passionate about React and WebRTC.',
  },
  {
    id: 'user_c',
    name: 'User C',
    handle: '@User_C',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'Online',
    bio: 'Available for messaging on EzTalk.',
  },
];

// Leftmost sidebar quick contacts (in image_0.png: @User_A, @User_B, @User_A)
export const SIDEBAR_CONTACTS = [
  {
    id: 'sb_1',
    handle: '@User_A',
    status: 'Online',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'sb_2',
    handle: '@User_B',
    status: 'Online',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'sb_3',
    handle: '@User_A',
    status: 'Online',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_MESSAGES_USER_A: Message[] = [
  {
    id: 'msg_1',
    senderId: 'me',
    text: 'Hi cnn hate message',
    timestamp: 'Sent PM',
  },
  {
    id: 'msg_2',
    senderId: 'user_a',
    text: "What's not the message thread?",
    timestamp: 'Received',
  },
  {
    id: 'msg_3',
    senderId: 'me',
    text: 'Why is a mow important?',
    timestamp: 'Sent PM',
  },
  {
    id: 'msg_4',
    senderId: 'user_a',
    text: 'I not mportant conseting time. What thanks on message.ns',
    timestamp: 'Received',
  },
  {
    id: 'msg_5',
    senderId: 'me',
    text: 'Hi, fmlwwvo you eanre I have 10 minutes informations?',
    timestamp: 'Sent PM',
  },
];

export const INITIAL_MESSAGES_USER_B: Message[] = [
  {
    id: 'msg_b1',
    senderId: 'user_b',
    text: 'Hey! Are we still syncing up for the design review today?',
    timestamp: 'Received',
  },
  {
    id: 'msg_b2',
    senderId: 'me',
    text: 'Yes, I just finished the EzTalk UI prototype mockup. Here is the preview screenshot:',
    attachment: {
      id: 'att_b1',
      name: 'design_mockup.png',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
      size: '245 KB',
    },
    timestamp: 'Sent PM',
  },
  {
    id: 'msg_b3',
    senderId: 'user_b',
    text: 'Awesome, looks super clean with the neon green theme!',
    timestamp: 'Received',
  },
];

export const INITIAL_MESSAGES_USER_C: Message[] = [
  {
    id: 'msg_c1',
    senderId: 'user_c',
    text: 'Hello, check out the new dark mode color palette.',
    attachment: {
      id: 'att_c1',
      name: 'palette_moodboard.jpg',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80',
      size: '312 KB',
    },
    timestamp: 'Received',
  },
  {
    id: 'msg_c2',
    senderId: 'me',
    text: 'Checking it right now, the contrast is spot on.',
    attachment: {
      id: 'att_c2',
      name: 'abstract_waves.jpg',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&auto=format&fit=crop&q=80',
      size: '420 KB',
    },
    timestamp: 'Sent PM',
  },
];
