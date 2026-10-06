import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Vehicle, FuelEntry, ServiceRecord, ExpenseRecord, MaintenancePlan } from '../types';
import { queryVehicleAssistant, AssistantAnswer } from '../services/ocrAssistant';
import { queryAssistantApi, checkOcrBackendHealth, AIDraftRecord } from '../services/ocrClient';
import { processFuelEntries, calculateUnifiedExpenses, evaluateMaintenancePlans } from '../services/calculations';
import { AIDraftReviewModal } from './AIDraftReviewModal';
import { useTheme } from '../theme';

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
  onSaveFuel: (data: Omit<FuelEntry, 'id' | 'createdAt'>, idempotencyKey?: string) => Promise<boolean>;
  onSaveService: (data: Omit<ServiceRecord, 'id' | 'createdAt'>, idempotencyKey?: string) => Promise<boolean>;
  onSaveExpense: (data: Omit<ExpenseRecord, 'id' | 'createdAt'>, idempotencyKey?: string) => Promise<boolean>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggestedAction?: AssistantAnswer['suggestedAction'];
  timestamp: string;
  isOffline?: boolean;
  draftRecord?: AIDraftRecord;
}

const quickChips = [
  'I did an oil change today, mileage 45,000, cost 18,000',
  'When is my next oil change?',
  'What is my fuel efficiency?',
  'How much did I spend this month?',
  'List upcoming due services',
];

