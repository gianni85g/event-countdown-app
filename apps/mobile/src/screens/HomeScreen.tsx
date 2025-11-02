import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View, Text, Pressable, FlatList } from "react-native";
import { RootStackParamList } from "../App";
import { useEventStore } from "../store/useEventStore";
import { getCountdown, daysUntil } from "@moments/shared";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const events = useEventStore((s) => s.events);

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={[...events].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={() => (
          <Text className="text-gray-500 text-center mt-20">No events yet. Add one!</Text>
        )}
        renderItem={({ item }) => {
          const total = item.tasks.length || 1;
          const completed = item.tasks.filter((t) => t.completed).length;
          const pct = Math.round((completed / total) * 100);
          const urgent = daysUntil(item.date) <= 7;
          return (
            <Pressable
              className="rounded border border-gray-200 bg-white p-4 mb-3"
              onPress={() => navigation.navigate("Details", { id: item.id })}
            >
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold">{item.name}</Text>
                <Text className={urgent ? "text-red-600" : "text-gray-600"}>
                  {getCountdown(item.date)}
                </Text>
              </View>
              <Text className="text-xs text-gray-600 mt-1">Category: {item.category}</Text>
              {item.description ? (
                <Text className="text-gray-600 mt-1">{item.description}</Text>
              ) : null}
              <View className="h-2 bg-gray-200 rounded mt-3 overflow-hidden">
                <View style={{ width: `${pct}%` }} className="h-2 bg-green-500" />
              </View>
              <Text className="text-xs text-gray-600 mt-1">{pct}% tasks complete</Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        className="absolute bottom-6 right-6 bg-blue-600 rounded-full px-5 py-3"
        onPress={() => navigation.navigate("Add")}
      >
        <Text className="text-white font-semibold">Add</Text>
      </Pressable>
    </View>
  );
}

