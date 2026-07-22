import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, Share, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export function SettingsScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState('');

  const handleExport = async () => {
    try {
      const url = api.settings.export();
      await Share.share({ message: url, title: 'Экспорт CSV' });
    } catch {}
  };

  const handleDeleteAccount = async () => {
    if (!password) { Alert.alert('Ошибка', 'Введите пароль'); return; }
    try {
      await api.settings.deleteAccount(password);
      Alert.alert('Аккаунт удалён');
      await logout();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 pt-12 px-6">
      <Text className="text-xl font-bold mb-6">Настройки</Text>

      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="text-gray-500 text-sm">Email</Text>
        <Text className="font-medium">{user?.email}</Text>
      </View>

      <TouchableOpacity className="bg-white rounded-xl p-4 mb-4" onPress={() => navigation.navigate('Banking')}>
        <Text className="font-medium">Подключённые банки</Text>
      </TouchableOpacity>

      <TouchableOpacity className="bg-white rounded-xl p-4 mb-4" onPress={handleExport}>
        <Text className="font-medium">Экспорт данных (CSV)</Text>
      </TouchableOpacity>

      {!showDelete ? (
        <TouchableOpacity className="bg-white rounded-xl p-4 mb-4 border border-red-200" onPress={() => setShowDelete(true)}>
          <Text className="text-red-500 font-medium">Удалить аккаунт</Text>
        </TouchableOpacity>
      ) : (
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-red-500 text-sm mb-2">Введите пароль для подтверждения</Text>
          <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-3" placeholder="Пароль" secureTextEntry value={password} onChangeText={setPassword} />
          <TouchableOpacity className="bg-red-500 py-3 rounded-xl mb-2" onPress={handleDeleteAccount}>
            <Text className="text-white text-center font-semibold">Удалить навсегда</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowDelete(false); setPassword(''); }}>
            <Text className="text-gray-500 text-center">Отмена</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity className="bg-white rounded-xl p-4 mt-4" onPress={logout}>
        <Text className="text-red-500 font-medium text-center">Выйти</Text>
      </TouchableOpacity>
    </View>
  );
}
