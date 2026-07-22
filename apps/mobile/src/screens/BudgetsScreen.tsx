import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, TextInput, Alert, Modal } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function BudgetsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newPeriod, setNewPeriod] = useState('monthly');

  const load = useCallback(async () => {
    try {
      const [b, c, s] = await Promise.all([
        api.budgets.list(),
        api.categories.list(),
        api.budgets.summary(),
      ]);
      setBudgets(b.budgets);
      setCategories(c.categories.filter((cat: any) => !cat.isSystem || cat.userId));
      setSummary(s.summaries);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const createBudget = async () => {
    if (!newCategoryId || !newLimit) { Alert.alert('Ошибка', 'Заполните все поля'); return; }
    try {
      await api.budgets.create({ categoryId: newCategoryId, limitAmount: Number(newLimit), period: newPeriod });
      setShowModal(false);
      setNewCategoryId('');
      setNewLimit('');
      await load();
    } catch (e: any) {
      if (e.message?.includes('Free plan')) {
        navigation.navigate('Paywall');
      } else {
        Alert.alert('Ошибка', e.message);
      }
    }
  };

  const deleteBudget = (id: string) => {
    Alert.alert('Удалить бюджет?', '', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await api.budgets.delete(id);
        await load();
      }},
    ]);
  };

  const getProgress = (budgetId: string) => {
    const s = summary.find((s) => s.id === budgetId);
    return s || { spent: 0, percentage: 0 };
  };

  const isPro = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';

  return (
    <View className="flex-1 bg-gray-50 pt-12">
      <View className="flex-row justify-between items-center px-6 mb-4">
        <Text className="text-xl font-bold">Бюджеты</Text>
        <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-lg" onPress={() => setShowModal(true)}>
          <Text className="text-white font-semibold">+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const prog = getProgress(item.id);
          return (
            <TouchableOpacity className="bg-white mx-6 mb-3 p-4 rounded-xl" onLongPress={() => deleteBudget(item.id)}>
              <View className="flex-row justify-between mb-2">
                <Text className="font-semibold">{item.category?.name || 'Без категории'}</Text>
                <Text className="text-gray-500">€{item.limitAmount}/{item.period}</Text>
              </View>
              <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <View className={`h-full rounded-full ${prog.percentage >= 100 ? 'bg-red-500' : prog.percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(prog.percentage, 100)}%` }} />
              </View>
              <Text className="text-xs text-gray-400 mt-1">Потрачено €{prog.spent.toFixed(2)} ({prog.percentage}%)</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text className="text-center text-gray-400 mt-8">Нет бюджетов. Нажми + чтобы создать</Text>}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-2xl p-6">
            <Text className="text-lg font-bold mb-4">Новый бюджет</Text>
            <Text className="text-sm text-gray-500 mb-2">Категория</Text>
            <View className="flex-row flex-wrap mb-4">
              {categories.map((cat: any) => (
                <TouchableOpacity key={cat.id} className={`mr-2 mb-2 px-4 py-2 rounded-full ${newCategoryId === cat.id ? 'bg-blue-600' : 'bg-gray-200'}`}
                  onPress={() => setNewCategoryId(cat.id)}>
                  <Text className={newCategoryId === cat.id ? 'text-white' : 'text-gray-700'}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-4" placeholder="Лимит (€)" keyboardType="decimal-pad" value={newLimit} onChangeText={setNewLimit} />
            <View className="flex-row mb-6">
              {['monthly', 'weekly'].map((p) => (
                <TouchableOpacity key={p} className={`mr-2 px-4 py-2 rounded-full ${newPeriod === p ? 'bg-blue-600' : 'bg-gray-200'}`}
                  onPress={() => setNewPeriod(p)}>
                  <Text className={newPeriod === p ? 'text-white' : 'text-gray-700'}>{p === 'monthly' ? 'В месяц' : 'В неделю'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity className="bg-blue-600 py-4 rounded-xl mb-3" onPress={createBudget}>
              <Text className="text-white text-center font-semibold">Создать</Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-3" onPress={() => setShowModal(false)}>
              <Text className="text-gray-500 text-center">Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
