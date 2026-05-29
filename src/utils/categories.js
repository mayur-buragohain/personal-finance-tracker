import { doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { categoriesCollection } from './paths';
import { PRESET_CATEGORIES } from './helpers';

export async function seedCategories(authUid, profileId) {
  const categoriesRef = categoriesCollection(authUid, profileId);
  const snapshot = await getDocs(categoriesRef);

  if (!snapshot.empty) return;

  await Promise.all(
    PRESET_CATEGORIES.map((category) =>
      setDoc(doc(categoriesRef, category.id), {
        id: category.id,
        label: category.label,
        icon: category.icon,
        color: category.color,
      })
    )
  );
}

export async function addCategory(authUid, profileId, category) {
  const categoriesRef = categoriesCollection(authUid, profileId);
  await setDoc(doc(categoriesRef, category.id), {
    id: category.id,
    label: category.label,
    icon: category.icon,
    color: category.color,
    createdAt: serverTimestamp(),
  });
}
