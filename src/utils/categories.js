import { supabase } from '../supabase';
import { PRESET_CATEGORIES, slugify } from './helpers';

function mapCategory(row) {
  return {
    id: row.id,
    label: row.label,
    icon: row.icon,
    color: row.color,
  };
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, label, icon, color')
    .order('label');

  if (error) throw error;
  return data.map(mapCategory);
}

export function subscribeCategories(onUpdate) {
  const load = async () => {
    try {
      const categories = await fetchCategories();
      onUpdate(categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  load();

  const channel = supabase
    .channel('categories-global')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'categories',
      },
      load
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function seedGlobalCategories() {
  const { count, error: countError } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  if (count > 0) return;

  const rows = PRESET_CATEGORIES.map((category) => ({
    slug: category.id,
    label: category.label,
    icon: category.icon,
    color: category.color,
  }));

  const { error } = await supabase.from('categories').insert(rows);
  if (error) throw error;
}

export async function addCategory(category) {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      slug: slugify(category.label),
      label: category.label,
      icon: category.icon,
      color: category.color,
    })
    .select('id, label, icon, color')
    .single();

  if (error) throw error;
  return mapCategory(data);
}
