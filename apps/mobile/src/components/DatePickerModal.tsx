import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  value,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedDate, setSelectedDate] = useState(value);

  const handleConfirm = () => {
    onConfirm(selectedDate);
  };

  if (Platform.OS === 'android') {
    return (
      <>
        {visible && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={(event, date) => {
              if (event.type === 'set' && date) {
                onConfirm(date);
              } else {
                onCancel();
              }
            }}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant={isDark ? 'dark' : 'light'}
          />
        )}
      </>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
              <Text style={[styles.headerButton, { color: theme.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Select Date
            </Text>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7}>
              <Text style={[styles.headerButton, { color: theme.primary }]}>
                Set
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={(event, date) => {
                if (date) {
                  setSelectedDate(date);
                }
              }}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              textColor={theme.text}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});