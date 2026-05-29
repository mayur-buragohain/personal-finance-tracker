import { supabase } from '../supabase';

export function mapExpenseRow(row) {
  const tags = (row.expense_tags || [])
    .map((et) => et.tags)
    .filter(Boolean)
    .map((t) => ({ id: t.id, label: t.label }));

  return {
    id: row.id,
    docId: row.id,
    amount: Number(row.amount),
    categoryId: row.category_id,
    date: row.date,
    createdAt: row.created_at,
    tags,
    category: row.categories
      ? {
          id: row.categories.id,
          label: row.categories.label,
          icon: row.categories.icon,
          color: row.categories.color,
        }
      : null,
  };
}

const EXPENSE_SELECT = `
  id,
  amount,
  date,
  created_at,
  category_id,
  categories ( id, label, icon, color ),
  expense_tags ( tags ( id, label ) )
`;

export async function fetchExpenses(profileId) {
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_SELECT)
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapExpenseRow);
}

export function subscribeExpenses(profileId, onUpdate) {
  const load = async () => {
    try {
      const expenses = await fetchExpenses(profileId);
      onUpdate(expenses);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    }
  };

  load();

  const channel = supabase
    .channel(`expenses-${profileId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `profile_id=eq.${profileId}`,
      },
      load
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'expense_tags' },
      load
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function createExpense(profileId, { amount, categoryId, date, tagIds }) {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      profile_id: profileId,
      category_id: categoryId,
      amount,
      date,
    })
    .select('id')
    .single();

  if (error) throw error;

  if (tagIds.length > 0) {
    const { error: tagError } = await supabase.from('expense_tags').insert(
      tagIds.map((tagId) => ({
        expense_id: expense.id,
        tag_id: tagId,
      }))
    );
    if (tagError) throw tagError;
  }

  return expense.id;
}

export async function updateExpense(expenseId, { date, categoryId, tagIds }) {
  const { error } = await supabase
    .from('expenses')
    .update({ date, category_id: categoryId })
    .eq('id', expenseId);

  if (error) throw error;

  const { error: deleteError } = await supabase
    .from('expense_tags')
    .delete()
    .eq('expense_id', expenseId);

  if (deleteError) throw deleteError;

  if (tagIds.length > 0) {
    const { error: insertError } = await supabase.from('expense_tags').insert(
      tagIds.map((tagId) => ({
        expense_id: expenseId,
        tag_id: tagId,
      }))
    );
    if (insertError) throw insertError;
  }
}

export async function deleteExpense(expenseId) {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}
