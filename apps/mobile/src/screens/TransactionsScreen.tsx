import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { api } from '../api/client';

export function TransactionsScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([
        api.transactions.list({ limit: 100 }),
        api.categories.list(),
      ]);
      setTransactions(t.transactions);
      setCategories(c.categories);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const recategorize = (txId: string) => {
    const nonSystem = categories.filter((c) => !c.isSystem || c.userId !== null);
    Alert.alert('Сменить категорию', undefined,
      nonSystem.map((cat: any) => ({
        text: cat.name,
        onPress: async () => {
          try {
            await api.transactions.recategorize(txId, cat.id);
            await load();
          } catch {}
        },
      })).concat({ text: 'Отмена', style: 'cancel' })
    );
  };

  return (
    <View className="flex-1 bg-gray-50 pt-12">
      <Text className="text-xl font-bold px-6 mb-4">Транзакции</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity className="bg-white px-6 py-3 border-b border-gray-100" onPress={() => recategorize(item.id)}>
            <View className="flex-row justify-between">
              <View className="flex-1">
                <Text className="font-medium">{item.merchantName || 'Без названия'}</Text>
                <Text className="text-xs text-gray-400">{item.category?.name || 'Без категории'} • {new Date(item.date).toLocaleDateString()}</Text>
              </View>
              <Text className={`font-semibold ${Number(item.amount) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                €{Math.abs(Number(item.amount)).toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text className="text-center text-gray-400 mt-8">Нет транзакций</Text>}
      />
    </View>
  );
}
