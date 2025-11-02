import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { RootStackParamList } from "../App";
import { useEventStore } from "../store/useEventStore";

type Props = NativeStackScreenProps<RootStackParamList, "Add">;

export function AddEventScreen({ navigation }: Props) {
  const addEvent = useEventStore((s) => s.addEvent);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<
    "Birthday" | "Anniversary" | "Holiday" | "Trip" | "Other"
  >("Other");

  return (
    <View className="flex-1 bg-white p-4">
      <View className="mb-3">
        <Text className="text-sm text-gray-700">Event name</Text>
        <TextInput className="border rounded px-2 py-2" value={name} onChangeText={setName} />
      </View>
      <View className="mb-3">
        <Text className="text-sm text-gray-700">Date (YYYY-MM-DD)</Text>
        <TextInput className="border rounded px-2 py-2" value={date} onChangeText={setDate} />
      </View>
      <View className="mb-3">
        <Text className="text-sm text-gray-700">Category</Text>
        <View className="flex-row flex-wrap gap-2 mt-2">
          {(["Birthday", "Anniversary", "Holiday", "Trip", "Other"] as const).map(
            (c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                className={
                  c === category
                    ? "bg-blue-600 px-3 py-2 rounded"
                    : "bg-gray-200 px-3 py-2 rounded"
                }
              >
                <Text className={c === category ? "text-white" : "text-gray-900"}>{c}</Text>
              </Pressable>
            )
          )}
        </View>
      </View>
      <View className="mb-3">
        <Text className="text-sm text-gray-700">Description (optional)</Text>
        <TextInput
          className="border rounded px-2 py-2"
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </View>

      <View className="flex-row gap-3 mt-4">
        <Pressable
          className="bg-blue-600 rounded px-4 py-2"
          onPress={() => {
            if (!name || !date) return;
            const isoDate = new Date(date).toISOString();
            addEvent({ name, date: isoDate, description, category });
            navigation.goBack();
          }}
        >
          <Text className="text-white font-semibold">Save</Text>
        </Pressable>
        <Pressable className="border rounded px-4 py-2" onPress={() => navigation.goBack()}>
          <Text>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

