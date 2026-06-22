import { supabase } from '../supabase';

function mapTag(row) {
  return {
    id: row.id,
    label: row.label,
    categoryId: row.category_id,
  };
}

const tagChannelRegistry = new Map();

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

  let entry = tagChannelRegistry.get(categoryId);

  if (!entry) {
    const listeners = new Set();

    const notify = async () => {
      try {
        const tags = await fetchTags(categoryId);
        listeners.forEach((listener) => listener(tags));
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    };

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
        notify
      )
      .subscribe();

    entry = { channel, listeners, notify };
    tagChannelRegistry.set(categoryId, entry);
  }

  entry.listeners.add(onUpdate);
  entry.notify();

  return () => {
    const current = tagChannelRegistry.get(categoryId);
    if (!current) return;

    current.listeners.delete(onUpdate);
    if (current.listeners.size === 0) {
      supabase.removeChannel(current.channel);
      tagChannelRegistry.delete(categoryId);
    }
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