const renderFormattedText = (text: string, baseStyle: any, isUser: boolean, isDark: boolean) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={baseStyle}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const content = part.slice(2, -2);
          return (
            <Text
              key={index}
              style={{
                fontWeight: '800',
                color: isUser ? '#FFFFFF' : isDark ? '#93C5FD' : '#2563EB',
              }}
            >
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
  onSaveFuel,
  onSaveService,
  onSaveExpense,
}) => {
  const { theme, isDark } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [backendEngine, setBackendEngine] = useState<string>('checking...');
  
  // Draft Action State
  const [activeDraft, setActiveDraft] = useState<AIDraftRecord | null>(null);
  const [showDraftReview, setShowDraftReview] = useState<boolean>(false);
  const savedDraftIdsRef = useRef<Set<string>>(new Set());

  // Health check on modal open
  useEffect(() => {
    if (visible) {
      checkOcrBackendHealth().then((h) => {
        setBackendOnline(h.isOnline);
        setBackendEngine(h.engine || (h.isOnline ? 'Active' : 'Offline'));
      });
    }
  }, [visible]);

  // Initial greeting
  useEffect(() => {
    if (visible && vehicle && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Hello! I'm your FixMate Assistant for **${vehicle.name}**.\nAsk me anything about your service history, fuel economy, or tell me to log an expense (e.g. *"I did an oil change today, mileage 45,000, cost 18,000"*).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [visible, vehicle, messages.length]);

  const handleClearChat = () => {
    if (!vehicle) return;
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: `Conversation cleared. How can I help with **${vehicle.name}**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSend = async (textToSend?: string) => {
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

    try {
      // 1. Prepare deterministic local tools summary
      const fstats = processFuelEntries(fuelEntries).stats;
      const exps = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);
      const evaluated = evaluateMaintenancePlans(plans, vehicle.currentOdometer);

      const context = {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        currentOdometer: vehicle.currentOdometer,
        currency,
        distanceUnit: 'km',
        activeFilterPeriod: 'all_time',
        fuelStats: fstats,
        expenseSummary: exps,
        maintenanceStatus: evaluated,
        serviceHistory: serviceRecords.slice(0, 10),
      };

      // 2. Query FastAPI Assistant Bridge with timeout
      const result = await queryAssistantApi(q, context);
      let finalText = result.answer;
      let finalAction = result.suggestedAction;
      let isOffline = result.isOffline;
      let draftRecord: AIDraftRecord | undefined = result.draftRecord || undefined;

      // 3. Graceful offline rule-based fallback if backend offline or answer empty
      if (!finalText) {
        const fallback = queryVehicleAssistant(
          q,
          vehicle,
          fuelEntries,
          serviceRecords,
          expenses,
          plans,
          currency
        );
        finalText = fallback.answer;
        finalAction = fallback.suggestedAction;
        isOffline = true;
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: finalText,
        suggestedAction: finalAction,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOffline,
        draftRecord,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If a draft was produced and ready, optionally prompt user to review
      if (draftRecord) {
        setActiveDraft(draftRecord);
      }
    } catch (err: any) {
      console.warn('Assistant error:', err);
      const fallback = queryVehicleAssistant(
        q,
        vehicle,
        fuelEntries,
        serviceRecords,
        expenses,
        plans,
        currency
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: fallback.answer,
          suggestedAction: fallback.suggestedAction,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isOffline: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmDraftSave = async (draft: AIDraftRecord) => {
    if (!vehicle) return;

    let saved = false;
    if (draft.recordType === 'service') {
      saved = await onSaveService(
        {
          vehicleId: vehicle.id,
          date: draft.date,
          odometer: draft.odometer || vehicle.currentOdometer,
          serviceType: draft.serviceType || 'oil_change',
          title: draft.title || 'Vehicle Maintenance Service',
          garageName: draft.merchant || 'Auto Care Center',
          labourCost: 0,
          partsCost: draft.amount || 0,
          totalCost: draft.amount || 0,
          partsList: '',
          notes: draft.notes || 'Created via FixMate AI Assistant',
        },
        draft.draftId
      );
    } else if (draft.recordType === 'fuel') {
      saved = await onSaveFuel(
        {
          vehicleId: vehicle.id,
          date: draft.date,
          odometer: draft.odometer || vehicle.currentOdometer,
          litres: draft.litres || 0,
          pricePerLitre: draft.pricePerLitre || 0,
          totalCost: draft.amount || 0,
          fuelStation: draft.merchant || 'Fuel Station',
          isFullTank: true,
          notes: draft.notes || 'Created via FixMate AI Assistant',
        },
        draft.draftId
      );
    } else {
      saved = await onSaveExpense(
        {
          vehicleId: vehicle.id,
          date: draft.date,
          category: (draft.category as any) || 'other',
          title: draft.title || 'General Expense',
          amount: draft.amount || 0,
          vendor: draft.merchant || 'Vendor',
          notes: draft.notes || 'Created via FixMate AI Assistant',
        },
        draft.draftId
      );
    }

    if (!saved) {
      Alert.alert('Draft Already Saved', 'This specific draft has already been confirmed and written to SQLite.');
      return;
    }

    if (draft.draftId) {
      savedDraftIdsRef.current.add(draft.draftId);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `ai_saved_${Date.now()}`,
        sender: 'assistant',
        text: `✅ **Record Saved Successfully!**\n**${draft.title}** (${currency} ${(draft.amount || 0).toLocaleString()} at ${(draft.odometer || vehicle.currentOdometer).toLocaleString()} km) has been written to SQLite. Maintenance reminders and dashboard totals have been refreshed.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!vehicle) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.botIconBadge, { backgroundColor: theme.colors.primaryMuted }]}>
              <MaterialCommunityIcons name="robot" size={20} color={theme.colors.primary} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  FixMate Copilot
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: backendOnline
                        ? 'rgba(16,185,129,0.15)'
                        : isDark
                        ? theme.colors.surfaceHighlight
                        : '#F1F5F9',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: backendOnline ? '#10B981' : theme.colors.textMuted },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: backendOnline ? '#10B981' : theme.colors.textMuted },
                    ]}
                  >
                    {backendOnline ? 'Cloud AI' : 'On-Device'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {vehicle.name} • Read-Only SQLite Bridge
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Transparency Banner */}
        <View
          style={[
            styles.privacyBanner,
            {
              backgroundColor: isDark ? 'rgba(37,99,235,0.1)' : '#EFF6FF',
              borderBottomColor: isDark ? 'rgba(37,99,235,0.2)' : '#DBEAFE',
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={13} color={theme.colors.primary} />
          <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
            Selected vehicle summaries are sent to the backend and AI provider. Raw SQLite files never leave your device.
          </Text>
        </View>

        {/* Chat History */}
        <ScrollView style={styles.chatScroll} contentContainerStyle={{ padding: 16 }}>
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.messageBubble,
                m.sender === 'user'
                  ? [styles.userBubble, { backgroundColor: theme.colors.primary }]
                  : [
                      styles.aiBubble,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                      },
                    ],
              ]}
            >
              {renderFormattedText(
                m.text,
                [
                  styles.messageText,
                  m.sender === 'user'
                    ? { color: '#0B0F19', fontWeight: '600' }
                    : { color: theme.colors.textPrimary },
                ],
                m.sender === 'user',
                isDark
              )}

              {/* Draft Review Trigger Button */}
              {m.draftRecord && (
                <TouchableOpacity
                  style={[
                    styles.draftCardBtn,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={() => {
                    setActiveDraft(m.draftRecord!);
                    setShowDraftReview(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={15} color="#0B0F19" />
                  <Text style={styles.draftCardBtnText}>
                    {m.draftRecord.isReadyForConfirmation
                      ? 'Review & Confirm Draft 📝'
                      : 'Edit Incomplete Draft ✏️'}
                  </Text>
                </TouchableOpacity>
              )}

              {m.suggestedAction && !m.draftRecord && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: theme.colors.primaryMuted,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => {
                    onClose();
                    onTriggerAction(m.suggestedAction!.actionType);
                  }}
                >
                  <Ionicons name="arrow-forward-circle" size={16} color={theme.colors.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>
                    {m.suggestedAction.label}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.bubbleFooter}>
                {m.sender === 'assistant' && (
                  <Text style={[styles.modeTag, { color: theme.colors.textMuted }]}>
                    {m.isOffline ? '⚡ On-Device' : '✨ Cloud AI'}
                  </Text>
                )}
                <Text
                  style={[
                    styles.timestamp,
                    { color: m.sender === 'user' ? 'rgba(0,0,0,0.6)' : theme.colors.textMuted },
                  ]}
                >
                  {m.timestamp}
                </Text>
              </View>
            </View>
          ))}

          {isTyping && (
            <View
              style={[
                styles.messageBubble,
                styles.aiBubble,
                {
                  width: 120,
                  backgroundColor: theme.colors.surface,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
            >
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>
                Analyzing...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View
          style={[
            styles.chipsSection,
            {
              backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
              borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {quickChips.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F1F5F9',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                  },
                ]}
                onPress={() => handleSend(chip)}
              >
                <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
              borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F8FAFC',
                color: theme.colors.textPrimary,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Log service or ask about expenses..."
            placeholderTextColor={theme.colors.textMuted}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: theme.colors.primary },
              !inputText.trim() && { opacity: 0.5 },
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons name="send" size={18} color="#0B0F19" />
          </TouchableOpacity>
        </View>

        {/* Draft Review Confirmation Modal */}
        <AIDraftReviewModal
          visible={showDraftReview}
          draft={activeDraft}
          vehicle={vehicle}
          currency={currency}
          onClose={() => setShowDraftReview(false)}
          onConfirmSave={handleConfirmDraftSave}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  clearBtn: {
    padding: 8,
  },
  closeBtn: {
    padding: 6,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  privacyText: {
    fontSize: 10,
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  draftCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'stretch',
  },
  draftCardBtnText: {
    color: '#0B0F19',
    fontSize: 12,
    fontWeight: '800',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  modeTag: {
    fontSize: 9,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 9,
  },
  typingText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginLeft: 6,
  },
  chipsSection: {
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  chipsScroll: {
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
