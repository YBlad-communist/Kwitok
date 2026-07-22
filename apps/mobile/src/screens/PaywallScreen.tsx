import { View, Text, TouchableOpacity } from 'react-native';
import { api } from '../api/client';

export function PaywallScreen({ navigation }: { navigation: any }) {
  return (
    <View className="flex-1 justify-center items-center bg-white px-6">
      <Text className="text-4xl mb-4">⭐</Text>
      <Text className="text-2xl font-bold mb-2">Квиток Pro</Text>
      <Text className="text-gray-500 text-center mb-8">Безлимитные бюджеты и банки, полная аналитика, экспорт CSV</Text>

      <View className="w-full mb-6">
        <View className="flex-row justify-between items-center bg-gray-50 rounded-xl p-4 mb-3">
          <View>
            <Text className="font-semibold">€6.99/мес</Text>
            <Text className="text-sm text-gray-400">Платформа помесячно, отмена в любой момент</Text>
          </View>
        </View>
        <View className="flex-row justify-between items-center bg-gray-50 rounded-xl p-4">
          <View>
            <Text className="font-semibold">€59.99/год</Text>
            <Text className="text-sm text-gray-400">€5/мес — экономия 28%</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity className="bg-purple-600 py-4 rounded-xl w-full mb-3">
        <Text className="text-white text-center font-semibold text-lg">Попробовать бесплатно 14 дней</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text className="text-gray-500">Может, позже</Text>
      </TouchableOpacity>
    </View>
  );
}
