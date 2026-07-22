import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { api } from '../api/client';

export function BankingScreen({ navigation }: { navigation: any }) {
  const [connections, setConnections] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await api.banking.connections();
      setConnections(c.connections);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const connectBank = () => {
    Alert.alert('Выберите страну', '', [
      { text: 'Латвия', onPress: async () => {
        try {
          const inst = await api.banking.institutions('LV');
          if (inst.institutions.length === 0) { Alert.alert('Нет доступных банков'); return; }
          const bank = inst.institutions[0];
          const result = await api.banking.connect(bank.id, bank.name);
          Alert.alert('Перейдите по ссылке для авторизации', result.link);
        } catch (e: any) {
          Alert.alert('Ошибка', e.message);
        }
      }},
      { text: 'Эстония', onPress: async () => {
        try {
          const inst = await api.banking.institutions('EE');
          if (inst.institutions.length === 0) { Alert.alert('Нет доступных банков'); return; }
          const bank = inst.institutions[0];
          const result = await api.banking.connect(bank.id, bank.name);
          Alert.alert('Перейдите по ссылке для авторизации', result.link);
        } catch (e: any) {
          Alert.alert('Ошибка', e.message);
        }
      }},
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const syncAccount = async (accountId: string) => {
    try {
      const result = await api.banking.sync(accountId);
      Alert.alert('Синхронизация завершена', `Импортировано ${result.imported} транзакций`);
      await load();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 pt-12 px-6">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold">Подключённые банки</Text>
        <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-lg" onPress={connectBank}>
          <Text className="text-white font-semibold">+ Банк</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={connections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View className="bg-white rounded-xl p-4 mb-3">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="font-semibold">{item.institutionName}</Text>
                <Text className={`text-sm ${item.status === 'linked' ? 'text-green-500' : 'text-yellow-500'}`}>{item.status}</Text>
              </View>
              <TouchableOpacity className="bg-gray-100 px-3 py-1 rounded" onPress={async () => {
                try {
                  await api.banking.deleteConnection(item.id);
                  await load();
                } catch {}
              }}>
                <Text className="text-red-500">Отключить</Text>
              </TouchableOpacity>
            </View>
            {item.accounts?.map((acc: any) => (
              <View key={acc.id} className="mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row justify-between">
                  <Text className="text-sm">{acc.name}</Text>
                  <Text className="text-sm font-semibold">€{Number(acc.balance || 0).toFixed(2)}</Text>
                </View>
                <TouchableOpacity className="mt-2" onPress={() => syncAccount(acc.id)}>
                  <Text className="text-blue-600 text-sm">Синхронизировать</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center mt-12">
            <Text className="text-gray-400 mb-4">Нет подключённых банков</Text>
            <TouchableOpacity className="bg-blue-600 py-3 px-6 rounded-xl" onPress={connectBank}>
              <Text className="text-white font-semibold">Подключить банк</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
