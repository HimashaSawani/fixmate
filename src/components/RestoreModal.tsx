import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { restoreBackupFromJsonString } from '../services/backupExport';
import { useTheme } from '../theme';

interface RestoreModalProps {
  visible: boolean;
  onClose: () => void;
  onRestoreSuccess: () => Promise<void>;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({
  visible,
  onClose,
  onRestoreSuccess,
}) => {
  const { theme, isDark } = useTheme();
  const [jsonInput, setJsonInput] = useState('');
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleValidate = (text: string) => {
    setJsonInput(text);
    setValidationError(null);
    setParsedData(null);

    if (!text.trim()) return;

    try {
      const data = JSON.parse(text);
      if (!data || !data.vehicles || !Array.isArray(data.vehicles)) {
        setValidationError('Invalid backup format: missing "vehicles" array.');
        return;
      }
      setParsedData(data);
    } catch (e: any) {
      setValidationError('Invalid JSON syntax: ' + e.message);
    }
  };

  const handleExecuteRestore = async () => {
    if (!parsedData) return;

    Alert.alert(
      'Confirm Restore',
      `Import ${parsedData.vehicles?.length || 0} vehicle(s), ${(parsedData.fuelEntries || []).length} fuel records, and ${(parsedData.serviceRecords || []).length} service records?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore Now',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await restoreBackupFromJsonString(jsonInput);
              Alert.alert('Restore Complete', `Successfully imported ${res.count} records.`);
              await onRestoreSuccess();
              onClose();
              setJsonInput('');
              setParsedData(null);
            } catch (err: any) {
              Alert.alert('Restore Failed', err.message || 'Could not parse and save data.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <Ionicons name="cloud-upload" size={20} color={theme.colors.primary} />
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                Restore Data Backup
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.instruction, { color: theme.colors.textSecondary }]}>
              Paste your exported FixMate JSON backup below to restore your garage, fuel logs, service history, and custom maintenance plans.
            </Text>

            {/* JSON Input Area */}
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F8FAFC',
                  borderColor: validationError
                    ? theme.colors.danger
                    : parsedData
                    ? theme.colors.secondary
                    : isDark
                    ? 'rgba(255,255,255,0.1)'
                    : '#CBD5E1',
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholder='Paste {"exportDate": "...", "vehicles": [...]} here...'
              placeholderTextColor={theme.colors.textMuted}
              multiline
              numberOfLines={8}
              value={jsonInput}
              onChangeText={handleValidate}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Error Message */}
            {validationError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                  {validationError}
                </Text>
              </View>
            )}

            {/* Preview Card */}
            {parsedData && (
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4',
                    borderColor: theme.colors.secondary,
                  },
                ]}
              >
                <View style={styles.previewHeader}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.secondary} />
                  <Text style={[styles.previewTitle, { color: theme.colors.secondary }]}>
                    Valid FixMate Backup Detected
                  </Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
                      {parsedData.vehicles?.length || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Vehicles
                    </Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
                      {(parsedData.fuelEntries || []).length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Fuel Logs
                    </Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
                      {(parsedData.serviceRecords || []).length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Services
                    </Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
                      {(parsedData.maintenancePlans || []).length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                      Plans
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.colors.cardBorder }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.restoreBtn,
                {
                  backgroundColor: parsedData ? theme.colors.primary : theme.colors.textMuted,
                  opacity: parsedData ? 1 : 0.6,
                },
              ]}
              onPress={handleExecuteRestore}
              disabled={!parsedData || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cloud-download" size={16} color="#FFFFFF" />
                  <Text style={styles.restoreBtnText}>Import Backup</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  instruction: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 140,
    marginBottom: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
    marginBottom: 14,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  restoreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
