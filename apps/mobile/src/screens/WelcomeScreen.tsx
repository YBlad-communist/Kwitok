import { View, Text, TouchableOpacity, Image } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export function WelcomeScreen({ navigation }: { navigation: any }) {
  return (
    <View className="flex-1 justify-center items-center bg-white px-6">
      <Text className="text-4xl font-bold text-blue-600 mb-2">Квиток</Text>
      <Text className="text-lg text-gray-500 text-center mb-12">
        Отслеживай расходы, контролируй бюджет
      </Text>
      <TouchableOpacity
        className="bg-blue-600 py-4 px-8 rounded-xl w-full mb-4"
        onPress={() => navigation.navigate('Register')}
      >
        <Text className="text-white text-center font-semibold text-lg">Создать аккаунт</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="border border-blue-600 py-4 px-8 rounded-xl w-full"
        onPress={() => navigation.navigate('Login')}
      >
        <Text className="text-blue-600 text-center font-semibold text-lg">Войти</Text>
      </TouchableOpacity>
    </View>
  );
}
