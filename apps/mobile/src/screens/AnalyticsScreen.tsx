import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function AnalyticsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const isPro = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';

  if (!isPro) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-6">
        <View className="bg-white rounded-2xl p-8 w-full items-center opacity-30">
          <Text className="text-4xl mb-4">📊</Text>
          <Text className="text-xl font-bold mb-2">Аналитика</Text>
          <Text className="text-gray-500 text-center">Графики трат по категориям и тренды по месяцам</Text>
        </View>
        <TouchableOpacity className="bg-purple-600 py-4 px-8 rounded-xl mt-6" onPress={() => navigation.navigate('Paywall')}>
          <Text className="text-white font-semibold">Открыть Pro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 pt-12 px-6">
      <Text className="text-xl font-bold mb-4">Аналитика</Text>
      <View className="bg-white rounded-xl p-6 mb-4">
        <Text className="text-gray-500 mb-4">Графики появятся здесь после подключения банка и синхронизации транзакций.</Text>
        <Text className="text-sm text-gray-400">(victory-native/react-native-svg-charts для продакшена)</Text>
      </View>
    </View>
  );
}
