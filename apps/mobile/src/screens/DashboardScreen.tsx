import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export function DashboardScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, t, a] = await Promise.all([
        api.budgets.summary(),
        api.transactions.list({ limit: 5 }),
        api.accounts(),
      ]);
      setSummary(s.summaries);
      setTransactions(t.transactions);
      setAccounts(a.accounts);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalSpent = summary.reduce((sum, s) => sum + s.spent, 0);
  const isPro = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';

  return (
    <ScrollView className="flex-1 bg-gray-50" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View className="bg-blue-600 px-6 pt-12 pb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-lg font-semibold">Квиток</Text>
          <Text className="text-white/80">{user?.email}</Text>
        </View>
        <Text className="text-white/70 text-sm">Общий баланс</Text>
        <Text className="text-white text-3xl font-bold">€{totalBalance.toFixed(2)}</Text>
      </View>

      <View className="px-6 -mt-4">
        <View className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <Text className="text-gray-500 text-sm mb-2">Потрачено в этом месяце</Text>
          <Text className="text-2xl font-bold">€{totalSpent.toFixed(2)}</Text>
        </View>

        {accounts.length === 0 && (
          <TouchableOpacity className="bg-white rounded-xl p-4 border border-dashed border-blue-300 mb-4" onPress={() => navigation.navigate('Banking')}>
            <Text className="text-blue-600 text-center font-semibold">+ Подключить банк</Text>
          </TouchableOpacity>
        )}

        {summary.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="font-semibold mb-3">Бюджеты</Text>
            {summary.slice(0, 5).map((s: any) => (
              <View key={s.id} className="mb-2">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-sm">{s.category?.name || 'Без категории'}</Text>
                  <Text className="text-sm text-gray-500">{s.percentage}%</Text>
                </View>
                <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <View className={`h-full rounded-full ${s.percentage >= 100 ? 'bg-red-500' : s.percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                </View>
              </View>
            ))}
          </View>
        )}

        {transactions.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="font-semibold mb-3">Последние транзакции</Text>
            {transactions.map((tx: any) => (
              <View key={tx.id} className="flex-row justify-between py-2 border-b border-gray-100">
                <View className="flex-1">
                  <Text className="text-sm font-medium">{tx.merchantName || 'Без названия'}</Text>
                  <Text className="text-xs text-gray-400">{tx.category?.name || ''}</Text>
                </View>
                <Text className={`font-semibold ${Number(tx.amount) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                  €{Number(tx.amount).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!isPro && (
          <TouchableOpacity className="bg-purple-600 rounded-xl p-4 mb-8" onPress={() => navigation.navigate('Paywall')}>
            <Text className="text-white text-center font-semibold">Купить Pro — €6.99/мес</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
