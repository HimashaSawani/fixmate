import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Vehicle, FuelEntry, ServiceRecord, ExpenseRecord, MaintenancePlan } from '../types';
import { queryVehicleAssistant, AssistantAnswer } from '../services/ocrAssistant';
import { theme } from '../theme';

interface AIAssistantModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  fuelEntries: FuelEntry[];
  serviceRecords: ServiceRecord[];
  expenses: ExpenseRecord[];
  plans: MaintenancePlan[];
  currency: string;
  onClose: () => void;
  onTriggerAction: (action: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestedAction?: AssistantAnswer['suggestedAction'];
  timestamp: string;
}

const quickChips = [
  'When is my next oil change?',
  'What is my fuel efficiency?',
  'How much did I spend on fuel?',
  'List upcoming due services',
  'Total ownership cost breakdown',
];

const renderFormattedText = (text: string, baseStyle: any, isUser: boolean) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={baseStyle}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const content = part.slice(2, -2);
          return (
            <Text key={index} style={{ fontWeight: '800', color: isUser ? '#FFFFFF' : '#60A5FA' }}>
              {content}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  visible,
  vehicle,
  fuelEntries,
  serviceRecords,
  expenses,
  plans,
  currency,
  onClose,
  onTriggerAction,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  React.useEffect(() => {
    if (visible && vehicle && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Hello! I'm your FixMate Assistant for **${vehicle.name}**.\nAsk me anything about your service history, fuel economy, or expenses!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [visible, vehicle]);

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || inputText).trim();
    if (!q || !vehicle) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const response = queryVehicleAssistant(
        q,
        vehicle,
        fuelEntries,
        serviceRecords,
        expenses,
        plans,
        currency
      );

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        suggestedAction: response.suggestedAction,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 400);
  };

  if (!vehicle) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.botIconBadge}>
              <MaterialCommunityIcons name="robot" size={20} color="#A78BFA" />
            </View>
            <View>
              <Text style={styles.title}>FixMate AI Copilot</Text>
              <Text style={styles.subtitle}>Grounded on {vehicle.name} Database</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Chat History */}
        <ScrollView style={styles.chatScroll} contentContainerStyle={{ padding: 16 }}>
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.messageBubble,
                m.sender === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {renderFormattedText(
                m.text,
                [styles.messageText, m.sender === 'user' ? styles.userText : styles.aiText],
                m.sender === 'user'
              )}

              {m.suggestedAction && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    onClose();
                    onTriggerAction(m.suggestedAction!.actionType);
                  }}
                >
                  <Ionicons name="arrow-forward-circle" size={16} color={theme.colors.primary} />
                  <Text style={styles.actionBtnText}>{m.suggestedAction.label}</Text>
                </TouchableOpacity>
              )}

              <Text
                style={[
                  styles.timestamp,
                  m.sender === 'user' ? { textAlign: 'right' } : { textAlign: 'left' },
                ]}
              >
                {m.timestamp}
              </Text>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageBubble, styles.aiBubble, { width: 100 }]}>
              <Text style={styles.typingText}>Analyzing...</Text>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={styles.chipsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {quickChips.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => handleSend(chip)}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about oil, mileage, fuel spending..."
            placeholderTextColor={theme.colors.textMuted}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color="#0B0F19" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  closeBtn: {
    padding: 6,
  },
  chatScroll: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: theme.colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  userText: {
    color: '#0B0F19',
    fontWeight: '600',
  },
  aiText: {
    color: theme.colors.textPrimary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionBtnText: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  timestamp: {
    color: theme.colors.textMuted,
    fontSize: 9,
    marginTop: 4,
  },
  typingText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  chipsSection: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  chipsScroll: {
    paddingHorizontal: 16,
  },
  chip: {
    backgroundColor: theme.colors.surfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
