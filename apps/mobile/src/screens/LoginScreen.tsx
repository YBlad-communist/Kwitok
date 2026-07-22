import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function LoginScreen({ navigation }: { navigation: any }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Ошибка', 'Заполните все поля'); return; }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-2xl font-bold mb-8 text-center">Вход</Text>
      <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-4" placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-6" placeholder="Пароль" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity className="bg-blue-600 py-4 rounded-xl" onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white text-center font-semibold">Войти</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')} className="mt-4">
        <Text className="text-blue-600 text-center">Нет аккаунта? Зарегистрироваться</Text>
      </TouchableOpacity>
    </View>
  );
}
