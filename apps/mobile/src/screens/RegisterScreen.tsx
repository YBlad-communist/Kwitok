import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) { Alert.alert('Ошибка', 'Заполните все поля'); return; }
    if (password.length < 6) { Alert.alert('Ошибка', 'Пароль минимум 6 символов'); return; }
    setLoading(true);
    try {
      await register(email, password);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-2xl font-bold mb-8 text-center">Регистрация</Text>
      <Text className="text-gray-500 text-sm mb-4 text-center">14 дней Pro бесплатно</Text>
      <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-4" placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput className="border border-gray-300 rounded-xl px-4 py-3 mb-6" placeholder="Пароль (мин. 6 символов)" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity className="bg-blue-600 py-4 rounded-xl" onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white text-center font-semibold">Создать аккаунт</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')} className="mt-4">
        <Text className="text-blue-600 text-center">Уже есть аккаунт? Войти</Text>
      </TouchableOpacity>
    </View>
  );
}
