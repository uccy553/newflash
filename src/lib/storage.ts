import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { MAX_IMAGE_SIZE_BYTES } from './constants';

export const uploadFlashcardImage = async (userId: string, file: File): Promise<string> => {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`File size exceeds the limit of ${MAX_IMAGE_SIZE_BYTES / (1024*1024)}MB.`);
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Only images are allowed.');
  }

  const filePath = `users/${userId}/flashcard_images/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, filePath);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};

export const deleteFlashcardImage = async (imageUrl: string): Promise<void> => {
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error: any) {
    // It's okay if the file doesn't exist (e.g., already deleted or invalid URL)
    if (error.code === 'storage/object-not-found') {
      console.warn(`Image not found for deletion: ${imageUrl}`);
      return;
    }
    console.error(`Error deleting image ${imageUrl}:`, error);
    throw error; // Re-throw other errors
  }
};
