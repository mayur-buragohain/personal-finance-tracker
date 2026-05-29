import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { tagsCollection } from './paths';

export async function addTag(authUid, profileId, categoryId, tag) {
  const ref = tagsCollection(authUid, profileId, categoryId);
  await setDoc(doc(ref, tag.id), {
    id: tag.id,
    label: tag.label,
    categoryId,
    createdAt: serverTimestamp(),
  });
}
