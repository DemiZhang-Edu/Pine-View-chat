import { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  createdAt: Timestamp;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string;
  lastSeen: Timestamp;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: Timestamp;
  tags?: string[];
}
