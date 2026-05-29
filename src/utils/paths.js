import { collection, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function profilesCollection(authUid) {
  return collection(db, 'users', authUid, 'profiles');
}

export function categoriesCollection(authUid, profileId) {
  return collection(db, 'users', authUid, 'profiles', profileId, 'categories');
}

export function expensesCollection(authUid, profileId) {
  return collection(db, 'users', authUid, 'profiles', profileId, 'expenses');
}

export function expenseDoc(authUid, profileId, expenseId) {
  return doc(db, 'users', authUid, 'profiles', profileId, 'expenses', expenseId);
}

export function profileDoc(authUid, profileId) {
  return doc(db, 'users', authUid, 'profiles', profileId);
}

export function tagsCollection(authUid, profileId, categoryId) {
  return collection(
    db,
    'users',
    authUid,
    'profiles',
    profileId,
    'categories',
    categoryId,
    'tags'
  );
}
