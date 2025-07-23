import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface HeightPickerModalProps {
  visible: boolean;
  value: number; // Height in inches or cm
  units: 'imperial' | 'metric';
  onConfirm: (height: number) => void;
  onCancel: () => void;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export const HeightPickerModal: React.FC<HeightPickerModalProps> = ({
  visible,
  value,
  units,
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();
  
  const initialFeet = units === 'imperial' ? Math.floor(value / 12) : 0;
  const initialInches = units === 'imperial' ? value % 12 : 0;
  const initialCm = units === 'metric' ? value : 0;
  
  const [selectedFeet, setSelectedFeet] = useState(initialFeet);
  const [selectedInches, setSelectedInches] = useState(initialInches);
  const [selectedCm, setSelectedCm] = useState(initialCm);

  useEffect(() => {
    if (visible) {
      if (units === 'imperial') {
        setSelectedFeet(Math.floor(value / 12));
        setSelectedInches(value % 12);
      } else {
        setSelectedCm(value);
      }
    }
  }, [visible, value, units]);

  const handleConfirm = () => {
    const height = units === 'imperial' 
      ? (selectedFeet * 12) + selectedInches 
      : selectedCm;
    onConfirm(height);
  };

  const renderPicker = (
    data: number[],
    selectedValue: number,
    onValueChange: (value: number) => void,
    suffix: string
  ) => {
    return (
      <View style={styles.pickerColumn}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * 2,
          }}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
            onValueChange(data[index] || 0);
          }}
          contentOffset={{ x: 0, y: selectedValue * ITEM_HEIGHT }}
        >
          {data.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.pickerItem]}
              onPress={() => onValueChange(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  { color: theme.text },
                  selectedValue === item && styles.selectedItemText,
                  selectedValue === item && { color: theme.primary },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={[styles.suffix, { color: theme.textSecondary }]}>{suffix}</Text>
        <View style={[styles.selectionIndicator, { borderColor: theme.primary }]} />
      </View>
    );
  };

  const feetOptions = Array.from({ length: 9 }, (_, i) => i);
  const inchesOptions = Array.from({ length: 12 }, (_, i) => i);
  const cmOptions = Array.from({ length: 121 }, (_, i) => i + 120); // 120cm to 240cm

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => {}}
          style={[styles.container, { backgroundColor: theme.card }]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
              <Text style={[styles.headerButton, { color: theme.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Height
            </Text>
            <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7}>
              <Text style={[styles.headerButton, { color: theme.primary }]}>
                Set
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.pickerContainer}>
            {units === 'imperial' ? (
              <View style={styles.pickerRow}>
                {renderPicker(feetOptions, selectedFeet, setSelectedFeet, 'ft')}
                {renderPicker(inchesOptions, selectedInches, setSelectedInches, 'in')}
              </View>
            ) : (
              <View style={styles.pickerRow}>
                {renderPicker(cmOptions, selectedCm, setSelectedCm, 'cm')}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
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
    paddingTop: 20,
    paddingBottom: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    height: PICKER_HEIGHT,
  },
  pickerColumn: {
    flex: 1,
    maxWidth: 120,
    position: 'relative',
    alignItems: 'center',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 20,
    fontWeight: '400',
  },
  selectedItemText: {
    fontSize: 24,
    fontWeight: '600',
  },
  suffix: {
    position: 'absolute',
    right: 20,
    top: PICKER_HEIGHT / 2 - 10,
    fontSize: 16,
    fontWeight: '600',
  },
  selectionIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2,
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    pointerEvents: 'none',
  },
});