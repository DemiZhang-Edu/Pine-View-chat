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
