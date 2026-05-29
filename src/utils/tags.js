import { supabase } from '../supabase';

function mapTag(row) {
  return {
    id: row.id,
    label: row.label,
    categoryId: row.category_id,
  };
}

export async function fetchTags(categoryId) {
  const { data, error } = await supabase
    .from('tags')
    .select('id, label, category_id')
    .eq('category_id', categoryId)
    .order('label');

  if (error) throw error;
  return data.map(mapTag);
}

export function subscribeTags(categoryId, onUpdate) {
  if (!categoryId) {
    onUpdate([]);
    return () => {};
  }

  const load = async () => {
    try {
      const tags = await fetchTags(categoryId);
      onUpdate(tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  load();

  const channel = supabase
    .channel(`tags-${categoryId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tags',
        filter: `category_id=eq.${categoryId}`,
      },
      load
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function addTag(categoryId, label) {
  const { data, error } = await supabase
    .from('tags')
    .insert({ category_id: categoryId, label: label.trim() })
    .select('id, label, category_id')
    .single();

  if (error) throw error;
  return mapTag(data);
}
