import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useState, useMemo } from "react";
import { RootStackParamList } from "../App";
import { useEventStore } from "../store/useEventStore";
import { getCountdown } from "@moments/shared";

type Props = NativeStackScreenProps<RootStackParamList, "Details">;

export function EventDetailsScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const event = useEventStore((s) => s.events.find((e) => e.id === id));
  const addTask = useEventStore((s) => s.addTask);
  const toggleTask = useEventStore((s) => s.toggleTask);
  const removeEvent = useEventStore((s) => s.removeEvent);
  const updateEvent = useEventStore((s) => s.updateEvent);
  const updateTask = useEventStore((s) => s.updateTask);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskOwner, setTaskOwner] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftCategory, setDraftCategory] = useState<
    "Birthday" | "Anniversary" | "Holiday" | "Trip" | "Other"
  >("Other");

  const countdown = useMemo(() => (event ? getCountdown(event.date) : ""), [event]);

  if (!event) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-600">Event not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex-row items-center gap-2">
        <Text className="text-2xl font-bold">{event.name}</Text>
        <Text className="text-gray-600">({countdown})</Text>
      </View>
      <Text className="text-xs text-gray-600 mt-1">Category: {event.category}</Text>
      {event.description ? (
        <Text className="text-gray-600 mt-1">{event.description}</Text>
      ) : null}

      <View className="flex-row gap-2 mt-3">
        {!isEditing ? (
          <Pressable className="px-3 py-2 rounded border" onPress={() => {
            setIsEditing(true);
            setDraftName(event.name);
            setDraftDate(event.date.slice(0,10));
            setDraftDesc(event.description ?? "");
            setDraftCategory(event.category);
          }}>
            <Text>Modify Event</Text>
          </Pressable>
        ) : (
          <>
            <Pressable className="px-3 py-2 rounded bg-green-600" onPress={() => {
              updateEvent(event.id, {
                name: draftName,
                date: new Date(draftDate).toISOString(),
                description: draftDesc,
                category: draftCategory
              });
              setIsEditing(false);
            }}>
              <Text className="text-white">Save</Text>
            </Pressable>
            <Pressable className="px-3 py-2 rounded border" onPress={() => setIsEditing(false)}>
              <Text>Cancel</Text>
            </Pressable>
          </>
        )}
      </View>

      {isEditing && (
        <View className="mt-3 gap-2">
          <Text className="text-sm text-gray-700">Name</Text>
          <TextInput className="border rounded px-2 py-2" value={draftName} onChangeText={setDraftName} />
          <Text className="text-sm text-gray-700">Date (YYYY-MM-DD)</Text>
          <TextInput className="border rounded px-2 py-2" value={draftDate} onChangeText={setDraftDate} />
          <Text className="text-sm text-gray-700">Description</Text>
          <TextInput className="border rounded px-2 py-2" value={draftDesc} onChangeText={setDraftDesc} />
          <Text className="text-sm text-gray-700">Category</Text>
          <View className="flex-row flex-wrap gap-2 mt-1">
            {(["Birthday","Anniversary","Holiday","Trip","Other"] as const).map(c => (
              <Pressable key={c} className={c===draftCategory?"bg-blue-600 px-3 py-2 rounded":"bg-gray-200 px-3 py-2 rounded"} onPress={()=>setDraftCategory(c)}>
                <Text className={c===draftCategory?"text-white":"text-gray-900"}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View className="mt-6">
        <Text className="font-semibold mb-2">Tasks</Text>
        <View className="flex-row gap-2">
          <TextInput
            className="border rounded px-2 py-2 flex-1"
            placeholder="New task"
            value={taskTitle}
            onChangeText={setTaskTitle}
            onSubmitEditing={() => {
              if (taskTitle.trim()) {
                addTask(event.id, taskTitle.trim(), taskOwner.trim() || undefined);
                setTaskTitle("");
              }
            }}
          />
          <TextInput
            className="border rounded px-2 py-2 w-32"
            placeholder="Owner"
            value={taskOwner}
            onChangeText={setTaskOwner}
          />
          <Pressable
            className="px-3 py-2 rounded bg-blue-600"
            onPress={() => {
              if (taskTitle.trim()) {
                addTask(event.id, taskTitle.trim(), taskOwner.trim() || undefined);
                setTaskTitle("");
              }
            }}
          >
            <Text className="text-white">Add</Text>
          </Pressable>
        </View>

        <FlatList
          className="mt-3"
          data={event.tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="py-2">
              <Pressable onPress={() => toggleTask(event.id, item.id)} className="flex-row items-center gap-2">
                <Text className={item.completed ? "line-through text-gray-500" : ""}>
                  {item.title}
                </Text>
              </Pressable>
              <Text className="text-xs text-gray-600 mt-1">
                {item.owner ? `Owner: ${item.owner} · ` : ""}
                {item.completed && item.completionDate ? `Completed: ${new Date(item.completionDate).toLocaleDateString()}` : ""}
              </Text>
              <View className="flex-row gap-2 mt-1">
                <Pressable
                  className="px-2 py-1 rounded border"
                  onPress={() => {
                    const newTitle = promptEdit("Edit task title", item.title);
                    if (newTitle != null) updateTask(event.id, item.id, { title: newTitle });
                  }}
                >
                  <Text>Edit</Text>
                </Pressable>
                <Pressable
                  className="px-2 py-1 rounded border"
                  onPress={() => {
                    const newOwner = promptEdit("Edit owner", item.owner ?? "");
                    if (newOwner != null) updateTask(event.id, item.id, { owner: newOwner || undefined });
                  }}
                >
                  <Text>Assign</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text className="text-sm text-gray-600">No tasks yet.</Text>
          )}
        />
      </View>

      <View className="flex-row gap-3 mt-6">
        <Pressable className="px-3 py-2 rounded border" onPress={() => navigation.goBack()}>
          <Text>Back</Text>
        </Pressable>
        <Pressable
          className="px-3 py-2 rounded bg-red-600"
          onPress={() => {
            removeEvent(event.id);
            navigation.navigate("Home");
          }}
        >
          <Text className="text-white">Delete Event</Text>
        </Pressable>
      </View>
    </View>
  );
}

function promptEdit(label: string, initial: string): string | null {
  // Simple cross-platform fallback: use prompt-like behavior for web; on native, this won't show a dialog
  // In RN dev, this won't appear; we keep a minimal inline function for consistency
  // In production, replace with a modal input.
  // @ts-ignore
  if (typeof window !== "undefined" && window?.prompt) return window.prompt(label, initial);
  return initial;
}

